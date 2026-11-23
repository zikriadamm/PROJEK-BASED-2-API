// Aplikasi Web Dashboard Portal Riset FT Untad
const API_KEY = 'untad-api-key-2026';
let currentUser = null;
let currentToken = sessionStorage.getItem('untad_token') || null;
let selectedQuickCategory = 'belanja';
let cachedActivities = [];

// Sanitasi HTML untuk mencegah XSS saat merender string dinamis ke innerHTML
function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Non-blocking Toast Notification (pengganti alert())
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast-item toast-${type}`;
  toast.setAttribute('role', 'status');

  const span = document.createElement('span');
  span.textContent = message;

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'toast-close-btn';
  closeBtn.setAttribute('aria-label', 'Tutup Notifikasi');
  closeBtn.textContent = '×';
  closeBtn.addEventListener('click', () => toast.remove());

  toast.appendChild(span);
  toast.appendChild(closeBtn);
  container.appendChild(toast);

  setTimeout(() => {
    if (toast.parentNode) toast.remove();
  }, 3800);
}

function getRiskPillClass(status) {
  if (status === 'OVER_BUDGET') return 'status-pill-danger';
  if (status === 'WASPADA') return 'status-pill-warn';
  return 'status-pill-safe';
}

function getRiskColorVar(status) {
  if (status === 'OVER_BUDGET') return 'var(--color-primary)';
  if (status === 'WASPADA') return 'var(--color-gold)';
  return 'var(--color-safe)';
}

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

// Theme Switcher (Formulasi 1: Light vs Formulasi 2: Dark)
function setTheme(theme) {
  const body = document.getElementById('appBody') || document.body;
  const btnLight = document.getElementById('btnLightMode');
  const btnDark = document.getElementById('btnDarkMode');

  if (theme === 'light') {
    body.classList.remove('theme-dark');
    body.classList.add('theme-light');
    if (btnLight) btnLight.classList.add('active');
    if (btnDark) btnDark.classList.remove('active');
  } else {
    body.classList.remove('theme-light');
    body.classList.add('theme-dark');
    if (btnDark) btnDark.classList.add('active');
    if (btnLight) btnLight.classList.remove('active');
  }
  localStorage.setItem('untad_theme', theme);
}

// Module Tab Switcher (Side Dock & Quick Actions)
function switchModuleTab(tabId) {
  document.querySelectorAll('.dock-btn').forEach((btn) => {
    if (btn.dataset.tab === tabId) {
      btn.classList.add('active');
    } else if (btn.dataset.tab) {
      btn.classList.remove('active');
    }
  });

  document.querySelectorAll('.tab-panel').forEach((panel) => {
    panel.classList.remove('active');
  });

  const target = document.getElementById(tabId);
  if (target) {
    target.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

// Update User UI State
function updateAuthUI() {
  const statusText = document.getElementById('userStatusText');
  const roleBadge = document.getElementById('userRoleBadge');
  const avatarText = document.getElementById('userAvatarText');
  const btnLogin = document.getElementById('btnLoginModal');
  const btnLogout = document.getElementById('btnLogout');
  const btnDockLogout = document.getElementById('btnDockLogout');

  if (currentUser) {
    if (statusText) statusText.textContent = `${currentUser.fullName} (${currentUser.role.toUpperCase()})`;
    if (roleBadge) roleBadge.textContent = currentUser.role.toUpperCase();
    if (avatarText) {
      const initials = currentUser.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
      avatarText.textContent = initials || 'UN';
    }
    if (btnLogin) btnLogin.classList.add('hidden');
    if (btnLogout) btnLogout.classList.remove('hidden');
    if (btnDockLogout) btnDockLogout.classList.remove('hidden');
  } else {
    if (statusText) statusText.textContent = 'Mode Tamu (Read-Only)';
    if (roleBadge) roleBadge.textContent = 'GUEST';
    if (avatarText) avatarText.textContent = 'UN';
    if (btnLogin) btnLogin.classList.remove('hidden');
    if (btnLogout) btnLogout.classList.add('hidden');
    if (btnDockLogout) btnDockLogout.classList.add('hidden');
  }
}

// Quick Category Selector for Dashboard Fast Expense
function setQuickCategory(category, el) {
  selectedQuickCategory = category;
  document.querySelectorAll('#quickCategoryChips .cat-chip').forEach(c => c.classList.remove('active'));
  if (el) el.classList.add('active');
}

function bukaModalExpenseFast() {
  bukaModal('expenseModal');
}

function renderCategoryChart(rincianPerKategori = {}) {
  const container = document.getElementById('chartBarsContainer');
  if (!container) return;

  const definitions = [
    { key: 'belanja', shortLabel: 'Blj', title: 'Belanja / Logistik' },
    { key: 'transportasi', shortLabel: 'Trn', title: 'Transportasi' },
    { key: 'akomodasi', shortLabel: 'Akm', title: 'Akomodasi' },
    { key: 'konsumsi', shortLabel: 'Kns', title: 'Konsumsi' },
    { key: 'hiburan', shortLabel: 'Keg', title: 'Kegiatan / Seminar' },
    { key: 'lainnya', shortLabel: 'Lny', title: 'Lainnya' }
  ];

  const entries = definitions.map((def) => ({
    ...def,
    totalIDR: rincianPerKategori[def.key]?.totalIDR || 0,
    count: rincianPerKategori[def.key]?.count || 0
  }));

  const maxTotal = Math.max(...entries.map((e) => e.totalIDR), 1);
  container.innerHTML = '';

  entries.forEach((entry) => {
    const isMax = entry.totalIDR > 0 && entry.totalIDR === maxTotal;
    const heightPx = entry.totalIDR > 0
      ? Math.max(12, Math.round((entry.totalIDR / maxTotal) * 56))
      : 8;

    const col = document.createElement('div');
    col.className = 'bar-col';
    col.title = `${entry.title}: Rp ${entry.totalIDR.toLocaleString('id-ID')} (${entry.count} transaksi)`;

    const pill = document.createElement('div');
    pill.className = isMax ? 'bar-pill active' : 'bar-pill';
    pill.style.height = `${heightPx}px`;

    const label = document.createElement('span');
    label.className = 'bar-day';
    label.textContent = entry.shortLabel;

    col.appendChild(pill);
    col.appendChild(label);
    container.appendChild(col);
  });
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

  // Currency Widget (menggunakan nilai kurs riil dari ExchangeRate-API)
  if (pub && pub.kursValas && pub.kursValas.kursIDRperUSD) {
    const usd = Math.round(pub.kursValas.kursIDRperUSD);
    const jpy = pub.kursValas.kursIDRperJPY !== undefined
      ? Math.round(pub.kursValas.kursIDRperJPY)
      : Math.round(usd / 150);
    const eur = pub.kursValas.kursIDRperEUR !== undefined
      ? Math.round(pub.kursValas.kursIDRperEUR)
      : Math.round(usd * 1.08);
    const usdEl = document.getElementById('rateUSD');
    const jpyEl = document.getElementById('rateJPY');
    const eurEl = document.getElementById('rateEUR');
    if (usdEl) usdEl.textContent = `Rp ${usd.toLocaleString('id-ID')}`;
    if (jpyEl) jpyEl.textContent = `Rp ${jpy.toLocaleString('id-ID')}`;
    if (eurEl) eurEl.textContent = `Rp ${eur.toLocaleString('id-ID')}`;
  }

  // Dynamic Category Bar Chart
  renderCategoryChart(summary.rincianPerKategori || {});

  // Budget Widget
  if (fin) {
    const realEl = document.getElementById('budgetTotalRealisasi');
    const plafonEl = document.getElementById('budgetTotalPlafon');
    if (realEl) realEl.textContent = fin.formatTotalRealisasi;
    if (plafonEl) plafonEl.textContent = `dari Total Pagu: ${fin.formatTotalPlafon}`;

    const chartReal = document.getElementById('chartRealisasiDisplay');
    const chartPercent = document.getElementById('chartPercentDisplay');
    if (chartReal) chartReal.textContent = fin.formatTotalRealisasi;
    if (chartPercent) chartPercent.textContent = `↗ ${fin.persentasePemakaian} Terserap dari Pagu`;

    const pBar = document.getElementById('budgetProgressBar');
    if (pBar) pBar.style.width = fin.persentasePemakaian;

    const remainingSpan = document.getElementById('budgetRemainingText');
    if (remainingSpan) {
      remainingSpan.textContent = `Total Pagu: ${fin.formatTotalPlafon} • Sisa: ${fin.formatSisaAnggaran} • ${fin.statusRisiko}`;
    }

    const badge = document.getElementById('budgetRiskBadge');
    if (badge) {
      badge.textContent = fin.statusRisiko;
      badge.className = `${fin.statusRisiko === 'AMAN' ? 'status-pill-safe' : 'badge-deprecated'} hidden`;
    }
  }
}

function updateFastPoskoSummary(activityId) {
  const act = cachedActivities.find((a) => String(a.id) === String(activityId)) || cachedActivities[0];
  if (!act) return;
  const fastSub = document.getElementById('fastPoskoSub');
  const fastAvatar = document.getElementById('fastPoskoAvatar');
  if (fastSub) {
    fastSub.textContent = `${act.location} • Sisa Pagu: ${act.financialSummary?.formatSisaAnggaran || 'Rp 0'}`;
  }
  if (fastAvatar) {
    const initials = (act.title || 'PK')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase();
    fastAvatar.textContent = initials || 'PK';
  }
}

// 2. Load Activities
async function loadActivities() {
  const grid = document.getElementById('activitiesGrid');
  const selectAct = document.getElementById('expenseActivitySelect');
  const fastSelect = document.getElementById('fastPoskoSelect');
  const miniList = document.getElementById('miniPoskoList');
  const res = await apiRequest('/v2/activities');

  if (!res.ok || !res.data) {
    if (grid) grid.innerHTML = '<div class="empty-state">Gagal memuat data kegiatan riset.</div>';
    return;
  }

  const activities = res.data.data;
  cachedActivities = activities;

  const previousFastVal = fastSelect ? fastSelect.value : '';
  if (grid) grid.innerHTML = '';
  if (selectAct) selectAct.innerHTML = '<option value="">-- Pilih Kegiatan Riset --</option>';
  if (fastSelect) fastSelect.innerHTML = '';

  // Populate fast posko selector on dashboard
  if (fastSelect && activities.length > 0) {
    activities.forEach((act) => {
      const opt = document.createElement('option');
      opt.value = String(act.id);
      opt.textContent = act.title;
      fastSelect.appendChild(opt);
    });
    const stillExists = activities.some((a) => String(a.id) === previousFastVal);
    fastSelect.value = stillExists ? previousFastVal : String(activities[0].id);
    updateFastPoskoSummary(fastSelect.value);
  }

  // Populate mini posko list on dashboard
  if (miniList && activities.length > 0) {
    miniList.innerHTML = '';
    activities.slice(0, 3).forEach((act) => {
      const statusRisiko = act.financialSummary?.statusRisiko || 'AMAN';
      const item = document.createElement('div');
      item.className = 'posko-item';
      item.innerHTML = `
        <div class="posko-left">
          <div class="posko-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          </div>
          <div>
            <div class="posko-name">${escapeHtml(act.title)}</div>
            <div class="posko-loc">${escapeHtml(act.location)} • ${escapeHtml(act.leadResearcher)}</div>
          </div>
        </div>
        <div style="text-align:right;">
          <div class="posko-budget">${escapeHtml(act.financialSummary?.formatPlafon || 'Rp 0')}</div>
          <div class="posko-status" style="color:${getRiskColorVar(statusRisiko)}">${escapeHtml(statusRisiko)}</div>
        </div>
      `;
      miniList.appendChild(item);
    });
  }

  activities.forEach((act) => {
    // Dropdown option
    if (selectAct) {
      const opt = document.createElement('option');
      opt.value = act.id;
      opt.textContent = `[ID ${act.id}] ${act.title} (${act.location})`;
      selectAct.appendChild(opt);
    }

    // Activity Card element
    const fin = act.financialSummary;
    const card = document.createElement('article');
    card.className = 'activity-card';
    card.innerHTML = `
      <div>
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:0.5rem; margin-bottom:0.5rem;">
          <h3 class="activity-card-title">${escapeHtml(act.title)}</h3>
          <span class="${getRiskPillClass(fin.statusRisiko)}">${escapeHtml(fin.statusRisiko)}</span>
        </div>
        <div class="activity-card-geo">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          <span>${escapeHtml(act.location)}</span>
        </div>
        <div class="weather-badge-pill">
          <span>Stasiun Cuaca:</span>
          <strong>${act.currentWeather ? escapeHtml(`${act.currentWeather.condition} (${act.currentWeather.temperatureFormatted})`) : 'Normal'}</strong>
        </div>
        <p class="activity-desc">${escapeHtml(act.description || '')}</p>
        <div class="activity-meta-row">
          <span>Ketua: <strong>${escapeHtml(act.leadResearcher)}</strong> | Unit: ${escapeHtml(act.unit)}</span>
        </div>
      </div>
      <div>
        <div style="display:flex; justify-content:space-between; font-size:0.8rem; font-weight:600; margin-bottom:0.35rem;">
          <span style="color:var(--text-sub);">Realisasi: <strong style="color:var(--color-cyan); font-family:var(--font-mono);">${escapeHtml(fin.formatRealisasi)}</strong></span>
          <span style="color:var(--text-muted); font-family:var(--font-mono);">Plafon: ${escapeHtml(fin.formatPlafon)}</span>
        </div>
        <div class="progress-container" role="progressbar" aria-label="Penyerapan Dana Riset">
          <div class="progress-bar-fill" style="width: ${escapeHtml(fin.usagePercentage)};"></div>
        </div>
        <div style="font-size:0.775rem; color:var(--text-muted); display:flex; justify-content:space-between; margin-top:0.45rem;">
          <span>${Number(fin.jumlahPengeluaran) || 0} Transaksi</span>
          <span>Sisa: <strong style="color:${getRiskColorVar(fin.statusRisiko)}; font-family:var(--font-mono);">${escapeHtml(fin.formatSisaAnggaran)}</strong></span>
        </div>
      </div>
    `;
    if (grid) grid.appendChild(card);
  });
}

// 3. Load Expenses
async function loadExpenses(categoryFilter = '') {
  const tbody = document.getElementById('expensesTableBody');
  const recentList = document.getElementById('recentTransactionsList');

  let url = '/v2/expenses';
  if (categoryFilter) url += `?category=${encodeURIComponent(categoryFilter)}`;

  const res = await apiRequest(url);
  if (!res.ok || !res.data) {
    if (tbody) tbody.innerHTML = '<tr><td colspan="9" class="cell-center">Gagal memuat pengeluaran.</td></tr>';
    return;
  }

  const items = res.data.data;
  if (!items || items.length === 0) {
    if (tbody) tbody.innerHTML = '<tr><td colspan="9" class="cell-center">Belum ada catatan transaksi tersimpan.</td></tr>';
    return;
  }

  // Update Recent Transactions on Bento Dashboard
  if (recentList && items.length > 0) {
    recentList.innerHTML = '';
    items.slice(0, 3).forEach((item) => {
      const row = document.createElement('div');
      row.className = 'transaction-row';
      const initials = item.submittedBy ? item.submittedBy.substring(0, 2).toUpperCase() : 'TX';
      row.innerHTML = `
        <div class="tx-left">
          <div class="tx-avatar">${escapeHtml(initials)}</div>
          <div>
            <div class="tx-title">${escapeHtml(item.title)}</div>
            <div class="tx-time">${escapeHtml(item.date)} • ${escapeHtml(item.submittedBy)}</div>
          </div>
        </div>
        <div class="tx-amount neg">-${escapeHtml(item.cost.formatRupiah)}</div>
      `;
      recentList.appendChild(row);
    });
  }

  if (tbody) {
    tbody.innerHTML = '';
    const deleteTooltip = currentUser?.role === 'admin'
      ? 'Hapus transaksi pengeluaran'
      : 'Khusus Role Admin (klik untuk uji penolakan RBAC 403)';
    items.forEach((item) => {
      const safeId = Number(item.id);
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><span class="id-tag">#${safeId}</span></td>
        <td>
          <strong style="color:var(--text-main); font-size:0.875rem;">${escapeHtml(item.title)}</strong>
          ${item.notes ? `<div style="font-size:0.75rem; color:var(--text-muted); margin-top:0.15rem;">${escapeHtml(item.notes)}</div>` : ''}
        </td>
        <td>
          <span style="color:var(--color-cyan); font-weight:600; font-size:0.825rem;">${escapeHtml(item.activity.title)}</span>
          <div style="font-size:0.75rem; color:var(--text-muted);">📍 ${escapeHtml(item.activity.location)}</div>
        </td>
        <td><span class="category-chip">${escapeHtml(item.category)}</span></td>
        <td><span class="amount-raw">${escapeHtml(item.cost.amount.toLocaleString('id-ID'))} ${escapeHtml(item.cost.currency)}</span></td>
        <td>
          <div class="amount-idr">${escapeHtml(item.cost.formatRupiah)}</div>
          <div style="font-size:0.725rem; color:var(--text-muted); font-family:var(--font-mono);">${escapeHtml(item.cost.kursPerSatuan)}</div>
        </td>
        <td style="font-family:var(--font-mono); font-size:0.8rem; color:var(--text-sub);">${escapeHtml(item.date)}</td>
        <td style="font-size:0.775rem; color:var(--text-muted);">${escapeHtml(item.submittedBy)}</td>
        <td>
          <button type="button" class="btn-micro" title="${escapeHtml(deleteTooltip)}" style="color:#fca5a5; border-color:rgba(244,63,94,0.3);" onclick="hapusExpense(${safeId})">Hapus</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }
}

// 4. Delete Expense Handler
async function hapusExpense(id) {
  if (!confirm(`Apakah Anda yakin ingin menghapus pengeluaran ID #${id}?`)) return;

  const res = await apiRequest(`/v2/expenses/${id}`, {
    method: 'DELETE'
  });

  if (!res.ok) {
    showToast(`Gagal menghapus: ${res.data?.error || 'Akses ditolak (butuh role admin)'}`, 'error');
    return;
  }

  showToast(res.data.pesan, 'success');
  loadExpenses();
  loadActivities();
  loadSummaryWidgets();
}

