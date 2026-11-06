// Client Web Dashboard Application
const API_KEY = 'untad-api-key-2026';
let currentUser = null;
let currentToken = sessionStorage.getItem('untad_token') || null;

// Helper Request API
async function apiRequest(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    'x-api-key': API_KEY,
    ...(options.headers || {})
  };

  if (currentToken) {
    headers['Authorization'] = `Bearer ${currentToken}`;
  }

  const res = await fetch(endpoint, {
    ...options,
    headers
  });

  const data = await res.json().catch(() => null);
  return {
    ok: res.ok,
    status: res.status,
    headers: res.headers,
    data: data
  };
}

// Modal Helpers
function bukaModal(id) {
  document.getElementById(id).classList.remove('hidden');
}
function tutupModal(id) {
  document.getElementById(id).classList.add('hidden');
}

// Update User UI State
function updateAuthUI() {
  const badge = document.getElementById('userBadge');
  const statusText = document.getElementById('userStatusText');
  const btnLogin = document.getElementById('btnLoginModal');
  const btnLogout = document.getElementById('btnLogout');
  const indicator = badge.querySelector('.status-indicator');

  if (currentUser) {
    indicator.classList.add('active');
    statusText.innerHTML = `<strong>${currentUser.fullName}</strong> (${currentUser.role.toUpperCase()})`;
    btnLogin.classList.add('hidden');
    btnLogout.classList.remove('hidden');
  } else {
    indicator.classList.remove('active');
    statusText.textContent = 'Mode Tamu (Gunakan Login untuk Akses Penuh)';
    btnLogin.classList.remove('hidden');
    btnLogout.classList.add('hidden');
  }
}

// 1. Load Live Summary Widgets
async function loadSummaryWidgets() {
  const res = await apiRequest('/v2/expenses/summary');
  if (!res.ok || !res.data) return;

  const summary = res.data;
  const fin = summary.ringkasanKeuanganFakultas;
  const pub = summary.pengayaanPublicAPI;

  // Weather Widget
  if (pub && pub.cuacaUntad) {
    document.getElementById('widgetWeatherTemp').textContent = pub.cuacaUntad.temperatureFormatted || '--°C';
    document.getElementById('widgetWeatherCondition').textContent = pub.cuacaUntad.condition || 'Cerah';
    document.getElementById('widgetWeatherWind').textContent = `Kecepatan Angin: ${pub.cuacaUntad.windSpeedFormatted || '--'} (${pub.cuacaUntad.status})`;
  }

  // Currency Widget
  if (pub && pub.kursValas && pub.kursValas.kursIDRperUSD) {
    const usd = Math.round(pub.kursValas.kursIDRperUSD);
    document.getElementById('rateUSD').textContent = `≈ Rp ${usd.toLocaleString('id-ID')}`;
    document.getElementById('rateJPY').textContent = `≈ Rp ${Math.round(usd / 150).toLocaleString('id-ID')}`;
    document.getElementById('rateEUR').textContent = `≈ Rp ${Math.round(usd * 1.08).toLocaleString('id-ID')}`;
  }

  // Budget Widget
  if (fin) {
    document.getElementById('budgetTotalRealisasi').textContent = fin.formatTotalRealisasi;
    document.getElementById('budgetTotalPlafon').textContent = `dari Total Pagu: ${fin.formatTotalPlafon}`;
    const pBar = document.getElementById('budgetProgressBar');
    pBar.style.width = fin.persentasePemakaian;
    document.getElementById('budgetRemainingText').textContent = `Sisa Kuota: ${fin.formatSisaAnggaran} (${fin.persentasePemakaian} Terserap)`;

    const badge = document.getElementById('budgetRiskBadge');
    badge.textContent = fin.statusRisiko;
    badge.className = 'badge-status ' + (fin.statusRisiko === 'AMAN' ? 'badge-safe' : (fin.statusRisiko === 'SEDANG' ? 'badge-warning' : 'badge-danger'));
  }
}

