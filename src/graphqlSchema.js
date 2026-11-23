const { buildSchema, graphql } = require('graphql');
const storage = require('./storage');
const publicApis = require('./publicApis');
const security = require('./security');
const { validasiExpenseV2 } = require('./v2Router');

const schemaString = `
  type Cost {
    amount: Float!
    currency: String!
    nominalIDR: Float!
    formatRupiah: String!
    kursPerSatuan: String!
  }

  type Weather {
    temperature: Float
    temperatureFormatted: String
    windSpeed: Float
    windSpeedFormatted: String
    condition: String
    status: String
  }

  type Expense {
    id: ID!
    activityId: ID!
    title: String!
    category: String!
    cost: Cost!
    date: String!
    notes: String
    submittedBy: String
    activity: Activity
  }

  type FinancialSummary {
    budgetLimitIDR: Float!
    totalSpentIDR: Float!
    remainingBudgetIDR: Float!
    formatPlafon: String!
    formatRealisasi: String!
    formatSisaAnggaran: String!
    usagePercentage: String!
    statusRisiko: String!
  }

  type Activity {
    id: ID!
    title: String!
    location: String!
    unit: String!
    leadResearcher: String!
    budgetLimitIDR: Float!
    startDate: String!
    endDate: String!
    status: String!
    description: String
    financialSummary: FinancialSummary!
    currentWeather: Weather
    expenses: [Expense!]!
  }

  input CreateExpenseInput {
    activityId: Int!
    title: String!
    category: String!
    amount: Float!
    currency: String!
    date: String!
    notes: String
  }

  type Query {
    activities: [Activity!]!
    activity(id: ID!): Activity
    expenses(activityId: ID, category: String): [Expense!]!
    expense(id: ID!): Expense
  }

  type Mutation {
    createExpense(input: CreateExpenseInput!): Expense!
  }
`;

const schema = buildSchema(schemaString);

// Helper pembuat resolver activity
async function buildActivityGraphQL(act, allExpenses, liveRates) {
  const actExpenses = allExpenses.filter((e) => e.activityId === act.id);
  let totalSpent = 0;
  actExpenses.forEach((item) => {
    const conv = publicApis.konversiKeIDR(item.amount, item.currency, liveRates.rates);
    totalSpent += conv.nominalIDR;
  });

  const remaining = act.budgetLimitIDR - totalSpent;
  const usagePct = Number(((totalSpent / act.budgetLimitIDR) * 100).toFixed(2));
  const weather = await publicApis.getWeatherForecast(act.latitude || -0.836, act.longitude || 119.893);

  const formattedExpenses = actExpenses.map((e) => {
    const conv = publicApis.konversiKeIDR(e.amount, e.currency, liveRates.rates);
    return {
      id: String(e.id),
      activityId: String(e.activityId),
      title: e.title,
      category: e.category,
      cost: {
        amount: e.amount,
        currency: e.currency,
        nominalIDR: conv.nominalIDR,
        formatRupiah: conv.formatRupiah,
        kursPerSatuan: conv.keterangan
      },
      date: e.date,
      notes: e.notes || '',
      submittedBy: e.submittedBy || '-'
    };
  });

  return {
    id: String(act.id),
    title: act.title,
    location: act.location,
    unit: act.unit || 'Fakultas Teknik Untad',
    leadResearcher: act.leadResearcher || '-',
    budgetLimitIDR: act.budgetLimitIDR,
    startDate: act.startDate,
    endDate: act.endDate,
    status: act.status || 'ACTIVE',
    description: act.description || '',
    financialSummary: {
      budgetLimitIDR: act.budgetLimitIDR,
      totalSpentIDR: totalSpent,
      remainingBudgetIDR: remaining,
      formatPlafon: 'Rp ' + act.budgetLimitIDR.toLocaleString('id-ID'),
      formatRealisasi: 'Rp ' + totalSpent.toLocaleString('id-ID'),
      formatSisaAnggaran: 'Rp ' + remaining.toLocaleString('id-ID'),
      usagePercentage: `${usagePct}%`,
      statusRisiko: totalSpent > act.budgetLimitIDR ? 'OVER_BUDGET' : (usagePct >= 80 ? 'WASPADA' : 'AMAN')
    },
    currentWeather: weather,
    expenses: formattedExpenses
  };
}