// 5. Test Sunset v1 & Active v2
document.getElementById('btnTestV1')?.addEventListener('click', async () => {
  const box = document.getElementById('resBoxV1');
  if (box) box.textContent = 'Menghubungi GET /v1/expenses...';

  try {
    const res = await fetch('/v1/expenses', {
      headers: {
        'x-api-key': API_KEY
      }
    });
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
    const headers = {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY
    };
    if (currentToken) {
      headers['Authorization'] = `Bearer ${currentToken}`;
    }

    const res = await fetch('/graphql', {
      method: 'POST',
      headers,
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
    showToast(`Login Gagal: ${res.data?.pesan || res.data?.error || 'Periksa kredensial'}`, 'error');
    return;
  }

  currentToken = res.data.token;
  currentUser = res.data.user;
  sessionStorage.setItem('untad_token', currentToken);
  sessionStorage.setItem('untad_user', JSON.stringify(currentUser));

  updateAuthUI();
  loadExpenses();
  tutupModal('loginModal');
  showToast(`Selamat datang, ${currentUser.fullName} (${currentUser.role})!`, 'success');
});

async function handleLogout() {
  if (currentToken) {
    await apiRequest('/v2/auth/logout', { method: 'POST' }).catch(() => null);
  }
  currentToken = null;
  currentUser = null;
  sessionStorage.removeItem('untad_token');
  sessionStorage.removeItem('untad_user');
  updateAuthUI();
  loadExpenses();
  showToast('Anda telah keluar dari sistem.', 'info');
}

document.getElementById('btnLogout')?.addEventListener('click', handleLogout);
document.getElementById('btnDockLogout')?.addEventListener('click', handleLogout);

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
    showToast(`Gagal (${res.status}): ${res.data?.error || 'Kesalahan input'}`, 'error');
    return;
  }

  showToast(res.data.pesan, 'success');
  tutupModal('expenseModal');
  document.getElementById('formExpense').reset();
  loadExpenses();
  loadActivities();
  loadSummaryWidgets();
});