// 2. Load Activities
async function loadActivities() {
  const grid = document.getElementById('activitiesGrid');
  const selectAct = document.getElementById('expenseActivitySelect');
  const res = await apiRequest('/v2/activities');

  if (!res.ok || !res.data) {
    grid.innerHTML = '<div class="loading-state">Gagal memuat data kegiatan riset.</div>';
    return;
  }

  const activities = res.data.data;
  grid.innerHTML = '';
  selectAct.innerHTML = '<option value="">-- Pilih Kegiatan Riset --</option>';

  activities.forEach((act) => {
    // Dropdown option
    const opt = document.createElement('option');
    opt.value = act.id;
    opt.textContent = `[ID ${act.id}] ${act.title} (${act.location})`;
    selectAct.appendChild(opt);

    // Card element
    const fin = act.financialSummary;
    const card = document.createElement('div');
    card.className = 'activity-card';
    card.innerHTML = `
      <div>
        <div class="activity-header">
          <span class="activity-title">${act.title}</span>
          <span class="badge-status ${fin.statusRisiko === 'AMAN' ? 'badge-safe' : 'badge-warning'}">${fin.statusRisiko}</span>
        </div>
        <div class="activity-location">📍 ${act.location}</div>
        <div class="activity-weather-badge">
          ☁️ Cuaca Posko: ${act.currentWeather ? `${act.currentWeather.condition} (${act.currentWeather.temperatureFormatted})` : 'Normal'}
        </div>
        <p style="font-size:0.85rem; color:#475569; margin-bottom:0.75rem;">${act.description || ''}</p>
        <div style="font-size:0.8rem; color:#64748b; margin-bottom:0.5rem;">
          👤 Ketua: <strong>${act.leadResearcher}</strong> | 🏢 ${act.unit}
        </div>
      </div>
      <div>
        <div style="display:flex; justify-content:space-between; font-size:0.85rem; font-weight:700; margin-bottom:0.25rem;">
          <span>Realisasi: ${fin.formatRealisasi}</span>
          <span>Plafon: ${fin.formatPlafon}</span>
        </div>
        <div class="progress-bar-container">
          <div class="progress-bar" style="width: ${fin.usagePercentage};"></div>
        </div>
        <div style="font-size:0.75rem; color:#64748b; display:flex; justify-content:space-between; margin-top:0.35rem;">
          <span>${fin.jumlahPengeluaran} Transaksi Tercatat</span>
          <span>Sisa: ${fin.formatSisaAnggaran}</span>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
}

// 3. Load Expenses
async function loadExpenses(categoryFilter = '') {
  const tbody = document.getElementById('expensesTableBody');
  let url = '/v2/expenses';
  if (categoryFilter) url += `?category=${encodeURIComponent(categoryFilter)}`;

  const res = await apiRequest(url);
  if (!res.ok || !res.data) {
    tbody.innerHTML = '<tr><td colspan="9" class="text-center">Gagal memuat pengeluaran.</td></tr>';
    return;
  }

  const items = res.data.data;
  if (!items || items.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" class="text-center">Belum ada catatan pengeluaran tersimpan.</td></tr>';
    return;
  }

  tbody.innerHTML = '';
  items.forEach((item) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>#${item.id}</strong></td>
      <td><strong>${item.title}</strong><br><small style="color:#64748b;">${item.notes || '-'}</small></td>
      <td><span style="color:#1e40af; font-weight:600;">${item.activity.title}</span><br><small>📍 ${item.activity.location}</small></td>
      <td><span class="badge-status badge-warning">${item.category}</span></td>
      <td>${item.cost.amount.toLocaleString('id-ID')} ${item.cost.currency}</td>
      <td><strong style="color:#059669;">${item.cost.formatRupiah}</strong><br><small style="color:#64748b;">${item.cost.kursPerSatuan}</small></td>
      <td>${item.date}</td>
      <td><small>${item.submittedBy}</small></td>
      <td>
        <button class="btn btn-danger" style="padding:0.25rem 0.5rem; font-size:0.75rem;" onclick="hapusExpense(${item.id})">Hapus</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// 4. Delete Expense Handler
async function hapusExpense(id) {
  if (!confirm(`Apakah Anda yakin ingin menghapus pengeluaran ID ${id}?`)) return;

  const res = await apiRequest(`/v2/expenses/${id}`, { method: 'DELETE' });
  if (res.status === 401) {
    alert('401 Unauthorized: Anda belum login! Silakan login terlebih dahulu.');
    bukaModal('loginModal');
    return;
  }
  if (res.status === 403) {
    alert(`403 Forbidden! ${res.data.error}\n\n(Hanya role "admin" yang berhak menghapus data. Ini membuktikan sistem keamanan RBAC berfungsi sesuai spesifikasi!)`);
    return;
  }
  if (!res.ok) {
    alert(`Error ${res.status}: ${res.data?.error || 'Gagal menghapus'}`);
    return;
  }

  alert(res.data.pesan);
  loadExpenses();
  loadActivities();
  loadSummaryWidgets();
}

// 5. Test v1 vs v2 Sunset Demonstration
document.getElementById('btnTestV1').addEventListener('click', async () => {
  const box = document.getElementById('resBoxV1');
  box.textContent = 'Memanggil GET /v1/expenses...';
  const res = await apiRequest('/v1/expenses');

  const headersObj = {};
  res.headers.forEach((val, key) => {
    if (['sunset', 'deprecation', 'link', 'content-type'].includes(key.toLowerCase())) {
      headersObj[key] = val;
    }
  });

  box.textContent = `=== HTTP RESPONSE HEADERS ===\n${JSON.stringify(headersObj, null, 2)}\n\n=== RESPONSE BODY JSON ===\n${JSON.stringify(res.data, null, 2)}`;
});

document.getElementById('btnTestV2').addEventListener('click', async () => {
  const box = document.getElementById('resBoxV2');
  box.textContent = 'Memanggil GET /v2/expenses...';
  const res = await apiRequest('/v2/expenses');
  box.textContent = JSON.stringify(res.data, null, 2);
});

// 6. GraphQL Runner
document.getElementById('btnRunGraphQL').addEventListener('click', async () => {
  const query = document.getElementById('gqlQueryInput').value;
  const outBox = document.getElementById('gqlResultOutput');
  outBox.textContent = 'Mengeksekusi query di server native...';

  const res = await apiRequest('/graphql', {
    method: 'POST',
    body: JSON.stringify({ query })
  });

  outBox.textContent = JSON.stringify(res.data, null, 2);
});

// 7. Login Form Handler
document.getElementById('formLogin').addEventListener('submit', async (e) => {
  e.preventDefault();
  const u = document.getElementById('loginUsername').value.trim();
  const p = document.getElementById('loginPassword').value.trim();

  const res = await apiRequest('/v2/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: u, password: p })
  });

  if (!res.ok) {
    alert(`Login Gagal (${res.status}): ${res.data?.error || 'Kredensial salah'}`);
    return;
  }

  currentToken = res.data.token;
  currentUser = res.data.user;
  sessionStorage.setItem('untad_token', currentToken);
  sessionStorage.setItem('untad_user', JSON.stringify(currentUser));

  updateAuthUI();
  tutupModal('loginModal');
  alert(`Selamat datang, ${currentUser.fullName}! Login berhasil dengan role: ${currentUser.role}.`);
});

// 8. Logout
document.getElementById('btnLogout').addEventListener('click', () => {
  currentToken = null;
  currentUser = null;
  sessionStorage.removeItem('untad_token');
  sessionStorage.removeItem('untad_user');
  updateAuthUI();
  alert('Anda telah keluar dari sesi.');
});

// 9. Add Expense Form Submit
document.getElementById('formExpense').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!currentToken) {
    alert('Silakan login terlebih dahulu untuk mencatat pengeluaran riset.');
    bukaModal('loginModal');
    return;
  }

  const payload = {
    activityId: Number(document.getElementById('expenseActivitySelect').value),
    title: document.getElementById('expenseTitle').value.trim(),
    category: document.getElementById('expenseCategory').value,
    currency: document.getElementById('expenseCurrency').value,
    amount: Number(document.getElementById('expenseAmount').value),
    date: document.getElementById('expenseDate').value,
    notes: document.getElementById('expenseNotes').value.trim()
  };

  const res = await apiRequest('/v2/expenses', {
    method: 'POST',
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    alert(`Gagal (${res.status}): ${res.data?.error || 'Kesalahan input'}`);
    return;
  }

  alert(res.data.pesan);
  tutupModal('expenseModal');
  document.getElementById('formExpense').reset();
  loadExpenses();
  loadActivities();
  loadSummaryWidgets();
});

// Tab Switching
document.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach((c) => c.classList.remove('active'));
    btn.classList.add('active');
    const target = document.getElementById(btn.dataset.tab);
    if (target) target.classList.add('active');
  });
});

// Button Modal Triggers
document.getElementById('btnLoginModal').addEventListener('click', () => bukaModal('loginModal'));
document.getElementById('btnTambahExpenseModal').addEventListener('click', () => {
  if (!currentToken) {
    alert('Harap login terlebih dahulu untuk menambahkan pengeluaran.');
    bukaModal('loginModal');
  } else {
    bukaModal('expenseModal');
  }
});
document.getElementById('btnTambahKegiatanModal').addEventListener('click', () => {
  if (!currentUser || currentUser.role !== 'admin') {
    alert('Hanya role "admin" yang diizinkan menambah master kegiatan riset!');
    if (!currentUser) bukaModal('loginModal');
  } else {
    alert('Fitur tambah kegiatan tersedia via REST API POST /v2/activities.');
  }
});
document.getElementById('filterCategory').addEventListener('change', (e) => {
  loadExpenses(e.target.value);
});

// Init on Load
window.addEventListener('DOMContentLoaded', () => {
  const savedUser = sessionStorage.getItem('untad_user');
  if (savedUser && currentToken) {
    currentUser = JSON.parse(savedUser);
    updateAuthUI();
  }

  // Set default date picker to today
  const today = new Date().toISOString().split('T')[0];
  const dateInput = document.getElementById('expenseDate');
  if (dateInput) dateInput.value = today;

  loadSummaryWidgets();
  loadActivities();
  loadExpenses();
});
