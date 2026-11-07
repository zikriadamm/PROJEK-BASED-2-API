// Client Web Dashboard Application - Vanguard Tier (Impeccable Edition)
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
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('hidden');
}
function tutupModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add('hidden');
}

// Update User UI State
function updateAuthUI() {
  const badge = document.getElementById('userBadge');
  const statusText = document.getElementById('userStatusText');
  const btnLogin = document.getElementById('btnLoginModal');
  const btnLogout = document.getElementById('btnLogout');
  const indicator = badge ? badge.querySelector('.status-dot') : null;

  if (currentUser) {
    if (indicator) indicator.classList.add('active');
    if (statusText) {
      statusText.innerHTML = `<strong>${currentUser.fullName}</strong> (${currentUser.role.toUpperCase()})`;
    }
    if (btnLogin) btnLogin.classList.add('hidden');
    if (btnLogout) btnLogout.classList.remove('hidden');
  } else {
    if (indicator) indicator.classList.remove('active');
    if (statusText) statusText.textContent = 'Mode Tamu (Read-Only)';
    if (btnLogin) btnLogin.classList.remove('hidden');
    if (btnLogout) btnLogout.classList.add('hidden');
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
    const tempEl = document.getElementById('widgetWeatherTemp');
    if (tempEl) tempEl.textContent = pub.cuacaUntad.temperatureFormatted || '--°C';

    const condEl = document.getElementById('widgetWeatherCondition');
    if (condEl) condEl.textContent = pub.cuacaUntad.condition || 'Cerah Berawan';

    const windSpan = document.getElementById('widgetWeatherWind')?.querySelector('span');
    if (windSpan) {
      windSpan.textContent = `Kecepatan Angin: ${pub.cuacaUntad.windSpeedFormatted || '--'} (${pub.cuacaUntad.status})`;
    }
  }

  // Currency Widget
  if (pub && pub.kursValas && pub.kursValas.kursIDRperUSD) {
    const usd = Math.round(pub.kursValas.kursIDRperUSD);
    const usdEl = document.getElementById('rateUSD');
    const jpyEl = document.getElementById('rateJPY');
    const eurEl = document.getElementById('rateEUR');
    if (usdEl) usdEl.textContent = `≈ Rp ${usd.toLocaleString('id-ID')}`;
    if (jpyEl) jpyEl.textContent = `≈ Rp ${Math.round(usd / 150).toLocaleString('id-ID')}`;
    if (eurEl) eurEl.textContent = `≈ Rp ${Math.round(usd * 1.08).toLocaleString('id-ID')}`;
  }

  // Budget Widget
  if (fin) {
    const realEl = document.getElementById('budgetTotalRealisasi');
    const plafonEl = document.getElementById('budgetTotalPlafon');
    if (realEl) realEl.textContent = fin.formatTotalRealisasi;
    if (plafonEl) plafonEl.textContent = `dari Total Pagu: ${fin.formatTotalPlafon}`;

    const pBar = document.getElementById('budgetProgressBar');
    if (pBar) pBar.style.width = fin.persentasePemakaian;

    const remainingSpan = document.getElementById('budgetRemainingText')?.querySelector('span');
    if (remainingSpan) {
      remainingSpan.textContent = `Sisa Kuota: ${fin.formatSisaAnggaran} (${fin.persentasePemakaian} Terserap)`;
    }

    const badge = document.getElementById('budgetRiskBadge');
    if (badge) {
      badge.textContent = fin.statusRisiko;
      badge.className = fin.statusRisiko === 'AMAN' ? 'status-pill-safe' : 'badge-deprecated';
    }
  }
}

