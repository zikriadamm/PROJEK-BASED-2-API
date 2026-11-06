const storage = require('./storage');
const publicApis = require('./publicApis');
const { kirimJSON, kirimError } = require('./httpHelpers');

const SUNSET_HEADERS = {
  'Sunset': 'Thu, 31 Dec 2026 23:59:59 GMT',
  'Deprecation': 'true',
  'Link': '</v2/expenses>; rel="successor-version"'
};

async function handleV1Router(req, res, pathname, method, query) {
  // Hanya melayani operasi GET untuk backward-compatibility Sub-CPMK 4
  if (pathname === '/v1/expenses' || pathname === '/v1/expenses/') {
    if (method !== 'GET') {
      return kirimError(
        res,
        405,
        `Metode ${method} tidak diizinkan pada /v1/expenses. Operasi manipulasi data telah dialihkan ke /v2/expenses.`,
        null,
        SUNSET_HEADERS
      );
    }

    const expenses = await storage.getExpenses();
    const liveRates = await publicApis.getLiveRates();

    let data = expenses.map((item) => {
      const konversi = publicApis.konversiKeIDR(item.amount, item.currency, liveRates.rates);
      return {
        id: item.id,
        title: item.title,
        category: item.category,
        amount: item.amount,
        currency: item.currency,
        date: item.date,
        notes: item.notes || '',
        pengayaanKurs: {
          nominalIDR: konversi.nominalIDR,
          formatRupiah: konversi.formatRupiah,
          kursAcuanKeIDR: konversi.keterangan
        }
      };
    });

    if (query.category) {
      data = data.filter((d) => d.category.toLowerCase() === query.category.toLowerCase());
    }
    if (query.currency) {
      data = data.filter((d) => d.currency.toUpperCase() === query.currency.toUpperCase());
    }

    return kirimJSON(
      res,
      200,
      {
        sukses: true,
        versi: 'v1 (LEGACY SUB-CPMK 4)',
        peringatanDepresiasi: 'Versi v1 akan dinonaktifkan pada 31 Desember 2026. Segera migrasi ke endpoint /v2/expenses.',
        jumlah: data.length,
        data: data
      },
      SUNSET_HEADERS
    );
  }

  // GET /v1/expenses/:id
  const matchId = pathname.match(/^\/v1\/expenses\/(\d+)$/);
  if (matchId) {
    if (method !== 'GET') {
      return kirimError(
        res,
        405,
        `Metode ${method} tidak diizinkan pada /v1/expenses/:id. Silakan gunakan /v2/expenses/:id.`,
        null,
        SUNSET_HEADERS
      );
    }

    const targetId = parseInt(matchId[1], 10);
    const expenses = await storage.getExpenses();
    const item = expenses.find((e) => e.id === targetId);

    if (!item) {
      return kirimError(res, 404, `Pengeluaran dengan ID ${targetId} tidak ditemukan pada dataset v1.`, null, SUNSET_HEADERS);
    }

    const liveRates = await publicApis.getLiveRates();
    const konversi = publicApis.konversiKeIDR(item.amount, item.currency, liveRates.rates);

    return kirimJSON(
      res,
      200,
      {
        sukses: true,
        versi: 'v1 (LEGACY SUB-CPMK 4)',
        data: {
          id: item.id,
          title: item.title,
          category: item.category,
          amount: item.amount,
          currency: item.currency,
          date: item.date,
          notes: item.notes || '',
          pengayaanKurs: {
            nominalIDR: konversi.nominalIDR,
            formatRupiah: konversi.formatRupiah,
            kursAcuanKeIDR: konversi.keterangan
          }
        }
      },
      SUNSET_HEADERS
    );
  }

  return kirimError(res, 404, `Endpoint ${pathname} tidak ditemukan pada API versi v1.`);
}

module.exports = {
  handleV1Router
};
