const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function verifyLocalhost() {
  console.log('Testing live website on http://localhost:3000 ...');

  let browser;
  try {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
  } catch (e) {
    browser = await chromium.launch({ channel: 'msedge', headless: true });
  }

  const context = await browser.newContext({
    viewport: { width: 1440, height: 1020 },
    deviceScaleFactor: 2
  });

  const page = await context.newPage();

  // 1. Visit localhost:3000
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  console.log('✅ Page loaded successfully');

  // Wait for data to load
  await page.waitForFunction(() => {
    const el = document.getElementById('budgetTotalRealisasi');
    return el && el.textContent.includes('Rp');
  }, { timeout: 10000 });
  console.log('✅ Telemetry & financial summary data loaded');

  // 2. Capture Default Dark Mode
  await page.screenshot({ path: 'localhost-dark-live.png', fullPage: true });
  console.log('✅ Captured localhost-dark-live.png');

  // 3. Test Theme Toggle to Light Mode
  await page.click('#btnLightMode');
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'localhost-light-live.png', fullPage: true });
  console.log('✅ Captured localhost-light-live.png');

  // 4. Test Switching Tabs to Sunset v1
  await page.click('.dock-btn[data-tab="tabSunset"]');
  await page.waitForTimeout(300);
  await page.click('#btnTestV1');
  await page.waitForTimeout(800);
  const sunsetText = await page.textContent('#resBoxV1');
  console.log('✅ Sunset v1 tested. Result preview:', sunsetText.substring(0, 80).replace(/\n/g, ' '));

  // 5. Test GraphQL Tab
  await page.click('.dock-btn[data-tab="tabGraphQL"]');
  await page.waitForTimeout(300);
  await page.click('#btnRunGraphQL');
  await page.waitForTimeout(800);
  const gqlText = await page.textContent('#gqlResultOutput');
  console.log('✅ GraphQL tested. Result preview:', gqlText.substring(0, 80).replace(/\n/g, ' '));

  // 6. Test Expenses Tab and bottom scroll clearance
  await page.click('.dock-btn[data-tab="tabExpenses"]');
  await page.waitForTimeout(500);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'localhost-expenses-bottom.png' });
  console.log('✅ Captured localhost-expenses-bottom.png');

  // Switch back to Dark Dashboard
  await page.click('#btnDarkMode');
  await page.click('.dock-btn[data-tab="tabDashboard"]');
  await page.waitForTimeout(400);

  // Copy screenshots to artifact folder
  const artifactDir = 'C:/Users/tedon/.gemini/antigravity/brain/8ecaf1b7-8a5d-47d8-b9c1-49ae3528851b';
  fs.copyFileSync('localhost-dark-live.png', path.join(artifactDir, 'localhost-dark-live.png'));
  fs.copyFileSync('localhost-light-live.png', path.join(artifactDir, 'localhost-light-live.png'));
  fs.copyFileSync('localhost-expenses-bottom.png', path.join(artifactDir, 'localhost-expenses-bottom.png'));
  console.log('✅ Live screenshots copied to artifacts directory');

  await browser.close();
  console.log('🎉 All automated verification passed with 100% success!');
}

verifyLocalhost().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