// 2. Load Activities
async function loadActivities() {
  const grid = document.getElementById('activitiesGrid');
  const selectAct = document.getElementById('expenseActivitySelect');
  const res = await apiRequest('/v2/activities');

  if (!res.ok || !res.data) {
    if (grid) grid.innerHTML = '<div class="empty-state">Gagal memuat data kegiatan riset.</div>';
    return;
  }

  const activities = res.data.data;
  if (grid) grid.innerHTML = '';
  if (selectAct) selectAct.innerHTML = '<option value="">-- Pilih Kegiatan Riset --</option>';

  activities.forEach((act) => {
    // Dropdown option
    if (selectAct) {
      const opt = document.createElement('option');
      opt.value = act.id;
      opt.textContent = `[ID ${act.id}] ${act.title} (${act.location})`;
      selectAct.appendChild(opt);
    }

    // Activity Card element (Single-Elevation Architecture)
    const fin = act.financialSummary;
    const card = document.createElement('article');
    card.className = 'activity-card';
    card.innerHTML = `
      <div>
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:0.5rem; margin-bottom:0.5rem;">
          <h3 class="activity-card-title">${act.title}</h3>
          <span class="status-pill-safe">${fin.statusRisiko}</span>
        </div>
        <div class="activity-card-geo">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          <span>${act.location}</span>
        </div>
        <div class="weather-badge-pill">
          <span>Stasiun Cuaca:</span>
          <strong>${act.currentWeather ? `${act.currentWeather.condition} (${act.currentWeather.temperatureFormatted})` : 'Normal'}</strong>
        </div>
        <p class="activity-desc">${act.description || ''}</p>
        <div class="activity-meta-row">
          <span>Ketua: <strong>${act.leadResearcher}</strong> | Unit: ${act.unit}</span>
        </div>
      </div>
      <div>
        <div style="display:flex; justify-content:space-between; font-size:0.8rem; font-weight:600; margin-bottom:0.35rem;">
          <span style="color:var(--text-secondary);">Realisasi: <strong style="color:var(--accent-cyan); font-family:var(--font-mono);">${fin.formatRealisasi}</strong></span>
          <span style="color:var(--text-muted); font-family:var(--font-mono);">Plafon: ${fin.formatPlafon}</span>
        </div>
        <div class="progress-container" role="progressbar" aria-label="Penyerapan Dana Riset">
          <div class="progress-bar-fill" style="width: ${fin.usagePercentage};"></div>
        </div>
        <div style="font-size:0.775rem; color:var(--text-muted); display:flex; justify-content:space-between; margin-top:0.45rem;">
          <span>${fin.jumlahPengeluaran} Transaksi</span>
          <span>Sisa: <strong style="color:var(--accent-emerald); font-family:var(--font-mono);">${fin.formatSisaAnggaran}</strong></span>
        </div>
      </div>
    `;
    if (grid) grid.appendChild(card);
  });
}