document.getElementById('fastPoskoSelect')?.addEventListener('change', (e) => {
  updateFastPoskoSummary(e.target.value);
});

// Fast Expense Quick Submit (Dashboard Column 3)
document.getElementById('btnQuickSubmitExpense')?.addEventListener('click', async () => {
  if (!currentToken) {
    showToast('Harap login terlebih dahulu untuk mencatat pengeluaran.', 'warning');
    bukaModal('loginModal');
    return;
  }

  const fastSelect = document.getElementById('fastPoskoSelect');
  const selectedId = fastSelect ? Number(fastSelect.value) : 0;
  const actId = selectedId > 0 ? selectedId : (cachedActivities.length > 0 ? cachedActivities[0].id : 1);
  const amount = Number(document.getElementById('quickExpenseAmount').value);
  const currency = document.getElementById('quickExpenseCurrency').value;
  const notesInput = document.getElementById('quickExpenseNotes');
  const notes = notesInput ? notesInput.value.trim() : '';

  if (!amount || amount <= 0) {
    showToast('Masukkan nominal pengeluaran yang valid.', 'warning');
    return;
  }
  if (!notes) {
    showToast('Isi catatan atau keperluan riset terlebih dahulu.', 'warning');
    notesInput?.focus();
    return;
  }

  const payload = {
    activityId: actId,
    title: notes,
    category: selectedQuickCategory,
    currency: currency,
    amount: amount,
    date: new Date().toISOString().split('T')[0],
    notes: notes
  };

  const res = await apiRequest('/v2/expenses', {
    method: 'POST',
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    showToast(`Gagal (${res.status}): ${res.data?.error || 'Kesalahan input'}`, 'error');
    return;
  }

  if (notesInput) notesInput.value = '';
  showToast(res.data.pesan || 'Pengeluaran berhasil dicatat ke REST API v2!', 'success');
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
    showToast(`Gagal (${res.status}): ${res.data?.error || res.data?.pesan || 'Gagal menyimpan kegiatan'}`, 'error');
    return;
  }

  showToast(res.data.pesan || 'Kegiatan riset berhasil ditambahkan!', 'success');
  tutupModal('activityModal');
  document.getElementById('formActivity').reset();
  loadActivities();
  loadSummaryWidgets();
});

