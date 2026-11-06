const storage = require('./storage');
const security = require('./security');
const publicApis = require('./publicApis');
const { kirimJSON, kirimError, bacaBody } = require('./httpHelpers');

// Validasi input payload expense v2
function validasiExpenseV2(body, isUpdate = false) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return 'Body request wajib berupa objek JSON.';
  }

  const { activityId, title, category, amount, currency, date, notes } = body;

  if (!isUpdate && activityId === undefined) {
    return 'Breaking change v2: Field "activityId" wajib disertakan untuk mereferensikan kegiatan riset.';
  }
  if (activityId !== undefined && (typeof activityId !== 'number' || isNaN(activityId) || activityId <= 0)) {
    return 'Field "activityId" wajib berupa angka integer positif yang valid.';
  }

  if (!isUpdate || title !== undefined) {
    if (typeof title !== 'string' || title.trim() === '') {
      return 'Field "title" wajib diisi dengan teks.';
    }
  }

  const kategoriValid = ['akomodasi', 'transportasi', 'konsumsi', 'belanja', 'hiburan', 'lainnya'];
  if (!isUpdate || category !== undefined) {
    if (typeof category !== 'string' || !kategoriValid.includes(category.toLowerCase())) {
      return `Field "category" harus salah satu dari: ${kategoriValid.join(', ')}.`;
    }
  }

  if (!isUpdate || amount !== undefined) {
    if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
      return 'Field "amount" wajib berupa angka desimal/integer lebih besar dari 0.';
    }
  }

  const mataUangDidukung = ['IDR', 'USD', 'JPY', 'EUR', 'SGD', 'MYR', 'GBP', 'AUD'];
  if (!isUpdate || currency !== undefined) {
    if (typeof currency !== 'string' || !mataUangDidukung.includes(currency.toUpperCase())) {
      return `Field "currency" harus salah satu dari mata uang riset: ${mataUangDidukung.join(', ')}.`;
    }
  }

  if (!isUpdate || date !== undefined) {
    if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return 'Field "date" wajib format YYYY-MM-DD (contoh: 2026-10-25).';
    }
  }

  if (notes !== undefined && typeof notes !== 'string') {
    return 'Field "notes" harus berupa teks.';
  }

  return null;
}

// Validasi input payload activity v2
function validasiActivityV2(body, isUpdate = false) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return 'Body request wajib berupa objek JSON.';
  }

  const { title, location, budgetLimitIDR, startDate, endDate } = body;

  if (!isUpdate || title !== undefined) {
    if (typeof title !== 'string' || title.trim() === '') {
      return 'Field "title" wajib berupa teks nama kegiatan riset.';
    }
  }

  if (!isUpdate || location !== undefined) {
    if (typeof location !== 'string' || location.trim() === '') {
      return 'Field "location" wajib diisi (misal: "Kabupaten Sigi, Sulawesi Tengah").';
    }
  }

  if (!isUpdate || budgetLimitIDR !== undefined) {
    if (typeof budgetLimitIDR !== 'number' || isNaN(budgetLimitIDR) || budgetLimitIDR <= 0) {
      return 'Field "budgetLimitIDR" wajib berupa angka plafon anggaran dalam rupiah (> 0).';
    }
  }

  if (startDate !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
    return 'Field "startDate" harus format YYYY-MM-DD.';
  }
  if (endDate !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    return 'Field "endDate" harus format YYYY-MM-DD.';
  }

  return null;
}