// 3. Load Expenses
async function loadExpenses(categoryFilter = '') {
  const tbody = document.getElementById('expensesTableBody');
  if (!tbody) return;

  let url = '/v2/expenses';
  if (categoryFilter) url += `?category=${encodeURIComponent(categoryFilter)}`;

  const res = await apiRequest(url);
  if (!res.ok || !res.data) {
    tbody.innerHTML = '<tr><td colspan="9" class="cell-center">Gagal memuat pengeluaran.</td></tr>';
    return;
  }

  const items = res.data.data;
  if (!items || items.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" class="cell-center">Belum ada catatan transaksi tersimpan.</td></tr>';
    return;
  }

  tbody.innerHTML = '';
  items.forEach((item) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><span class="id-tag">#${item.id}</span></td>
      <td>
        <strong style="color:var(--text-primary); font-size:0.875rem;">${item.title}</strong>
        ${item.notes ? `<div style="font-size:0.75rem; color:var(--text-muted); margin-top:0.15rem;">${item.notes}</div>` : ''}
      </td>
      <td>
        <span style="color:var(--accent-cyan); font-weight:600; font-size:0.825rem;">${item.activity.title}</span>
        <div style="font-size:0.75rem; color:var(--text-muted);">📍 ${item.activity.location}</div>
      </td>
      <td><span class="category-chip">${item.category}</span></td>
      <td><span class="amount-raw">${item.cost.amount.toLocaleString('id-ID')} ${item.cost.currency}</span></td>
      <td>
        <div class="amount-idr">${item.cost.formatRupiah}</div>
        <div style="font-size:0.725rem; color:var(--text-muted); font-family:var(--font-mono);">${item.cost.kursPerSatuan}</div>
      </td>
      <td style="font-family:var(--font-mono); font-size:0.8rem; color:var(--text-secondary);">${item.date}</td>
      <td style="font-size:0.775rem; color:var(--text-muted);">${item.submittedBy}</td>
      <td>
        <button type="button" class="btn-micro" style="color:#fca5a5; border-color:rgba(244,63,94,0.3);" onclick="hapusExpense(${item.id})">Hapus</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// 4. Delete Expense Handler
async function hapusExpense(id) {
  if (!confirm(`Apakah Anda yakin ingin menghapus pengeluaran ID #${id}?`)) return;

  const res = await apiRequest(`/v2/expenses/${id}`, {
    method: 'DELETE'
  });

  if (!res.ok) {
    alert(`Gagal menghapus: ${res.data?.error || 'Akses ditolak (butuh role admin)'}`);
    return;
  }

  alert(res.data.pesan);
  loadExpenses();
  loadActivities();
  loadSummaryWidgets();
}

// 5. Test Sunset v1 & Active v2
document.getElementById('btnTestV1')?.addEventListener('click', async () => {
  const box = document.getElementById('resBoxV1');
  if (box) box.textContent = 'Menghubungi GET /v1/expenses...';

  try {
    const res = await fetch('/v1/expenses');
    const sunsetHeader = res.headers.get('sunset');
    const deprecation = res.headers.get('deprecation');
    const json = await res.json();

    const output = {
      httpStatus: res.status,
      responseHeaders: {
        'Sunset': sunsetHeader,
        'Deprecation': deprecation
      },
      catatanAudit: 'Membuktikan kepatuhan Sub-CPMK 4 & RFC 8594 Sunset Header',
      payloadV1: json
    };

    if (box) box.textContent = JSON.stringify(output, null, 2);
  } catch (err) {
    if (box) box.textContent = 'Error: ' + err.message;
  }
});

document.getElementById('btnTestV2')?.addEventListener('click', async () => {
  const box = document.getElementById('resBoxV2');
  if (box) box.textContent = 'Menghubungi GET /v2/expenses...';

  const res = await apiRequest('/v2/expenses');
  if (box) {
    box.textContent = JSON.stringify({
      httpStatus: res.status,
      catatanAudit: 'Format standar industri v2 dengan relasi activityId, cost object, & validasi valas',
      response: res.data
    }, null, 2);
  }
});

// 6. GraphQL Query Runner
document.getElementById('btnRunGraphQL')?.addEventListener('click', async () => {
  const query = document.getElementById('gqlQueryInput').value;
  const out = document.getElementById('gqlResultOutput');
  out.textContent = 'Mengeksekusi query di GraphQL engine native...';

  try {
    const res = await fetch('/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });
    const json = await res.json();
    out.textContent = JSON.stringify(json, null, 2);
  } catch (err) {
    out.textContent = 'Error eksekusi GraphQL: ' + err.message;
  }
});

// 7. Forms Handling
document.getElementById('formLogin')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value.trim();

  const res = await apiRequest('/v2/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });

  if (!res.ok) {
    alert(`Login Gagal: ${res.data?.pesan || res.data?.error || 'Periksa kredensial'}`);
    return;
  }

  currentToken = res.data.token;
  currentUser = res.data.user;
  sessionStorage.setItem('untad_token', currentToken);
  sessionStorage.setItem('untad_user', JSON.stringify(currentUser));

  updateAuthUI();
  tutupModal('loginModal');
  alert(`Selamat datang, ${currentUser.fullName} (${currentUser.role})!`);
});

document.getElementById('btnLogout')?.addEventListener('click', async () => {
  if (currentToken) {
    await apiRequest('/v2/auth/logout', { method: 'POST' });
  }
  currentToken = null;
  currentUser = null;
  sessionStorage.removeItem('untad_token');
  sessionStorage.removeItem('untad_user');
  updateAuthUI();
  alert('Anda telah keluar dari sistem.');
});

document.getElementById('formExpense')?.addEventListener('submit', async (e) => {
  e.preventDefault();
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

document.getElementById('formActivity')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = {
    title: document.getElementById('actTitle').value.trim(),
    location: document.getElementById('actLocation').value.trim(),
    budgetLimitIDR: Number(document.getElementById('actBudgetLimit').value),
    unit: document.getElementById('actUnit').value.trim() || 'Fakultas Teknik Untad',
    leadResearcher: document.getElementById('actLeadResearcher').value.trim() || (currentUser ? currentUser.fullName : 'Dosen Peneliti'),
    latitude: Number(document.getElementById('actLat').value) || -0.836,
    longitude: Number(document.getElementById('actLon').value) || 119.893,
    description: document.getElementById('actDesc').value.trim()
  };

  const res = await apiRequest('/v2/activities', {
    method: 'POST',
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    alert(`Gagal (${res.status}): ${res.data?.error || res.data?.pesan || 'Gagal menyimpan kegiatan'}`);
    return;
  }

  alert(res.data.pesan || 'Kegiatan riset berhasil ditambahkan!');
  tutupModal('activityModal');
  document.getElementById('formActivity').reset();
  loadActivities();
  loadSummaryWidgets();
});

// Tab Switching (Supporting both .tab-button and .tab-btn)
document.querySelectorAll('.tab-button, .tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-button, .tab-btn').forEach((b) => {
      b.classList.remove('active');
      b.setAttribute('aria-selected', 'false');
    });
    document.querySelectorAll('.tab-panel, .tab-content').forEach((c) => c.classList.remove('active'));
    
    btn.classList.add('active');
    btn.setAttribute('aria-selected', 'true');
    const target = document.getElementById(btn.dataset.tab);
    if (target) target.classList.add('active');
  });
});

