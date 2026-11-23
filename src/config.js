const path = require('path');
const fs = require('fs');

// Simple .env parser without external dependencies (pure Node.js)
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.substring(0, idx).trim();
        const val = trimmed.substring(idx + 1).trim();
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  });
}

module.exports = {
  PORT: parseInt(process.env.PORT, 10) || 3000,
  API_KEY: process.env.API_KEY || 'untad-api-key-2026',
  JWT_SECRET: process.env.JWT_SECRET || 'untad-rahasia-rekayasa-api-sub-cpmk-5-kelompok-2',
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATA_DIR: path.join(__dirname, '..', 'data'),
  FILES: {
    ACTIVITIES: path.join(__dirname, '..', 'data', 'activities.json'),
    EXPENSES: path.join(__dirname, '..', 'data', 'expenses.json'),
    USERS: path.join(__dirname, '..', 'data', 'users.json')
  }
};
