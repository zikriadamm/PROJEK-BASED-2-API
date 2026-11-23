// Complete End-to-End Playwright Automation Test for Untad Field Research Expense System
const { chromium } = require('playwright');
const fs = require('fs');

async function runPlaywrightSuite() {
  console.log('================================================================================');
  console.log('  STARTING PLAYWRIGHT END-TO-END AUTOMATION TEST (LOCAL HOST: 3000)');
  console.log('================================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  // Launch browser with installed Chrome or Edge
  let browser;
  try {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    console.log('🌐 Browser engine launched: Google Chrome (Headless)\n');
  } catch (err) {
    console.log('Chrome launch fallback to msedge...');
    browser = await chromium.launch({ channel: 'msedge', headless: true });
    console.log('🌐 Browser engine launched: Microsoft Edge (Headless)\n');
  }

  const context = await browser.newContext({
    viewport: { width: 1440, height: 960 }
  });
  const page = await context.newPage();

  // Dialog listener for alert() and confirm()
  page.on('dialog', async (dialog) => {
    await dialog.accept();
  });

  try {
    // 1. Navigate to Localhost
    console.log('[STEP 1] Navigating to http://localhost:3000');
    const response = await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 10000 });
    assert(response.status() === 200, 'HTTP response is 200 OK');
    
    const title = await page.title();
    assert(title.includes('Untad Field Research'), `Page title loaded: "${title}"`);

    // 2. Check Telemetry Widgets
    console.log('\n[STEP 2] Verifying Live Telemetry Widgets');
    await page.waitForTimeout(1000);
    const weatherTemp = await page.locator('#widgetWeatherTemp').textContent();
    assert(weatherTemp && weatherTemp !== '--°C', `Open-Meteo Weather loaded: ${weatherTemp}`);

    const rateUSD = await page.locator('#rateUSD').textContent();
    assert(rateUSD && rateUSD.includes('Rp'), `ExchangeRate-API Live USD loaded: ${rateUSD}`);

    const budgetTotal = await page.locator('#budgetTotalRealisasi').textContent();
    assert(budgetTotal && budgetTotal.includes('Rp'), `Faculty Budget Realization loaded: ${budgetTotal}`);

    // 3. Test Authentication (Admin Login Flow)
    console.log('\n[STEP 3] Testing Admin Authentication Flow');
    await page.click('#btnLoginModal');
    await page.waitForSelector('#loginModal:not(.hidden)', { timeout: 3000 });
    assert(true, 'Login Modal opened successfully');

    await page.fill('#loginUsername', 'admin');
    await page.fill('#loginPassword', 'admin123');
    await page.click('#formLogin button[type="submit"]');
    await page.waitForTimeout(500);

    const userStatusText = await page.locator('#userStatusText').textContent();
    assert(userStatusText.includes('Administrator') || userStatusText.includes('ADMIN'), `User authenticated as Admin: "${userStatusText}"`);
    const btnLogoutVisible = await page.locator('#btnLogout').isVisible();
    assert(btnLogoutVisible, 'Logout button is now visible in navigation');

    // 4. Test Tab Navigation
    console.log('\n[STEP 4] Testing Tab Switching & Relational Data');
    
    // Tab 2: Expenses
    await page.click('button[data-tab="tabExpenses"]');
    await page.waitForSelector('#tabExpenses.active');
    const expenseRows = await page.locator('#expensesTableBody tr').count();
    assert(expenseRows >= 8, `Expenses Table populated with ${expenseRows} rows`);

    // Tab 3: Sunset Audit & Live Execution
    console.log('\n[STEP 5] Testing RFC 8594 Sunset Header Audit');
    await page.click('button[data-tab="tabSunset"]');
    await page.waitForSelector('#tabSunset.active');
    
    // Test GET /v1
    await page.click('#btnTestV1');
    await page.waitForTimeout(800);
    const resBoxV1 = await page.locator('#resBoxV1').textContent();
    assert(resBoxV1.includes('"httpStatus": 200'), 'GET /v1 returns httpStatus 200');
    assert(resBoxV1.includes('Sunset: Thu, 31 Dec 2026 23:59:59 GMT') || resBoxV1.includes('Thu, 31 Dec 2026'), 'Response header contains RFC Sunset timestamp');
    assert(resBoxV1.includes('"Deprecation": "true"'), 'Response header contains Deprecation: true');

    // Test GET /v2
    await page.click('#btnTestV2');
    await page.waitForTimeout(800);
    const resBoxV2 = await page.locator('#resBoxV2').textContent();
    assert(resBoxV2.includes('"httpStatus": 200'), 'GET /v2 returns httpStatus 200');
    assert(resBoxV2.includes('"versi": "v2"'), 'Response payload confirms v2 relational standard');

    // Tab 4: GraphQL Relational Explorer
    console.log('\n[STEP 6] Testing GraphQL Native Execution');
    await page.click('button[data-tab="tabGraphQL"]');
    await page.waitForSelector('#tabGraphQL.active');
    
    await page.click('#btnRunGraphQL');
    await page.waitForFunction(() => !document.getElementById('gqlResultOutput').textContent.includes('Mengeksekusi'), { timeout: 8000 });
    const gqlOutput = await page.locator('#gqlResultOutput').textContent();
    assert(gqlOutput.includes('"activities"'), 'GraphQL response resolves "activities" collection');
    assert(gqlOutput.includes('"financialSummary"'), 'GraphQL resolves nested financialSummary');
    assert(gqlOutput.includes('"expenses"'), 'GraphQL resolves nested expenses list');

    // 5. Test Adding a Research Activity (Admin Modal)
    console.log('\n[STEP 7] Testing Create Research Activity (Modal Dialog)');
    await page.click('button[data-tab="tabActivities"]');
    await page.waitForSelector('#tabActivities.active');

    await page.click('#btnTambahKegiatanModal');
    await page.waitForSelector('#activityModal:not(.hidden)');
    assert(true, 'Add Activity Modal opened successfully');

    await page.fill('#actTitle', 'Survei Geolistrik Pantai Talise Palu');
    await page.fill('#actLocation', 'Teluk Palu, Sulawesi Tengah');
    await page.fill('#actBudgetLimit', '20000000');
    await page.fill('#actUnit', 'Teknik Geofisika FT Untad');
    await page.fill('#actLeadResearcher', 'Dr. Lidiya, M.T.');
    await page.fill('#actDesc', 'Pengukuran resistivitas sedimen pantai pasca gempa');
    
    await page.click('#formActivity button[type="submit"]');
    await page.waitForFunction(() => document.querySelectorAll('.activity-card').length >= 4, { timeout: 10000 });

    const activitiesCount = await page.locator('.activity-card').count();
    assert(activitiesCount >= 4, `Activity card successfully created! Total cards: ${activitiesCount}`);

    // Take screenshot of working result
    const screenshotPath = 'laporan-dan-arsip/screenshot-verifikasi/playwright-test-result.png';
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`📸 Full-page verification screenshot saved to: ${screenshotPath}`);

    // 6. Cleanup created test activity to keep data seeded
    const activitiesRaw = JSON.parse(fs.readFileSync('./data/activities.json', 'utf8'));
    const filtered = activitiesRaw.filter(a => a.title !== 'Survei Geolistrik Pantai Talise Palu');
    fs.writeFileSync('./data/activities.json', JSON.stringify(filtered, null, 2), 'utf8');
    console.log('🧹 Cleaned up temporary test activity from database');

  } catch (err) {
    console.error('Fatal Playwright Error:', err);
    failed++;
  } finally {
    await browser.close();
  }

  console.log('\n================================================================================');
  console.log(`  PLAYWRIGHT TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('================================================================================\n');

  if (failed > 0) process.exit(1);
  else process.exit(0);
}

runPlaywrightSuite();