const rootResolvers = {
  // Query: activities (Mengembalikan semua kegiatan dengan nested expenses)
  activities: async () => {
    const activities = await storage.getActivities();
    const expenses = await storage.getExpenses();
    const liveRates = await publicApis.getLiveRates();
    return Promise.all(activities.map((a) => buildActivityGraphQL(a, expenses, liveRates)));
  },

  // Query: activity(id: ID!) (Query berargumen spesifik)
  activity: async ({ id }) => {
    const actId = parseInt(id, 10);
    const activities = await storage.getActivities();
    const act = activities.find((a) => a.id === actId);
    if (!act) return null;
    const expenses = await storage.getExpenses();
    const liveRates = await publicApis.getLiveRates();
    return buildActivityGraphQL(act, expenses, liveRates);
  },

  // Query: expenses (Opsional dengan filter)
  expenses: async ({ activityId, category }) => {
    const expenses = await storage.getExpenses();
    const activities = await storage.getActivities();
    const liveRates = await publicApis.getLiveRates();
    const actMap = {};
    const spentByActivity = {};
    activities.forEach((a) => {
      actMap[a.id] = a;
      spentByActivity[a.id] = 0;
    });

    expenses.forEach((e) => {
      const conv = publicApis.konversiKeIDR(e.amount, e.currency, liveRates.rates);
      if (spentByActivity[e.activityId] !== undefined) {
        spentByActivity[e.activityId] += conv.nominalIDR;
      }
    });

    let filtered = expenses;
    if (activityId) {
      filtered = filtered.filter((e) => String(e.activityId) === String(activityId));
    }
    if (category) {
      filtered = filtered.filter((e) => e.category.toLowerCase() === category.toLowerCase());
    }

    return filtered.map((e) => {
      const conv = publicApis.konversiKeIDR(e.amount, e.currency, liveRates.rates);
      const parent = actMap[e.activityId];
      let parentFinancialSummary = null;
      if (parent) {
        const totalSpent = spentByActivity[parent.id] || 0;
        const remaining = parent.budgetLimitIDR - totalSpent;
        const usagePct = parent.budgetLimitIDR > 0
          ? Number(((totalSpent / parent.budgetLimitIDR) * 100).toFixed(2))
          : 0;
        parentFinancialSummary = {
          budgetLimitIDR: parent.budgetLimitIDR,
          totalSpentIDR: totalSpent,
          remainingBudgetIDR: remaining,
          formatPlafon: 'Rp ' + parent.budgetLimitIDR.toLocaleString('id-ID'),
          formatRealisasi: 'Rp ' + totalSpent.toLocaleString('id-ID'),
          formatSisaAnggaran: 'Rp ' + remaining.toLocaleString('id-ID'),
          usagePercentage: `${usagePct}%`,
          statusRisiko: totalSpent > parent.budgetLimitIDR ? 'OVER_BUDGET' : (usagePct >= 80 ? 'WASPADA' : 'AMAN')
        };
      }
      return {
        id: String(e.id),
        activityId: String(e.activityId),
        title: e.title,
        category: e.category,
        cost: {
          amount: e.amount,
          currency: e.currency,
          nominalIDR: conv.nominalIDR,
          formatRupiah: conv.formatRupiah,
          kursPerSatuan: conv.keterangan
        },
        date: e.date,
        notes: e.notes || '',
        submittedBy: e.submittedBy || '-',
        activity: parent ? {
          id: String(parent.id),
          title: parent.title,
          location: parent.location,
          unit: parent.unit || 'FT Untad',
          leadResearcher: parent.leadResearcher || '-',
          budgetLimitIDR: parent.budgetLimitIDR,
          startDate: parent.startDate,
          endDate: parent.endDate,
          status: parent.status || 'ACTIVE',
          description: parent.description || '',
          financialSummary: parentFinancialSummary,
          currentWeather: null,
          expenses: []
        } : null
      };
    });
  },

  // Query: expense(id: ID!)
  expense: async ({ id }) => {
    const expId = parseInt(id, 10);
    const expenses = await storage.getExpenses();
    const item = expenses.find((e) => e.id === expId);
    if (!item) return null;
    const liveRates = await publicApis.getLiveRates();
    const conv = publicApis.konversiKeIDR(item.amount, item.currency, liveRates.rates);
    return {
      id: String(item.id),
      activityId: String(item.activityId),
      title: item.title,
      category: item.category,
      cost: {
        amount: item.amount,
        currency: item.currency,
        nominalIDR: conv.nominalIDR,
        formatRupiah: conv.formatRupiah,
        kursPerSatuan: conv.keterangan
      },
      date: item.date,
      notes: item.notes || '',
      submittedBy: item.submittedBy || '-'
    };
  },

  // Mutation: createExpense(input: CreateExpenseInput!)
  createExpense: async ({ input }, context) => {
    // 1. Validasi Autentikasi (Sama dengan REST API)
    if (!context || !context.user) {
      throw new Error('401: Unauthorized. Operasi mutation createExpense memerlukan token autentikasi Bearer.');
    }

    // 2. Validasi Keberadaan Kegiatan Riset
    const activities = await storage.getActivities();
    const targetAct = activities.find((a) => a.id === input.activityId);
    if (!targetAct) {
      throw new Error(`404: Kegiatan riset dengan activityId ${input.activityId} tidak ditemukan.`);
    }

    // 3. Validasi Aturan Bisnis Input (disamakan dengan REST v2)
    const validationErr = validasiExpenseV2(input, false);
    if (validationErr) {
      throw new Error(`400: ${validationErr}`);
    }

    const expenses = await storage.getExpenses();
    const newId = expenses.length > 0 ? Math.max(...expenses.map((e) => e.id)) + 1 : 1;

    const newExpense = {
      id: newId,
      activityId: input.activityId,
      title: input.title.trim(),
      category: input.category.toLowerCase().trim(),
      amount: Number(input.amount),
      currency: input.currency.toUpperCase().trim(),
      date: input.date,
      notes: input.notes ? input.notes.trim() : '',
      submittedBy: `${context.user.fullName} (${context.user.identifier || context.user.username})`
    };

    expenses.push(newExpense);
    await storage.saveExpenses(expenses);

    const liveRates = await publicApis.getLiveRates();
    const conv = publicApis.konversiKeIDR(newExpense.amount, newExpense.currency, liveRates.rates);

    return {
      id: String(newExpense.id),
      activityId: String(newExpense.activityId),
      title: newExpense.title,
      category: newExpense.category,
      cost: {
        amount: newExpense.amount,
        currency: newExpense.currency,
        nominalIDR: conv.nominalIDR,
        formatRupiah: conv.formatRupiah,
        kursPerSatuan: conv.keterangan
      },
      date: newExpense.date,
      notes: newExpense.notes,
      submittedBy: newExpense.submittedBy
    };
  }
};

async function executeGraphQL(query, variables, context) {
  return graphql({
    schema: schema,
    source: query,
    rootValue: rootResolvers,
    contextValue: context,
    variableValues: variables
  });
}

module.exports = {
  schema,
  executeGraphQL
};
