const readline = require('readline');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const DEFAULT_API_KEY = process.env.API_KEY || 'untad-api-key-2026';

let sessionToken = null;
let sessionUser = null;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function tanya(promptText) {
  return new Promise((resolve) => {
    rl.question(promptText, (jawaban) => {
      resolve(jawaban.trim());
    });
  });
}

async function requestAPI(endpoint, options = {}) {
  try {
    const url = `${BASE_URL}${endpoint}`;
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'x-api-key': DEFAULT_API_KEY
    };

    if (sessionToken) {
      defaultHeaders['Authorization'] = `Bearer ${sessionToken}`;
    }

    const res = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...(options.headers || {})
      }
    });

    const data = await res.json().catch(() => null);

    return {
      ok: res.ok,
      status: res.status,
      headers: res.headers,
      data: data
    };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      headers: new Headers(),
      data: {
        error: `Gagal terhubung ke server API (${err.message}). Pastikan server sudah aktif di ${BASE_URL}.`
      }
    };
  }
}

function cetakHeader() {
  console.clear();
  console.log('================================================================================');
  console.log('   CLIENT CONSOLE - SISTEM PENGELUARAN RISET FAKULTAS TEKNIK UNTAD (CLI)');
  console.log('   Final Project Rekayasa API (Sub-CPMK 5) - Standar Industri');
  console.log('   Target API: ' + BASE_URL + ' | Header API Key: ' + DEFAULT_API_KEY);
  if (sessionUser) {
    console.log(`   Status Sesi: TERAUTENTIKASI sebagai [${sessionUser.fullName}] (Role: ${sessionUser.role.toUpperCase()})`);
  } else {
    console.log('   Status Sesi: TAMU (Belum Login - Silakan pilih menu 1 untuk login)');
  }
  console.log('================================================================================\n');
}

