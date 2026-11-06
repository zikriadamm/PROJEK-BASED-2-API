// ---------- Public API 1: ExchangeRate-API (Kurs Valas Riset Internasional) ----------
const EXCHANGE_RATE_URL = 'https://open.er-api.com/v6/latest/USD';

let cachedRates = {
  USD: 1,
  IDR: 16250,
  JPY: 108.5,
  EUR: 0.92,
  SGD: 1.34,
  MYR: 4.70,
  GBP: 0.78,
  AUD: 1.52
};
let lastFetchedRatesTime = null;

async function getLiveRates() {
  try {
    const res = await fetch(EXCHANGE_RATE_URL, { signal: AbortSignal.timeout(4000) });
    if (res.ok) {
      const data = await res.json();
      if (data && data.rates) {
        cachedRates = data.rates;
        lastFetchedRatesTime = new Date().toISOString();
        return {
          rates: cachedRates,
          sumber: 'live_public_api',
          status: 'ONLINE',
          terakhirDiperbarui: lastFetchedRatesTime
        };
      }
    }
  } catch (err) {
    console.warn('[Resilience Warning] Gagal mengambil kurs valas live, menggunakan cache cadangan:', err.message);
  }

  return {
    rates: cachedRates,
    sumber: 'cache_fallback',
    status: 'OFFLINE_CACHE',
    terakhirDiperbarui: lastFetchedRatesTime || 'default_offline_dataset'
  };
}

function konversiKeIDR(amount, currency, rates) {
  const cur = (currency || 'IDR').toUpperCase();
  if (cur === 'IDR') {
    return {
      nominalIDR: Math.round(amount),
      kursPerSatuanIDR: 1,
      formatRupiah: 'Rp ' + Math.round(amount).toLocaleString('id-ID'),
      keterangan: 'Mata uang lokal (IDR)'
    };
  }

  const rateAsal = rates[cur] || 1;
  const rateIDR = rates['IDR'] || 16250;
  const nilaiDalamUSD = amount / rateAsal;
  const nilaiDalamIDR = Math.round(nilaiDalamUSD * rateIDR);
  const kursSatuSatuanIDR = Math.round((1 / rateAsal) * rateIDR);

  return {
    nominalIDR: nilaiDalamIDR,
    kursPerSatuanIDR: kursSatuSatuanIDR,
    formatRupiah: 'Rp ' + nilaiDalamIDR.toLocaleString('id-ID'),
    keterangan: `1 ${cur} ≈ Rp ${kursSatuSatuanIDR.toLocaleString('id-ID')}`
  };
}

// ---------- Public API 2: Open-Meteo API (Cuaca & Suhu Posko Riset Sulteng) ----------
const cachedWeather = {
  defaultUntad: {
    temperature: 31.5,
    windSpeed: 10.2,
    weatherCode: 1,
    condition: 'Cerah Berawan',
    latitude: -0.836,
    longitude: 119.893,
    lokasiAcuan: 'Kampus Untad Tondo, Kota Palu, Sulawesi Tengah'
  }
};
let lastFetchedWeatherTime = null;

function terjemahkanKodeCuacaWMO(code) {
  if (code === 0) return 'Langit Cerah Bersih';
  if (code === 1 || code === 2) return 'Cerah Berawan';
  if (code === 3) return 'Berawan Tebal';
  if (code === 45 || code === 48) return 'Berkabut';
  if (code >= 51 && code <= 55) return 'Gerimis Ringan';
  if (code >= 61 && code <= 65) return 'Hujan Sedang / Lebat';
  if (code >= 80 && code <= 82) return 'Hujan Deras Disertai Angin';
  if (code >= 95) return 'Badai Petir Tropis';
  return 'Berawan';
}

async function getWeatherForecast(lat = -0.836, lon = 119.893) {
  const cacheKey = `${lat.toFixed(3)},${lon.toFixed(3)}`;
  const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`;

  try {
    const res = await fetch(apiUrl, { signal: AbortSignal.timeout(4000) });
    if (res.ok) {
      const data = await res.json();
      if (data && data.current_weather) {
        const cw = data.current_weather;
        const condition = terjemahkanKodeCuacaWMO(cw.weathercode);
        const result = {
          temperature: cw.temperature,
          temperatureFormatted: `${cw.temperature}°C`,
          windSpeed: cw.windspeed,
          windSpeedFormatted: `${cw.windspeed} km/h`,
          weatherCode: cw.weathercode,
          condition: condition,
          latitude: lat,
          longitude: lon,
          sumber: 'live_open_meteo_api',
          status: 'ONLINE',
          waktuAmbil: cw.time
        };
        cachedWeather[cacheKey] = result;
        lastFetchedWeatherTime = new Date().toISOString();
        return result;
      }
    }
  } catch (err) {
    console.warn('[Resilience Warning] Gagal memanggil Open-Meteo live, beralih ke cache cuaca cadangan:', err.message);
  }

  const fallback = cachedWeather[cacheKey] || cachedWeather.defaultUntad;
  return {
    ...fallback,
    sumber: 'cache_fallback',
    status: 'OFFLINE_CACHE',
    terakhirDiperbarui: lastFetchedWeatherTime || 'default_sulteng_weather'
  };
}

module.exports = {
  getLiveRates,
  konversiKeIDR,
  getWeatherForecast
};