// Button Modal Triggers
document.getElementById('btnLoginModal')?.addEventListener('click', () => bukaModal('loginModal'));
document.getElementById('btnTambahExpenseModal')?.addEventListener('click', () => {
  if (!currentToken) {
    alert('Harap login terlebih dahulu untuk menambahkan pengeluaran.');
    bukaModal('loginModal');
  } else {
    bukaModal('expenseModal');
  }
});
document.getElementById('btnTambahKegiatanModal')?.addEventListener('click', () => {
  if (!currentToken) {
    alert('Harap login terlebih dahulu sebagai "admin" untuk menambah kegiatan riset.');
    bukaModal('loginModal');
    return;
  }
  if (!currentUser || currentUser.role !== 'admin') {
    alert('Akses Ditolak: Hanya akun dengan role "admin" (Dosen/Keuangan) yang berwenang menambah kegiatan riset.');
    return;
  }
  bukaModal('activityModal');
});
document.getElementById('filterCategory')?.addEventListener('change', (e) => {
  loadExpenses(e.target.value);
});

// Init on Load
window.addEventListener('DOMContentLoaded', () => {
  const savedUser = sessionStorage.getItem('untad_user');
  if (savedUser && currentToken) {
    currentUser = JSON.parse(savedUser);
    updateAuthUI();
  }

  const today = new Date().toISOString().split('T')[0];
  const dateInput = document.getElementById('expenseDate');
  if (dateInput) dateInput.value = today;

  loadSummaryWidgets();
  loadActivities();
  loadExpenses();
});