// 1. Menu Login
async function menuLogin() {
  console.log('\n--- LOGIN AUTENTIKASI SISTEM (HMAC-SHA256 SIGNED TOKEN) ---');
  console.log('Petunjuk Akun:');
  console.log('• Admin     : username "admin", password "admin123" (Hak akses CRUD penuh)');
  console.log('• Mahasiswa : username "mahasiswa", password "mhs123" (Hak akses terbatas)\n');

  const username = await tanya('Masukkan Username: ');
  const password = await tanya('Masukkan Password: ');

  console.log('\nMenghubungi server...');
  const res = await requestAPI('/v2/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });

  if (!res.ok) {
    console.log(`\n[GAGAL] [Status ${res.status}] ${res.data?.error || 'Gagal login.'}`);
    return;
  }

  sessionToken = res.data.token;
  sessionUser = res.data.user;

  console.log(`\n[OK] ${res.data.pesan}`);
  console.log(`   Pengguna : ${sessionUser.fullName} (${sessionUser.identifier || '-'})`);
  console.log(`   Role     : ${sessionUser.role.toUpperCase()}`);
  console.log(`   Masa Berlaku Token: ${res.data.expiresIn}`);
  console.log(`   Token Disimpan Otomatis untuk request berikutnya.\n`);
}

// 2. Menu Lihat Kegiatan Riset
async function menuLihatKegiatan() {
  console.log('\n--- DAFTAR MASTER KEGIATAN RISET FT UNTAD (/v2/activities) ---');
  const res = await requestAPI('/v2/activities');

  if (!res.ok) {
    console.log(`[GAGAL] [Status ${res.status}] ${res.data?.error || 'Gagal mengambil data kegiatan.'}`);
    return;
  }

  const list = res.data.data;
  console.log(`Ditemukan ${list.length} kegiatan riset aktif:\n`);

  list.forEach((act) => {
    const fin = act.financialSummary;
    const w = act.currentWeather;
    console.log(`[ID ${act.id}] ${act.title}`);
    console.log(`   Lokasi      : ${act.location}`);
    console.log(`   Plafon Dana : ${fin.formatPlafon} | Realisasi: ${fin.formatRealisasi} (${fin.usagePercentage} terserap)`);
    console.log(`   Sisa Kuota  : ${fin.formatSisaAnggaran} [Status: ${fin.statusRisiko}]`);
    console.log(`   Cuaca Posko : ${w ? `${w.condition} (${w.temperatureFormatted}, Angin: ${w.windSpeedFormatted})` : 'Normal'}`);
    console.log(`   Ketua Tim   : ${act.leadResearcher} (${act.unit})`);
    console.log('   ' + '-'.repeat(70));
  });
}

// 3. Menu Lihat Seluruh Pengeluaran
async function menuLihatPengeluaran() {
  console.log('\n--- DAFTAR SELURUH PENGELUARAN RISET TERELASI (/v2/expenses) ---');
  const res = await requestAPI('/v2/expenses');

  if (!res.ok) {
    console.log(`[GAGAL] [Status ${res.status}] ${res.data?.error || 'Gagal mengambil data.'}`);
    return;
  }

  const items = res.data.data;
  if (!items || items.length === 0) {
    console.log('Belum ada transaksi pengeluaran tercatat.');
    return;
  }

  console.log(`Ditemukan ${items.length} catatan pengeluaran:\n`);
  items.forEach((item) => {
    console.log(`[ID #${item.id}] ${item.title}`);
    console.log(`   Kegiatan Riset : [ID ${item.activityId}] ${item.activity.title} (${item.activity.location})`);
    console.log(`   Kategori       : ${item.category.toUpperCase()}`);
    console.log(`   Nominal Asli   : ${item.cost.amount.toLocaleString('id-ID')} ${item.cost.currency}`);
    console.log(`   Konversi Live  : ${item.cost.formatRupiah} (${item.cost.kursPerSatuan})`);
    console.log(`   Tanggal & PIC  : ${item.date} | Diinput oleh: ${item.submittedBy}`);
    console.log(`   Catatan        : ${item.notes || '-'}`);
    console.log('   ' + '-'.repeat(70));
  });
}

// 4. Menu Tambah Pengeluaran Baru
async function menuTambahPengeluaran() {
  console.log('\n--- CATAT PENGELUARAN RISET BARU (POST /v2/expenses) ---');
  if (!sessionToken) {
    console.log('[PERINGATAN] Anda belum login! Operasi ini memerlukan token autentikasi.');
    console.log('   Silakan login terlebih dahulu melalui Menu 1.\n');
    return;
  }

  console.log('Mewajibkan parameter "activityId" (Breaking change v2 terhadap Sub-CPMK 4).');
  const actIdStr = await tanya('1. Masukkan ID Kegiatan Riset (1/2/3): ');
  const title = await tanya('2. Judul Pengeluaran (Contoh: Sewa Alat GPS Geodesi): ');
  const cat = await tanya('3. Kategori (transportasi/akomodasi/konsumsi/belanja/hiburan): ');
  const cur = await tanya('4. Mata Uang (IDR/USD/JPY/EUR/SGD): ');
  const amountStr = await tanya('5. Nominal Biaya: ');
  const dateStr = await tanya('6. Tanggal (YYYY-MM-DD, kosongkan untuk hari ini): ');
  const notes = await tanya('7. Catatan Tambahan (Opsional): ');

  const payload = {
    activityId: parseInt(actIdStr, 10),
    title: title,
    category: cat.toLowerCase(),
    currency: cur.toUpperCase(),
    amount: parseFloat(amountStr),
    date: dateStr || new Date().toISOString().split('T')[0],
    notes: notes
  };

  console.log('\nMengirim request ke server...');
  const res = await requestAPI('/v2/expenses', {
    method: 'POST',
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    console.log(`\n[GAGAL] [Status ${res.status}] ${res.data?.error || 'Gagal menyimpan pengeluaran.'}`);
    if (res.data?.detail) console.log(`   Detail: ${JSON.stringify(res.data.detail)}`);
    return;
  }

  console.log(`\n[OK] ${res.data.pesan}`);
  console.log(`   ID Pengeluaran : #${res.data.data.id}`);
  console.log(`   Terkait Kegiatan: ${res.data.data.activity.title}`);
  console.log(`   Total Nilai IDR : ${res.data.data.cost.formatRupiah}`);
  console.log(`   Diinput oleh    : ${res.data.data.submittedBy}\n`);
}

// 5. Menu Uji Keamanan Otorisasi (Status 403 Forbidden)
async function menuUjiOtorisasiRole() {
  console.log('\n--- UJI PEMBATASAN OTORISASI ROLE MAHASISWA (STATUS 403 FORBIDDEN) ---');
  if (!sessionToken) {
    console.log('[PERINGATAN] Silakan login terlebih dahulu (Menu 1) menggunakan akun mahasiswa.');
    return;
  }

  console.log(`Status Akun Saat Ini: ${sessionUser.fullName} (Role: ${sessionUser.role.toUpperCase()})`);
  console.log('Skenario Uji: Mengirim DELETE /v2/expenses/1 untuk menguji proteksi role.');

  const res = await requestAPI('/v2/expenses/1', { method: 'DELETE' });

  if (res.status === 403) {
    console.log('\n[PASS] HASIL UJI 403 FORBIDDEN BERHASIL:');
    console.log(`   Status HTTP: ${res.status} Forbidden`);
    console.log(`   Pesan Server: "${res.data.error}"`);
    console.log('   Keterangan: Role mahasiswa berhasil dicegah dari operasi administratif berbahaya.');
  } else if (res.ok) {
    console.log(`\n[OK] Berhasil terhapus (Akun Anda memiliki wewenang role ADMIN: ${res.data.pesan})`);
  } else {
    console.log(`\n[Status ${res.status}] ${res.data?.error || 'Gagal'}`);
  }
}

// 6. Menu Ringkasan Anggaran Konsolidasi
async function menuRingkasanAnggaran() {
  console.log('\n--- ANALISIS KEUANGAN & EVALUASI RISIKO ANGGARAN RISET (/v2/expenses/summary) ---');
  const res = await requestAPI('/v2/expenses/summary');

  if (!res.ok) {
    console.log(`[GAGAL] [Status ${res.status}] Gagal mengambil ringkasan.`);
    return;
  }

  const fin = res.data.ringkasanKeuanganFakultas;
  const pub = res.data.pengayaanPublicAPI;

  console.log(`• Total Plafon Anggaran : ${fin.formatTotalPlafon}`);
  console.log(`• Total Realisasi Biaya : ${fin.formatTotalRealisasi}`);
  console.log(`• Sisa Kuota Fakultas   : ${fin.formatSisaAnggaran}`);
  console.log(`• Penyerapan Anggaran   : ${fin.persentasePemakaian}`);
  console.log(`• Evaluasi Risiko       : [${fin.statusRisiko}] ${fin.pesanEvaluasi}\n`);

  console.log('PENGAYAAN DATA PUBLIC API PIHAK KETIGA:');
  console.log(`1. Valas Live (ExchangeRate): 1 USD ≈ Rp ${Math.round(pub.kursValas.kursIDRperUSD).toLocaleString('id-ID')} (${pub.kursValas.status})`);
  if (pub.cuacaUntad) {
    console.log(`2. Cuaca Live Untad (Open-Meteo): ${pub.cuacaUntad.temperatureFormatted}, ${pub.cuacaUntad.condition} (Angin: ${pub.cuacaUntad.windSpeedFormatted})`);
  }
}

// 7. Menu Uji Sunset Header (/v1/expenses)
async function menuUjiSunsetHeader() {
  console.log('\n--- UJI ENDPOINT LEGACY SUB-CPMK 4 (/v1/expenses DENGAN HEADER SUNSET) ---');
  const res = await requestAPI('/v1/expenses');

  console.log(`Status HTTP: ${res.status} OK`);
  console.log('\n--- HTTP RESPONSE HEADERS DITERIMA ---');
  console.log(`Sunset      : ${res.headers.get('sunset') || 'Tidak ada'}`);
  console.log(`Deprecation : ${res.headers.get('deprecation') || 'Tidak ada'}`);
  console.log(`Link        : ${res.headers.get('link') || 'Tidak ada'}`);

  console.log('\n--- RESPONSE BODY (FORMAT FLAT LAMA SUB-CPMK 4) ---');
  if (res.data && res.data.data && res.data.data.length > 0) {
    console.log('Contoh 1 item respon versi v1:');
    console.log(JSON.stringify(res.data.data[0], null, 2));
    console.log(`\nPesan Sistem v1: "${res.data.peringatanDepresiasi}"`);
  }
}

// Main Menu Loop
async function main() {
  while (true) {
    cetakHeader();
    console.log('PILIHAN MENU:');
    console.log('1. Login Autentikasi (Dapatkan Signed Token HMAC)');
    console.log('2. Lihat Master Kegiatan Riset FT Untad (/v2/activities)');
    console.log('3. Lihat Seluruh Pengeluaran Terelasi (/v2/expenses)');
    console.log('4. Catat Pengeluaran Baru (/v2/expenses - wajib token)');
    console.log('5. Uji Pembatasan Hak Akses Role (Demo Status 403 Forbidden)');
    console.log('6. Ringkasan Keuangan Riset & Evaluasi Over-Budget (/v2/expenses/summary)');
    console.log('7. Uji Kompatibilitas Versi Lama & Header Sunset (/v1/expenses)');
    console.log('8. Logout / Reset Sesi Login');
    console.log('0. Keluar dari Aplikasi');

    const pilihan = await tanya('\nPilih nomor menu (0-8): ');

    if (pilihan === '1') await menuLogin();
    else if (pilihan === '2') await menuLihatKegiatan();
    else if (pilihan === '3') await menuLihatPengeluaran();
    else if (pilihan === '4') await menuTambahPengeluaran();
    else if (pilihan === '5') await menuUjiOtorisasiRole();
    else if (pilihan === '6') await menuRingkasanAnggaran();
    else if (pilihan === '7') await menuUjiSunsetHeader();
    else if (pilihan === '8') {
      sessionToken = null;
      sessionUser = null;
      console.log('\n[OK] Sesi login telah direset.');
    } else if (pilihan === '0') {
      console.log('\nTerima kasih telah menggunakan Client Console API FT Untad. Sampai jumpa!');
      rl.close();
      process.exit(0);
    } else {
      console.log('\n[PERINGATAN] Pilihan menu tidak valid.');
    }

    await tanya('\nTekan [ENTER] untuk kembali ke menu utama...');
  }
}

main();
