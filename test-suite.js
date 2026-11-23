const { fork } = require('child_process');

// Automated Test Suite for Untad Field Research Expense API
const BASE_URL = 'http://localhost:3000';
const API_KEY = 'untad-api-key-2026';

let passed = 0;
let failed = 0;
let serverProcess = null;

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failed++;
  }
}

async function req(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const res = await fetch(url, {
    ...options,
    headers
  });

  const data = await res.json().catch(() => null);
  return {
    status: res.status,
    headers: res.headers,
    data: data
  };
}

async function ensureServerRunning() {
  try {
    const res = await fetch(`${BASE_URL}/`, { method: 'HEAD' }).catch(() => null);
    if (res) return; // Server already running
  } catch (e) {
    // ignore
  }

  console.log('[INFO] Server lokal belum aktif. Menjalankan server.js untuk pengujian...');
  serverProcess = fork('server.js', [], { stdio: 'ignore' });
  // Wait up to 3 seconds for server to be ready
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 100));
    try {
      const ping = await fetch(`${BASE_URL}/`, { method: 'HEAD' }).catch(() => null);
      if (ping) {
        console.log('[INFO] Server siap di http://localhost:3000\n');
        return;
      }
    } catch (e) {}
  }
}

async function runTests() {
  await ensureServerRunning();

  console.log('================================================================================');
  console.log('  RUNNING COMPLETE INTEGRATION TEST SUITE (SUB-CPMK 5 REKAYASA API)');
  console.log('================================================================================\n');

  let adminToken = '';
  let mhsToken = '';
  let createdExpenseId = null;

  // TEST 1: Login Admin
  console.log('[TEST 1] POST /v2/auth/login (Admin Login)');
  const res1 = await req('/v2/auth/login', {
    method: 'POST',
    headers: { 'x-api-key': API_KEY },
    body: JSON.stringify({ username: 'admin', password: 'admin123' })
  });
  assert(res1.status === 200, 'HTTP status is 200');
  assert(res1.data.sukses === true, 'Response sukses is true');
  assert(typeof res1.data.token === 'string', 'Returned signed HMAC token');
  assert(res1.data.user.role === 'admin', 'User role is admin');
  adminToken = res1.data.token;

  // TEST 2: Login Mahasiswa
  console.log('\n[TEST 2] POST /v2/auth/login (Mahasiswa Login)');
  const res2 = await req('/v2/auth/login', {
    method: 'POST',
    headers: { 'x-api-key': API_KEY },
    body: JSON.stringify({ username: 'mahasiswa', password: 'mhs123' })
  });
  assert(res2.status === 200, 'HTTP status is 200');
  assert(res2.data.user.role === 'mahasiswa', 'User role is mahasiswa');
  mhsToken = res2.data.token;

  // TEST 3: GET /v2/activities (Enrichment with Open-Meteo Weather)
  console.log('\n[TEST 3] GET /v2/activities (Activities with Open-Meteo & Budget Calculation)');
  const res3 = await req('/v2/activities', {
    headers: { 'x-api-key': API_KEY }
  });
  assert(res3.status === 200, 'HTTP status is 200');
  assert(Array.isArray(res3.data.data), 'Returns array of activities');
  assert(res3.data.data.length >= 3, 'Contains master activities for Palu/Sulteng/Tokyo');
  const act1 = res3.data.data[0];
  assert(act1.financialSummary && act1.financialSummary.budgetLimitIDR > 0, 'Contains financial summary');
  assert(act1.currentWeather && act1.currentWeather.temperature !== undefined, 'Contains Open-Meteo weather enrichment');

  // TEST 4: POST /v2/expenses (With Valid activityId & Token)
  console.log('\n[TEST 4] POST /v2/expenses (Create Expense with activityId & Live Currency)');
  const res4 = await req('/v2/expenses', {
    method: 'POST',
    headers: {
      'x-api-key': API_KEY,
      'Authorization': `Bearer ${mhsToken}`
    },
    body: JSON.stringify({
      activityId: 2,
      title: 'Uji Validasi Sensor Arus Teluk Palu',
      category: 'belanja',
      currency: 'IDR',
      amount: 450000,
      date: '2026-11-05',
      notes: 'Pembelian kabel kedap air'
    })
  });
  assert(res4.status === 201, 'HTTP status is 201 Created');
  assert(res4.data.data.activityId === 2, 'Relates to activityId 2');
  assert(res4.data.data.cost.nominalIDR === 450000, 'Calculates cost object correctly');
  createdExpenseId = res4.data.data.id;

  // TEST 5: GET /v1/expenses (Legacy with Sunset Header)
  console.log('\n[TEST 5] GET /v1/expenses (Legacy Sub-CPMK 4 with Sunset Header)');
  const res5 = await req('/v1/expenses', {
    headers: { 'x-api-key': API_KEY }
  });
  assert(res5.status === 200, 'HTTP status is 200');
  const sunsetHeader = res5.headers.get('sunset');
  const deprecationHeader = res5.headers.get('deprecation');
  assert(sunsetHeader && sunsetHeader.includes('31 Dec 2026'), 'Includes RFC Sunset header (31 Dec 2026)');
  assert(deprecationHeader === 'true', 'Includes Deprecation header');
  assert(res5.data.versi && res5.data.versi.includes('v1'), 'Returns legacy v1 data payload');

  // TEST 6: [NEGATIF 1] GET /v2/expenses Tanpa x-api-key (Expected 401)
  console.log('\n[TEST 6] [NEGATIF 1] GET /v2/expenses without API Key');
  const res6 = await req('/v2/expenses', {
    headers: {}
  });
  assert(res6.status === 401, 'HTTP status is 401 Unauthorized');
  assert(res6.data.error.includes('x-api-key'), 'Error specifies missing API key');

  // TEST 7: [NEGATIF 2] DELETE /v2/expenses/1 by Mahasiswa (Expected 403 Forbidden)
  console.log('\n[TEST 7] [NEGATIF 2] DELETE /v2/expenses/1 with Mahasiswa Role (RBAC)');
  const res7 = await req('/v2/expenses/1', {
    method: 'DELETE',
    headers: {
      'x-api-key': API_KEY,
      'Authorization': `Bearer ${mhsToken}`
    }
  });
  assert(res7.status === 403, 'HTTP status is 403 Forbidden');
  assert(res7.data.error.includes('admin'), 'Error blocks non-admin from deletion');

  // TEST 8: [NEGATIF 3] POST /v2/expenses without activityId (Expected 400 Bad Request)
  console.log('\n[TEST 8] [NEGATIF 3] POST /v2/expenses without activityId (Breaking Change Check)');
  const res8 = await req('/v2/expenses', {
    method: 'POST',
    headers: {
      'x-api-key': API_KEY,
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      title: 'Belanja tanpa activityId',
      category: 'konsumsi',
      amount: 100000,
      currency: 'IDR',
      date: '2026-11-01'
    })
  });
  assert(res8.status === 400, 'HTTP status is 400 Bad Request');
  assert(res8.data.error.includes('activityId'), 'Rejects payload without activityId');

  // TEST 9: POST /graphql (Query Nested Activities and Expenses)
  console.log('\n[TEST 9] POST /graphql (Nested Relation Query)');
  const res9 = await req('/graphql', {
    method: 'POST',
    headers: { 'x-api-key': API_KEY },
    body: JSON.stringify({
      query: '{ activities { id title financialSummary { statusRisiko } currentWeather { condition } expenses { id title cost { formatRupiah } } } }'
    })
  });
  assert(res9.status === 200, 'GraphQL HTTP status is 200');
  assert(res9.data.data && Array.isArray(res9.data.data.activities), 'GraphQL returns activities');
  assert(Array.isArray(res9.data.data.activities[0].expenses), 'Activities resolve nested expenses relation');

  // Teardown: Clean up temporary test expense created in TEST 4 using Admin Token
  if (createdExpenseId) {
    const cleanRes = await req(`/v2/expenses/${createdExpenseId}`, {
      method: 'DELETE',
      headers: {
        'x-api-key': API_KEY,
        'Authorization': `Bearer ${adminToken}`
      }
    });
    assert(cleanRes.status === 200, `Teardown: Temporary test expense #${createdExpenseId} cleanly removed`);
  }

  // Summary
  console.log('\n================================================================================');
  console.log(`  TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('================================================================================\n');

  if (serverProcess) {
    serverProcess.kill();
  }

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch((err) => {
  if (serverProcess) serverProcess.kill();
  console.error('Fatal test error:', err);
  process.exit(1);
});