async function handleV2Router(req, res, pathname, method, query) {
  // 1. ENDPOINT: POST /v2/auth/login
  if (pathname === '/v2/auth/login' && method === 'POST') {
    const body = await bacaBody(req);
    if (!body || !body.username || !body.password) {
      return kirimError(res, 400, 'Username dan password wajib dikirimkan dalam body JSON.');
    }

    const users = await storage.getUsers();
    const user = users.find((u) => u.username.toLowerCase() === body.username.toLowerCase().trim());

    if (!user || !security.verifyPassword(body.password, user.passwordHash)) {
      return kirimError(res, 401, 'Kredensial login tidak valid. Periksa username dan password Anda.');
    }

    const token = security.generateToken(user, 7200); // 2 jam

    return kirimJSON(res, 200, {
      sukses: true,
      pesan: 'Autentikasi berhasil. Token sesi diterbitkan.',
      token: token,
      tokenType: 'Bearer',
      expiresIn: '2 jam (7200 detik)',
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        fullName: user.fullName,
        identifier: user.identifier,
        email: user.email
      }
    });
  }

  // 2. RESOURCE: ACTIVITIES (/v2/activities & /v2/activities/:id)
  if (pathname === '/v2/activities' || pathname === '/v2/activities/') {
    // --- GET /v2/activities ---
    if (method === 'GET') {
      const activities = await storage.getActivities();
      const expenses = await storage.getExpenses();
      const liveRates = await publicApis.getLiveRates();

      const enriched = await Promise.all(
        activities.map(async (act) => {
          // Cari seluruh pengeluaran untuk kegiatan ini
          const actExpenses = expenses.filter((e) => e.activityId === act.id);
          let totalSpentIDR = 0;
          actExpenses.forEach((item) => {
            const conv = publicApis.konversiKeIDR(item.amount, item.currency, liveRates.rates);
            totalSpentIDR += conv.nominalIDR;
          });

          const remainingBudgetIDR = act.budgetLimitIDR - totalSpentIDR;
          const usagePercent = Number(((totalSpentIDR / act.budgetLimitIDR) * 100).toFixed(2));
          let budgetRisk = 'AMAN';
          if (usagePercent > 100) budgetRisk = 'OVER_BUDGET';
          else if (usagePercent >= 80) budgetRisk = 'WASPADA';

          // Ambil cuaca live posko kegiatan
          const weather = await publicApis.getWeatherForecast(act.latitude || -0.836, act.longitude || 119.893);

          return {
            ...act,
            financialSummary: {
              budgetLimitIDR: act.budgetLimitIDR,
              formatPlafon: 'Rp ' + act.budgetLimitIDR.toLocaleString('id-ID'),
              totalSpentIDR: totalSpentIDR,
              formatRealisasi: 'Rp ' + totalSpentIDR.toLocaleString('id-ID'),
              remainingBudgetIDR: remainingBudgetIDR,
              formatSisaAnggaran: 'Rp ' + remainingBudgetIDR.toLocaleString('id-ID'),
              usagePercentage: `${usagePercent}%`,
              statusRisiko: budgetRisk,
              jumlahPengeluaran: actExpenses.length
            },
            currentWeather: weather
          };
        })
      );

      return kirimJSON(res, 200, {
        sukses: true,
        jumlah: enriched.length,
        data: enriched
      });
    }

    // --- POST /v2/activities (Role Admin Only) ---
    if (method === 'POST') {
      const tokenStr = security.extractBearerToken(req);
      const tokenResult = security.verifyToken(tokenStr);
      if (!tokenResult.valid) {
        return kirimError(res, 401, tokenResult.error);
      }
      if (tokenResult.user.role !== 'admin') {
        return kirimError(res, 403, 'Akses ditolak: Hanya role "admin" (Dosen/Keuangan) yang berwenang menambah kegiatan riset baru.');
      }

      const body = await bacaBody(req);
      const err = validasiActivityV2(body, false);
      if (err) return kirimError(res, 400, err);

      const activities = await storage.getActivities();
      const newId = activities.length > 0 ? Math.max(...activities.map((a) => a.id)) + 1 : 1;

      const newActivity = {
        id: newId,
        title: body.title.trim(),
        location: body.location.trim(),
        latitude: body.latitude || -0.836,
        longitude: body.longitude || 119.893,
        unit: body.unit ? body.unit.trim() : 'Fakultas Teknik Untad',
        leadResearcher: body.leadResearcher ? body.leadResearcher.trim() : tokenResult.user.fullName,
        budgetLimitIDR: Number(body.budgetLimitIDR),
        startDate: body.startDate || new Date().toISOString().split('T')[0],
        endDate: body.endDate || new Date().toISOString().split('T')[0],
        status: body.status || 'ACTIVE',
        description: body.description ? body.description.trim() : ''
      };

      activities.push(newActivity);
      await storage.saveActivities(activities);

      return kirimJSON(res, 201, {
        sukses: true,
        pesan: 'Kegiatan riset lapangan baru berhasil ditambahkan.',
        data: newActivity
      });
    }

    return kirimError(res, 405, `Metode ${method} tidak diizinkan pada /v2/activities.`);
  }

  // GET, PUT, DELETE /v2/activities/:id
  const matchActId = pathname.match(/^\/v2\/activities\/(\d+)$/);
  if (matchActId) {
    const actId = parseInt(matchActId[1], 10);
    const activities = await storage.getActivities();
    const actIndex = activities.findIndex((a) => a.id === actId);

    if (actIndex === -1) {
      return kirimError(res, 404, `Kegiatan riset dengan ID ${actId} tidak ditemukan.`);
    }

    const activity = activities[actIndex];

    // --- GET /v2/activities/:id (Dengan Relasi Nested Expenses) ---
    if (method === 'GET') {
      const expenses = await storage.getExpenses();
      const actExpenses = expenses.filter((e) => e.activityId === actId);
      const liveRates = await publicApis.getLiveRates();

      let totalSpentIDR = 0;
      const formattedExpenses = actExpenses.map((item) => {
        const conv = publicApis.konversiKeIDR(item.amount, item.currency, liveRates.rates);
        totalSpentIDR += conv.nominalIDR;
        return {
          id: item.id,
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
      });

      const weather = await publicApis.getWeatherForecast(activity.latitude || -0.836, activity.longitude || 119.893);
      const remainingBudgetIDR = activity.budgetLimitIDR - totalSpentIDR;

      return kirimJSON(res, 200, {
        sukses: true,
        data: {
          ...activity,
          financialSummary: {
            budgetLimitIDR: activity.budgetLimitIDR,
            totalSpentIDR: totalSpentIDR,
            remainingBudgetIDR: remainingBudgetIDR,
            formatPlafon: 'Rp ' + activity.budgetLimitIDR.toLocaleString('id-ID'),
            formatRealisasi: 'Rp ' + totalSpentIDR.toLocaleString('id-ID'),
            formatSisaAnggaran: 'Rp ' + remainingBudgetIDR.toLocaleString('id-ID'),
            usagePercentage: `${((totalSpentIDR / activity.budgetLimitIDR) * 100).toFixed(2)}%`,
            statusRisiko: totalSpentIDR > activity.budgetLimitIDR ? 'OVER_BUDGET' : 'AMAN'
          },
          currentWeather: weather,
          expenses: formattedExpenses
        }
      });
    }

    // --- PUT /v2/activities/:id (Role Admin Only) ---
    if (method === 'PUT') {
      const tokenStr = security.extractBearerToken(req);
      const tokenResult = security.verifyToken(tokenStr);
      if (!tokenResult.valid) return kirimError(res, 401, tokenResult.error);
      if (tokenResult.user.role !== 'admin') {
        return kirimError(res, 403, 'Akses ditolak: Hanya role "admin" yang diizinkan memperbarui master kegiatan.');
      }

      const body = await bacaBody(req);
      const err = validasiActivityV2(body, true);
      if (err) return kirimError(res, 400, err);

      const updated = {
        ...activity,
        ...(body.title !== undefined && { title: body.title.trim() }),
        ...(body.location !== undefined && { location: body.location.trim() }),
        ...(body.latitude !== undefined && { latitude: Number(body.latitude) }),
        ...(body.longitude !== undefined && { longitude: Number(body.longitude) }),
        ...(body.unit !== undefined && { unit: body.unit.trim() }),
        ...(body.leadResearcher !== undefined && { leadResearcher: body.leadResearcher.trim() }),
        ...(body.budgetLimitIDR !== undefined && { budgetLimitIDR: Number(body.budgetLimitIDR) }),
        ...(body.startDate !== undefined && { startDate: body.startDate }),
        ...(body.endDate !== undefined && { endDate: body.endDate }),
        ...(body.status !== undefined && { status: body.status.trim() }),
        ...(body.description !== undefined && { description: body.description.trim() })
      };

      activities[actIndex] = updated;
      await storage.saveActivities(activities);

      return kirimJSON(res, 200, {
        sukses: true,
        pesan: `Kegiatan riset ID ${actId} berhasil diperbarui.`,
        data: updated
      });
    }

    // --- DELETE /v2/activities/:id (Role Admin Only) ---
    if (method === 'DELETE') {
      const tokenStr = security.extractBearerToken(req);
      const tokenResult = security.verifyToken(tokenStr);
      if (!tokenResult.valid) return kirimError(res, 401, tokenResult.error);
      if (tokenResult.user.role !== 'admin') {
        return kirimError(res, 403, 'Akses ditolak: Hanya role "admin" yang diizinkan menghapus data master kegiatan riset.');
      }

      activities.splice(actIndex, 1);
      await storage.saveActivities(activities);

      return kirimJSON(res, 200, {
        sukses: true,
        pesan: `Kegiatan riset ID ${actId} berhasil dihapus.`
      });
    }
  }

  // 3. ENDPOINT: GET /v2/expenses/summary (Pengolahan Data Public API + Analisis Anggaran Terkonsolidasi)
  if (pathname === '/v2/expenses/summary' && method === 'GET') {
    const activities = await storage.getActivities();
    const expenses = await storage.getExpenses();
    const liveRates = await publicApis.getLiveRates();
    const weatherUntad = await publicApis.getWeatherForecast(-0.836, 119.893);

    let totalPlafonSemuaKegiatan = 0;
    let totalAkumulasiPengeluaranIDR = 0;
    const breakdownKategori = {};
    const breakdownKegiatan = {};

    activities.forEach((act) => {
      totalPlafonSemuaKegiatan += act.budgetLimitIDR;
      breakdownKegiatan[act.id] = {
        title: act.title,
        location: act.location,
        budgetLimitIDR: act.budgetLimitIDR,
        totalSpentIDR: 0,
        itemCount: 0
      };
    });

    expenses.forEach((item) => {
      const conv = publicApis.konversiKeIDR(item.amount, item.currency, liveRates.rates);
      totalAkumulasiPengeluaranIDR += conv.nominalIDR;

      // Breakdown Kategori
      if (!breakdownKategori[item.category]) {
        breakdownKategori[item.category] = { totalIDR: 0, count: 0 };
      }
      breakdownKategori[item.category].totalIDR += conv.nominalIDR;
      breakdownKategori[item.category].count += 1;

      // Breakdown Kegiatan
      if (breakdownKegiatan[item.activityId]) {
        breakdownKegiatan[item.activityId].totalSpentIDR += conv.nominalIDR;
        breakdownKegiatan[item.activityId].itemCount += 1;
      }
    });

    const sisaAnggaranFakultas = totalPlafonSemuaKegiatan - totalAkumulasiPengeluaranIDR;
    const persentaseTotal = totalPlafonSemuaKegiatan > 0
      ? Number(((totalAkumulasiPengeluaranIDR / totalPlafonSemuaKegiatan) * 100).toFixed(2))
      : 0;

    let evaluasiRisiko = 'AMAN: Anggaran Riset Masih Terkendali';
    let statusLevel = 'RENDAH';
    if (persentaseTotal > 100) {
      evaluasiRisiko = 'BAHAYA: Total pengeluaran telah melebihi pagu anggaran riset (OVER BUDGET)!';
      statusLevel = 'TINGGI';
    } else if (persentaseTotal >= 80) {
      evaluasiRisiko = 'PERINGATAN: Realisasi anggaran telah menyerap lebih dari 80% kuota.';
      statusLevel = 'SEDANG';
    }

    return kirimJSON(res, 200, {
      sukses: true,
      versi: 'v2 (STANDAR INDUSTRI)',
      ringkasanKeuanganFakultas: {
        totalPlafonAnggaranIDR: totalPlafonSemuaKegiatan,
        formatTotalPlafon: 'Rp ' + totalPlafonSemuaKegiatan.toLocaleString('id-ID'),
        totalRealisasiIDR: totalAkumulasiPengeluaranIDR,
        formatTotalRealisasi: 'Rp ' + totalAkumulasiPengeluaranIDR.toLocaleString('id-ID'),
        sisaAnggaranIDR: sisaAnggaranFakultas,
        formatSisaAnggaran: 'Rp ' + sisaAnggaranFakultas.toLocaleString('id-ID'),
        persentasePemakaian: `${persentaseTotal}%`,
        statusRisiko: statusLevel,
        pesanEvaluasi: evaluasiRisiko
      },
      rincianPerKategori: breakdownKategori,
      rincianPerKegiatan: breakdownKegiatan,
      totalKegiatanAktif: activities.length,
      totalItemPengeluaran: expenses.length,
      pengayaanPublicAPI: {
        kursValas: {
          sumber: 'ExchangeRate-API (open.er-api.com)',
          status: liveRates.status,
          kursIDRperUSD: liveRates.rates['IDR'],
          terakhirDiperbarui: liveRates.terakhirDiperbarui
        },
        cuacaUntad: weatherUntad
      }
    });
  }

  // 4. RESOURCE: EXPENSES (/v2/expenses & /v2/expenses/:id)
  if (pathname === '/v2/expenses' || pathname === '/v2/expenses/') {
    // --- GET /v2/expenses (Dengan Relasi Objek Activity + Nested Cost) ---
    if (method === 'GET') {
      const expenses = await storage.getExpenses();
      const activities = await storage.getActivities();
      const liveRates = await publicApis.getLiveRates();

      const actMap = {};
      activities.forEach((a) => {
        actMap[a.id] = { id: a.id, title: a.title, location: a.location, unit: a.unit };
      });

      let enriched = expenses.map((item) => {
        const conv = publicApis.konversiKeIDR(item.amount, item.currency, liveRates.rates);
        return {
          id: item.id,
          activityId: item.activityId,
          activity: actMap[item.activityId] || { id: item.activityId, title: 'Kegiatan Tidak Terdaftar' },
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
      });

      // Filter query params
      if (query.activityId) {
        const filterActId = parseInt(query.activityId, 10);
        enriched = enriched.filter((e) => e.activityId === filterActId);
      }
      if (query.category) {
        enriched = enriched.filter((e) => e.category.toLowerCase() === query.category.toLowerCase());
      }
      if (query.currency) {
        enriched = enriched.filter((e) => e.cost.currency.toUpperCase() === query.currency.toUpperCase());
      }

      return kirimJSON(res, 200, {
        sukses: true,
        versi: 'v2',
        jumlah: enriched.length,
        data: enriched
      });
    }

    // --- POST /v2/expenses (Wajib Auth & Wajib activityId) ---
    if (method === 'POST') {
      const tokenStr = security.extractBearerToken(req);
      const tokenResult = security.verifyToken(tokenStr);
      if (!tokenResult.valid) {
        return kirimError(res, 401, tokenResult.error);
      }

      const body = await bacaBody(req);
      const err = validasiExpenseV2(body, false);
      if (err) return kirimError(res, 400, err);

      const activities = await storage.getActivities();
      const targetAct = activities.find((a) => a.id === body.activityId);
      if (!targetAct) {
        return kirimError(res, 404, `Kegiatan riset dengan activityId ${body.activityId} tidak terdaftar di sistem.`);
      }

      const expenses = await storage.getExpenses();
      const newId = expenses.length > 0 ? Math.max(...expenses.map((e) => e.id)) + 1 : 1;

      const newExpense = {
        id: newId,
        activityId: body.activityId,
        title: body.title.trim(),
        category: body.category.toLowerCase().trim(),
        amount: Number(body.amount),
        currency: body.currency.toUpperCase().trim(),
        date: body.date,
        notes: body.notes ? body.notes.trim() : '',
        submittedBy: `${tokenResult.user.fullName} (${tokenResult.user.identifier || tokenResult.user.username})`
      };

      expenses.push(newExpense);
      await storage.saveExpenses(expenses);

      const liveRates = await publicApis.getLiveRates();
      const conv = publicApis.konversiKeIDR(newExpense.amount, newExpense.currency, liveRates.rates);

      return kirimJSON(res, 201, {
        sukses: true,
        pesan: 'Catatan pengeluaran riset berhasil ditambahkan ke kegiatan.',
        data: {
          id: newExpense.id,
          activityId: newExpense.activityId,
          activity: {
            id: targetAct.id,
            title: targetAct.title,
            location: targetAct.location
          },
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
        }
      });
    }

    return kirimError(res, 405, `Metode ${method} tidak diizinkan pada /v2/expenses.`);
  }

  // GET, PUT, DELETE /v2/expenses/:id
  const matchExpId = pathname.match(/^\/v2\/expenses\/(\d+)$/);
  if (matchExpId) {
    const expId = parseInt(matchExpId[1], 10);
    const expenses = await storage.getExpenses();
    const expIndex = expenses.findIndex((e) => e.id === expId);

    if (expIndex === -1) {
      return kirimError(res, 404, `Pengeluaran riset dengan ID ${expId} tidak ditemukan.`);
    }

    const item = expenses[expIndex];
    const activities = await storage.getActivities();
    const parentAct = activities.find((a) => a.id === item.activityId) || { id: item.activityId, title: 'Umum' };
    const liveRates = await publicApis.getLiveRates();

    // --- GET /v2/expenses/:id ---
    if (method === 'GET') {
      const conv = publicApis.konversiKeIDR(item.amount, item.currency, liveRates.rates);
      return kirimJSON(res, 200, {
        sukses: true,
        data: {
          id: item.id,
          activityId: item.activityId,
          activity: parentAct,
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
        }
      });
    }

    // --- PUT /v2/expenses/:id ---
    if (method === 'PUT') {
      const tokenStr = security.extractBearerToken(req);
      const tokenResult = security.verifyToken(tokenStr);
      if (!tokenResult.valid) return kirimError(res, 401, tokenResult.error);

      const body = await bacaBody(req);
      const err = validasiExpenseV2(body, true);
      if (err) return kirimError(res, 400, err);

      if (body.activityId !== undefined) {
        const existAct = activities.find((a) => a.id === body.activityId);
        if (!existAct) {
          return kirimError(res, 404, `Kegiatan riset tujuan dengan ID ${body.activityId} tidak ditemukan.`);
        }
      }

      const updated = {
        ...item,
        ...(body.activityId !== undefined && { activityId: body.activityId }),
        ...(body.title !== undefined && { title: body.title.trim() }),
        ...(body.category !== undefined && { category: body.category.toLowerCase().trim() }),
        ...(body.amount !== undefined && { amount: Number(body.amount) }),
        ...(body.currency !== undefined && { currency: body.currency.toUpperCase().trim() }),
        ...(body.date !== undefined && { date: body.date }),
        ...(body.notes !== undefined && { notes: body.notes.trim() })
      };

      expenses[expIndex] = updated;
      await storage.saveExpenses(expenses);

      const conv = publicApis.konversiKeIDR(updated.amount, updated.currency, liveRates.rates);

      return kirimJSON(res, 200, {
        sukses: true,
        pesan: `Pengeluaran riset ID ${expId} berhasil diperbarui.`,
        data: {
          ...updated,
          cost: {
            amount: updated.amount,
            currency: updated.currency,
            nominalIDR: conv.nominalIDR,
            formatRupiah: conv.formatRupiah
          }
        }
      });
    }

    // --- DELETE /v2/expenses/:id (Role Admin Only - Status 403 jika Mahasiswa) ---
    if (method === 'DELETE') {
      const tokenStr = security.extractBearerToken(req);
      const tokenResult = security.verifyToken(tokenStr);
      if (!tokenResult.valid) return kirimError(res, 401, tokenResult.error);

      // Demonstrasi Status 403 Forbidden untuk role mahasiswa!
      if (tokenResult.user.role !== 'admin') {
        return kirimError(res, 403, 'Akses ditolak: Hanya role "admin" (Dosen/Keuangan) yang memiliki wewenang menghapus data pengeluaran riset.');
      }

      expenses.splice(expIndex, 1);
      await storage.saveExpenses(expenses);

      return kirimJSON(res, 200, {
        sukses: true,
        pesan: `Pengeluaran riset dengan ID ${expId} berhasil dihapus dari sistem.`
      });
    }
  }

  return kirimError(res, 404, `Endpoint ${pathname} tidak ditemukan pada API versi v2.`);
}

module.exports = {
  handleV2Router
};