// Tab Switching (Dock Buttons)
document.querySelectorAll('.dock-btn[data-tab]').forEach((btn) => {
  btn.addEventListener('click', () => {
    switchModuleTab(btn.dataset.tab);
  });
});

// Quick Action Triggers on Bento Dashboard
document.getElementById('quickActionExpense')?.addEventListener('click', () => {
  if (!currentToken) {
    showToast('Harap login terlebih dahulu untuk mencatat pengeluaran.', 'warning');
    bukaModal('loginModal');
  } else {
    bukaModal('expenseModal');
  }
});

document.getElementById('quickActionActivity')?.addEventListener('click', () => {
  if (!currentToken) {
    showToast('Harap login terlebih dahulu sebagai "admin" untuk menambah kegiatan riset.', 'warning');
    bukaModal('loginModal');
    return;
  }
  if (!currentUser || currentUser.role !== 'admin') {
    showToast('Akses Ditolak: Hanya akun dengan role "admin" (Dosen/Keuangan) yang berwenang menambah kegiatan riset.', 'error');
    return;
  }
  bukaModal('activityModal');
});

// Button Modal Triggers
document.getElementById('btnLoginModal')?.addEventListener('click', () => bukaModal('loginModal'));
document.getElementById('btnTambahExpenseModal')?.addEventListener('click', () => {
  if (!currentToken) {
    showToast('Harap login terlebih dahulu untuk menambahkan pengeluaran.', 'warning');
    bukaModal('loginModal');
  } else {
    bukaModal('expenseModal');
  }
});
document.getElementById('btnTambahKegiatanModal')?.addEventListener('click', () => {
  if (!currentToken) {
    showToast('Harap login terlebih dahulu sebagai "admin" untuk menambah kegiatan riset.', 'warning');
    bukaModal('loginModal');
    return;
  }
  if (!currentUser || currentUser.role !== 'admin') {
    showToast('Akses Ditolak: Hanya akun dengan role "admin" (Dosen/Keuangan) yang berwenang menambah kegiatan riset.', 'error');
    return;
  }
  bukaModal('activityModal');
});

document.getElementById('filterCategory')?.addEventListener('change', (e) => {
  loadExpenses(e.target.value);
});

// Init on Load
window.addEventListener('DOMContentLoaded', () => {
  // Restore saved theme or default to dark
  const savedTheme = localStorage.getItem('untad_theme') || 'dark';
  setTheme(savedTheme);

  const savedUser = sessionStorage.getItem('untad_user');
  if (savedUser && currentToken) {
    try {
      currentUser = JSON.parse(savedUser);
      updateAuthUI();
    } catch (e) {
      sessionStorage.removeItem('untad_user');
      sessionStorage.removeItem('untad_token');
      currentToken = null;
    }
  }

  const today = new Date().toISOString().split('T')[0];
  const dateInput = document.getElementById('expenseDate');
  if (dateInput) dateInput.value = today;

  loadSummaryWidgets();
  loadActivities();
  loadExpenses();
});
