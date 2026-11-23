const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function renderPreviews() {
  console.log('Generating high-resolution previews for Formula 1 & Formula 2...');

  let browser;
  try {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
  } catch (e) {
    browser = await chromium.launch({ channel: 'msedge', headless: true });
  }

  const page = await browser.newPage({
    viewport: { width: 1440, height: 1020 },
    deviceScaleFactor: 2 // 2x Retina quality for ultra crisp UI
  });

  const previewPath = 'file:///' + path.resolve('preview-formulas.html').replace(/\\/g, '/');
  await page.goto(previewPath, { waitUntil: 'networkidle' });

  // 1. Capture Formula 1: Light Mode
  await page.evaluate(() => setTheme('light'));
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'formula1-light-preview.png', fullPage: true });
  console.log('✅ Captured: formula1-light-preview.png');

  // 2. Capture Formula 2: Dark Mode
  await page.evaluate(() => setTheme('dark'));
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'formula2-dark-preview.png', fullPage: true });
  console.log('✅ Captured: formula2-dark-preview.png');

  await browser.close();

  // Copy to artifact directory
  const artifactDir = 'C:/Users/tedon/.gemini/antigravity/brain/8ecaf1b7-8a5d-47d8-b9c1-49ae3528851b';
  fs.copyFileSync('formula1-light-preview.png', path.join(artifactDir, 'formula1-light-preview.png'));
  fs.copyFileSync('formula2-dark-preview.png', path.join(artifactDir, 'formula2-dark-preview.png'));
  console.log('✅ Copied to artifact directory for presentation');
}

renderPreviews().catch(console.error);
