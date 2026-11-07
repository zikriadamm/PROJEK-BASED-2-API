const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const CLI_PATH = 'd:\\DESAIN\\tools\\figcraft\\figcraft-cli.exe';
const OUT_FILE = 'untad-research-luxury.figcraft';
const PNG_FILE = 'figcraft-preview.png';

const commands = [
  // 1. Root Desktop Frame (1440 x 960)
  {
    command: 'frame.create',
    params: {
      name: 'Untad Field Research Portal — Vanguard Agency Tier',
      x: 0,
      y: 0,
      width: 1440,
      height: 960,
      props: {
        fill: '#040711'
      }
    }
  },
  // Ambient radial glow top
  {
    command: 'node.create',
    params: {
      type: 'ellipse',
      parent: 2,
      name: 'Ambient Glow Cyan',
      x: 320,
      y: -120,
      width: 800,
      height: 380,
      props: {
        fill: '#0284c7',
        opacity: 0.12
      }
    }
  },
  // Ambient radial glow bottom right
  {
    command: 'node.create',
    params: {
      type: 'ellipse',
      parent: 2,
      name: 'Ambient Glow Emerald',
      x: 900,
      y: 650,
      width: 500,
      height: 350,
      props: {
        fill: '#10b981',
        opacity: 0.08
      }
    }
  },

  // ==================== 2. FLOATING ISLAND NAVBAR ====================
  // Outer glass pill
  {
    command: 'node.create',
    params: {
      type: 'rectangle',
      parent: 2,
      name: 'Floating Island Nav',
      x: 180,
      y: 24,
      width: 1080,
      height: 58,
      props: {
        fill: '#0a101f',
        stroke: '#1e293b',
        strokeWeight: 1,
        cornerRadius: 29
      }
    }
  },
  // Brand Shield Monogram
  {
    command: 'node.create',
    params: {
      type: 'rectangle',
      parent: 2,
      name: 'Brand Shield',
      x: 196,
      y: 33,
      width: 40,
      height: 40,
      props: {
        fill: '#0284c7',
        cornerRadius: 12
      }
    }
  },
  {
    command: 'text.create',
    params: {
      parent: 2,
      name: 'Brand Monogram Text',
      text: 'FT',
      x: 206,
      y: 43,
      props: {
        fontFamily: 'Space Grotesk',
        fontSize: 16,
        fill: '#ffffff'
      }
    }
  },
  // Brand Title
  {
    command: 'text.create',
    params: {
      parent: 2,
      name: 'Brand Title Text',
      text: 'UNTAD RESEARCH',
      x: 248,
      y: 37,
      props: {
        fontFamily: 'Space Grotesk',
        fontSize: 13,
        fill: '#ffffff'
      }
    }
  },
  {
    command: 'text.create',
    params: {
      parent: 2,
      name: 'Brand Subtitle Text',
      text: 'SUB-CPMK 5 • STANDAR INDUSTRI',
      x: 248,
      y: 54,
      props: {
        fontFamily: 'Plus Jakarta Sans',
        fontSize: 8,
        fill: '#64748b'
      }
    }
  },
  // User Mode Capsule
  {
    command: 'node.create',
    params: {
      type: 'rectangle',
      parent: 2,
      name: 'User Mode Capsule',
      x: 885,
      y: 35,
      width: 195,
      height: 36,
      props: {
        fill: '#131d36',
        stroke: '#1e293b',
        strokeWeight: 1,
        cornerRadius: 18
      }
    }
  },
  {
    command: 'text.create',
    params: {
      parent: 2,
      name: 'User Status Text',
      text: 'Mode Tamu (Read-Only)',
      x: 908,
      y: 45,
      props: {
        fontFamily: 'Plus Jakarta Sans',
        fontSize: 10.5,
        fill: '#94a3b8'
      }
    }
  },
  // Login Button Pill
  {
    command: 'node.create',
    params: {
      type: 'rectangle',
      parent: 2,
      name: 'Login Pill Button',
      x: 1095,
      y: 35,
      width: 150,
      height: 36,
      props: {
        fill: '#0284c7',
        cornerRadius: 18
      }
    }
  },
  {
    command: 'text.create',
    params: {
      parent: 2,
      name: 'Login Text',
      text: 'Masuk / Login →',
      x: 1120,
      y: 45,
      props: {
        fontFamily: 'Plus Jakarta Sans',
        fontSize: 11,
        fill: '#ffffff'
      }
    }
  },

  // ==================== 3. HERO SECTION ====================
  // Eyebrow Pill
  {
    command: 'node.create',
    params: {
      type: 'rectangle',
      parent: 2,
      name: 'Hero Eyebrow Pill',
      x: 480,
      y: 105,
      width: 480,
      height: 26,
      props: {
        fill: '#0a1a36',
        stroke: '#0284c7',
        strokeWeight: 1,
        cornerRadius: 13
      }
    }
  },
  {
    command: 'text.create',
    params: {
      parent: 2,
      name: 'Eyebrow Text',
      text: 'FAKULTAS TEKNIK UNIVERSITAS TADULAKO • SULAWESI TENGAH',
      x: 504,
      y: 112,
      props: {
        fontFamily: 'Plus Jakarta Sans',
        fontSize: 8.5,
        fill: '#38bdf8'
      }
    }
  },
  // Hero Heading
  {
    command: 'text.create',
    params: {
      parent: 2,
      name: 'Hero Title',
      text: 'Sistem Manajemen Biaya & Logistik Ekspedisi Riset Lapangan',
      x: 290,
      y: 140,
      props: {
        fontFamily: 'Plus Jakarta Sans',
        fontSize: 28,
        fill: '#ffffff'
      }
    }
  },
  {
    command: 'text.create',
    params: {
      parent: 2,
      name: 'Hero Subtitle',
      text: 'Arsitektur backend HTTP murni terintegrasi Public API cuaca real-time kampus Untad, valas live, dan GraphQL berstandar industri.',
      x: 320,
      y: 182,
      props: {
        fontFamily: 'Plus Jakarta Sans',
        fontSize: 12,
        fill: '#94a3b8'
      }
    }
  },

  // ==================== 4. TELEMETRY WIDGETS (DOUBLE-BEZEL) ====================
  // --- WIDGET 1: WEATHER OPEN-METEO ---
  // Outer Bezel
  {
    command: 'node.create',
    params: {
      type: 'rectangle',
      parent: 2,
      name: 'Weather Outer Bezel',
      x: 180,
      y: 220,
      width: 345,
      height: 155,
      props: {
        fill: '#0c1429',
        stroke: '#1e293b',
        strokeWeight: 1,
        cornerRadius: 22
      }
    }
  },
  // Inner Core
  {
    command: 'node.create',
    params: {
      type: 'rectangle',
      parent: 2,
      name: 'Weather Inner Core',
      x: 186,
      y: 226,
      width: 333,
      height: 143,
      props: {
        fill: '#080d1e',
        cornerRadius: 17
      }
    }
  },
  {
    command: 'text.create',
    params: {
      parent: 2,
      name: 'Weather Tag',
      text: 'PUBLIC API 1: OPEN-METEO',
      x: 202,
      y: 240,
      props: {
        fontFamily: 'Space Grotesk',
        fontSize: 9,
        fill: '#38bdf8'
      }
    }
  },
  {
    command: 'text.create',
    params: {
      parent: 2,
      name: 'Weather Status Dot',
      text: '● LIVE DATA',
      x: 442,
      y: 240,
      props: {
        fontFamily: 'Space Grotesk',
        fontSize: 9,
        fill: '#10b981'
      }
    }
  },
  {
    command: 'text.create',
    params: {
      parent: 2,
      name: 'Weather Temp',
      text: '31.5°C',
      x: 202,
      y: 265,
      props: {
        fontFamily: 'Space Grotesk',
        fontSize: 34,
        fill: '#ffffff'
      }
    }
  },
  {
    command: 'text.create',
    params: {
      parent: 2,
      name: 'Weather Cond',
      text: 'Cerah Berawan',
      x: 325,
      y: 272,
      props: {
        fontFamily: 'Plus Jakarta Sans',
        fontSize: 13,
        fill: '#ffffff'
      }
    }
  },
  {
    command: 'text.create',
    params: {
      parent: 2,
      name: 'Weather Loc',
      text: 'Kampus Untad Tondo, Palu (Sulteng)',
      x: 325,
      y: 292,
      props: {
        fontFamily: 'Plus Jakarta Sans',
        fontSize: 9.5,
        fill: '#64748b'
      }
    }
  },
  {
    command: 'text.create',
    params: {
      parent: 2,
      name: 'Weather Wind',
      text: '💨 Kecepatan Angin: 10.2 km/h (ONLINE)',
      x: 202,
      y: 340,
      props: {
        fontFamily: 'Plus Jakarta Sans',
        fontSize: 9.5,
        fill: '#64748b'
      }
    }
  },

  // --- WIDGET 2: EXCHANGERATE VALAS ---
  // Outer Bezel
  {
    command: 'node.create',
    params: {
      type: 'rectangle',
      parent: 2,
      name: 'Rate Outer Bezel',
      x: 545,
      y: 220,
      width: 345,
      height: 155,
      props: {
        fill: '#0c1429',
        stroke: '#1e293b',
        strokeWeight: 1,
        cornerRadius: 22
      }
    }
  },
  // Inner Core
  {
    command: 'node.create',
    params: {
      type: 'rectangle',
      parent: 2,
      name: 'Rate Inner Core',
      x: 551,
      y: 226,
      width: 333,
      height: 143,
      props: {
        fill: '#080d1e',
        cornerRadius: 17
      }
    }
  },
  {
    command: 'text.create',
    params: {
      parent: 2,
      name: 'Rate Tag',
      text: 'PUBLIC API 2: EXCHANGERATE',
      x: 567,
      y: 240,
      props: {
        fontFamily: 'Space Grotesk',
        fontSize: 9,
        fill: '#38bdf8'
      }
    }
  },
  {
    command: 'text.create',
    params: {
      parent: 2,
      name: 'Rate Status Dot',
      text: '● ONLINE',
      x: 825,
      y: 240,
      props: {
        fontFamily: 'Space Grotesk',
        fontSize: 9,
        fill: '#10b981'
      }
    }
  },
  {
    command: 'text.create',
    params: {
      parent: 2,
      name: 'Rate USD',
      text: '1 USD\n≈ Rp 16.250',
      x: 567,
      y: 270,
      props: {
        fontFamily: 'Space Grotesk',
        fontSize: 13,
        fill: '#ffffff'
      }
    }
  },
  {
    command: 'text.create',
    params: {
      parent: 2,
      name: 'Rate JPY',
      text: '1 JPY\n≈ Rp 108',
      x: 677,
      y: 270,
      props: {
        fontFamily: 'Space Grotesk',
        fontSize: 13,
        fill: '#ffffff'
      }
    }
  },
  {
    command: 'text.create',
    params: {
      parent: 2,
      name: 'Rate EUR',
      text: '1 EUR\n≈ Rp 17.650',
      x: 777,
      y: 270,
      props: {
        fontFamily: 'Space Grotesk',
        fontSize: 13,
        fill: '#ffffff'
      }
    }
  },
  {
    command: 'text.create',
    params: {
      parent: 2,
      name: 'Rate Footer',
      text: '🏦 Rujukan Resmi Pagu Anggaran Riset Luar Negeri',
      x: 567,
      y: 340,
      props: {
        fontFamily: 'Plus Jakarta Sans',
        fontSize: 9.5,
        fill: '#64748b'
      }
    }
  },

  // --- WIDGET 3: KONSOLIDASI ANGGARAN FT ---
  // Outer Bezel
  {
    command: 'node.create',
    params: {
      type: 'rectangle',
      parent: 2,
      name: 'Budget Outer Bezel',
      x: 910,
      y: 220,
      width: 345,
      height: 155,
      props: {
        fill: '#0c1429',
        stroke: '#1e293b',
        strokeWeight: 1,
        cornerRadius: 22
      }
    }
  },
  // Inner Core
  {
    command: 'node.create',
    params: {
      type: 'rectangle',
      parent: 2,
      name: 'Budget Inner Core',
      x: 916,
      y: 226,
      width: 333,
      height: 143,
      props: {
        fill: '#080d1e',
        cornerRadius: 17
      }
    }
  },
  {
    command: 'text.create',
    params: {
      parent: 2,
      name: 'Budget Tag',
      text: 'KONSOLIDASI PAGU FT UNTAD',
      x: 932,
      y: 240,
      props: {
        fontFamily: 'Space Grotesk',
        fontSize: 9,
        fill: '#10b981'
      }
    }
  },
  // Chip AMAN
  {
    command: 'node.create',
    params: {
      type: 'rectangle',
      parent: 2,
      name: 'Chip Aman',
      x: 1190,
      y: 236,
      width: 48,
      height: 20,
      props: {
        fill: '#064e3b',
        cornerRadius: 10
      }
    }
  },
  {
    command: 'text.create',
    params: {
      parent: 2,
      name: 'Text Chip Aman',
      text: 'AMAN',
      x: 1198,
      y: 241,
      props: {
        fontFamily: 'Space Grotesk',
        fontSize: 8.5,
        fill: '#34d399'
      }
    }
  },
  {
    command: 'text.create',
    params: {
      parent: 2,
      name: 'Budget Total Spent',
      text: 'Rp 10.950.000',
      x: 932,
      y: 265,
      props: {
        fontFamily: 'Space Grotesk',
        fontSize: 25,
        fill: '#ffffff'
      }
    }
  },
  {
    command: 'text.create',
    params: {
      parent: 2,
      name: 'Budget Total Limit',
      text: 'dari Total Pagu: Rp 52.000.000',
      x: 932,
      y: 295,
      props: {
        fontFamily: 'Plus Jakarta Sans',
        fontSize: 10,
        fill: '#64748b'
      }
    }
  },
  // Progress Bar Track
  {
    command: 'node.create',
    params: {
      type: 'rectangle',
      parent: 2,
      name: 'Progress Track',
      x: 932,
      y: 318,
      width: 300,
      height: 6,
      props: {
        fill: '#1e293b',
        cornerRadius: 3
      }
    }
  },
  // Progress Bar Fill (21%)
  {
    command: 'node.create',
    params: {
      type: 'rectangle',
      parent: 2,
      name: 'Progress Fill',
      x: 932,
      y: 318,
      width: 63,
      height: 6,
      props: {
        fill: '#0284c7',
        cornerRadius: 3
      }
    }
  },
  {
    command: 'text.create',
    params: {
      parent: 2,
      name: 'Budget Remaining',
      text: '📊 Sisa Kuota: Rp 41.050.000 (21% Terserap)',
      x: 932,
      y: 340,
      props: {
        fontFamily: 'Plus Jakarta Sans',
        fontSize: 9.5,
        fill: '#10b981'
      }
    }
  },

  // ==================== 5. SEGMENTED TABS CONTROLLER ====================
  {
    command: 'node.create',
    params: {
      type: 'rectangle',
      parent: 2,
      name: 'Tabs Wrapper',
      x: 430,
      y: 400,
      width: 580,
      height: 42,
      props: {
        fill: '#0a101f',
        stroke: '#1e293b',
        strokeWeight: 1,
        cornerRadius: 21
      }
    }
  },
  // Active Tab Pill
  {
    command: 'node.create',
    params: {
      type: 'rectangle',
      parent: 2,
      name: 'Active Tab Pill',
      x: 434,
      y: 404,
      width: 170,
      height: 34,
      props: {
        fill: '#0ea5e926',
        stroke: '#0ea5e966',
        strokeWeight: 1,
        cornerRadius: 17
      }
    }
  },
  {
    command: 'text.create',
    params: {
      parent: 2,
      name: 'Tab 1 Text',
      text: '📍 Kegiatan Riset Untad',
      x: 445,
      y: 414,
      props: {
        fontFamily: 'Plus Jakarta Sans',
        fontSize: 10,
        fill: '#38bdf8'
      }
    }
  },
  {
    command: 'text.create',
    params: {
      parent: 2,
      name: 'Tab 2 Text',
      text: '💳 Rincian Pengeluaran',
      x: 620,
      y: 414,
      props: {
        fontFamily: 'Plus Jakarta Sans',
        fontSize: 10,
        fill: '#94a3b8'
      }
    }
  },
  {
    command: 'text.create',
    params: {
      parent: 2,
      name: 'Tab 3 Text',
      text: '⚡ Sunset /v1',
      x: 775,
      y: 414,
      props: {
        fontFamily: 'Plus Jakarta Sans',
        fontSize: 10,
        fill: '#94a3b8'
      }
    }
  },
  {
    command: 'text.create',
    params: {
      parent: 2,
      name: 'Tab 4 Text',
      text: '🔮 GraphQL',
      x: 885,
      y: 414,
      props: {
        fontFamily: 'Plus Jakarta Sans',
        fontSize: 10,
        fill: '#94a3b8'
      }
    }
  },

  // ==================== 6. RESEARCH ACTIVITY CARDS (BENTO DOUBLE-BEZEL) ====================
  // --- CARD 1: SIGI FAULTLINE ---
  {
    command: 'node.create',
    params: {
      type: 'rectangle',
      parent: 2,
      name: 'Card 1 Outer',
      x: 180,
      y: 465,
      width: 345,
      height: 410,
      props: {
        fill: '#0c1429',
        stroke: '#1e293b',
        strokeWeight: 1,
        cornerRadius: 24
      }
    }
  },
  {
    command: 'node.create',
    params: {
      type: 'rectangle',
      parent: 2,
      name: 'Card 1 Inner',
      x: 186,
      y: 471,
      width: 333,
      height: 398,
      props: {
        fill: '#080d1e',
        cornerRadius: 19
      }
    }
  },
  {
    command: 'text.create',
    params: {
      parent: 2,
      name: 'Card 1 Title',
      text: 'Survei Geologi Sesar Palu-Koro\n& Mitigasi Gempa Sigi',
      x: 202,
      y: 490,
      props: {
        fontFamily: 'Plus Jakarta Sans',
        fontSize: 15,
        fill: '#ffffff'
      }
    }
  },
  {
    command: 'text.create',
    params: {
      parent: 2,
      name: 'Card 1 Loc',
      text: '📍 Kabupaten Sigi, Sulawesi Tengah',
      x: 202,
      y: 535,
      props: {
        fontFamily: 'Plus Jakarta Sans',
        fontSize: 11,
        fill: '#38bdf8'
      }
    }
  },
  // Weather Pill Card 1
  {
    command: 'node.create',
    params: {
      type: 'rectangle',
      parent: 2,
      name: 'Weather Pill Card 1',
      x: 202,
      y: 558,
      width: 250,
      height: 26,
      props: {
        fill: '#131e38',
        stroke: '#1e293b',
        strokeWeight: 1,
        cornerRadius: 13
      }
    }
  },
  {
    command: 'text.create',
    params: {
      parent: 2,
      name: 'Weather Pill 1 Text',
      text: '☁️ Cuaca: Cerah Berawan (31.5°C)',
      x: 215,
      y: 565,
      props: {
        fontFamily: 'Plus Jakarta Sans',
        fontSize: 9.5,
        fill: '#ffffff'
      }
    }
  },
  {
    command: 'text.create',
    params: {
      parent: 2,
      name: 'Card 1 Desc',
      text: 'Pengambilan sampel batuan sesar aktif dan\npemetaan mikrozonasi kebencanaan pasca\ngempa 2018 di lembah Palu-Sigi.',
      x: 202,
      y: 600,
      props: {
        fontFamily: 'Plus Jakarta Sans',
        fontSize: 11,
        fill: '#94a3b8'
      }
    }
  },
  {
    command: 'text.create',
    params: {
      parent: 2,
      name: 'Card 1 PIC',
      text: '👤 Ketua Tim: Ir. Tabita C. Theona, M.T.\n🏢 FT - Jurusan Teknik Sipil & Geologi',
      x: 202,
      y: 675,
      props: {
        fontFamily: 'Plus Jakarta Sans',
        fontSize: 10,
        fill: '#64748b'
      }
    }
  },
  {
    command: 'text.create',
    params: {
      parent: 2,
      name: 'Card 1 Stats',
      text: 'Realisasi: Rp 2.750.000     Plafon: Rp 15.000.000',
      x: 202,
      y: 730,
      props: {
        fontFamily: 'Space Grotesk',
        fontSize: 11,
        fill: '#38bdf8'
      }
    }
  },
  // Progress Track 1
  {
    command: 'node.create',
    params: {
      type: 'rectangle',
      parent: 2,
      name: 'Progress Track 1',
      x: 202,
      y: 755,
      width: 300,
      height: 6,
      props: { fill: '#1e293b', cornerRadius: 3 }
    }
  },
  {
    command: 'node.create',
    params: {
      type: 'rectangle',
      parent: 2,
      name: 'Progress Fill 1',
      x: 202,
      y: 755,
      width: 55,
      height: 6,
      props: { fill: '#0284c7', cornerRadius: 3 }
    }
  },
  {
    command: 'text.create',
    params: {
      parent: 2,
      name: 'Card 1 Bottom Meta',
      text: '2 Transaksi Tercatat • Sisa: Rp 12.250.000',
      x: 202,
      y: 775,
      props: {
        fontFamily: 'Plus Jakarta Sans',
        fontSize: 9.5,
        fill: '#10b981'
      }
    }
  },

  // --- CARD 2: TELUK PALU SENSORS ---
  {
    command: 'node.create',
    params: {
      type: 'rectangle',
      parent: 2,
      name: 'Card 2 Outer',
      x: 545,
      y: 465,
      width: 345,
      height: 410,
      props: {
        fill: '#0c1429',
        stroke: '#1e293b',
        strokeWeight: 1,
        cornerRadius: 24
      }
    }
  },
  {
    command: 'node.create',
    params: {
      type: 'rectangle',
      parent: 2,
      name: 'Card 2 Inner',
      x: 551,
      y: 471,
      width: 333,
      height: 398,
      props: {
        fill: '#080d1e',
        cornerRadius: 19
      }
    }
  },
  {
    command: 'text.create',
    params: {
      parent: 2,
      name: 'Card 2 Title',
      text: 'Riset Pemantauan Sensor Kualitas\nAir & Pesisir Teluk Palu',
      x: 567,
      y: 490,
      props: {
        fontFamily: 'Plus Jakarta Sans',
        fontSize: 15,
        fill: '#ffffff'
      }
    }
  },
  {
    command: 'text.create',
    params: {
      parent: 2,
      name: 'Card 2 Loc',
      text: '📍 Teluk Palu, Kota Palu, Sulteng',
      x: 567,
      y: 535,
      props: {
        fontFamily: 'Plus Jakarta Sans',
        fontSize: 11,
        fill: '#38bdf8'
      }
    }
  },
  // Weather Pill Card 2
  {
    command: 'node.create',
    params: {
      type: 'rectangle',
      parent: 2,
      name: 'Weather Pill Card 2',
      x: 567,
      y: 558,
      width: 250,
      height: 26,
      props: {
        fill: '#131e38',
        stroke: '#1e293b',
        strokeWeight: 1,
        cornerRadius: 13
      }
    }
  },
  {
    command: 'text.create',
    params: {
      parent: 2,
      name: 'Weather Pill 2 Text',
      text: '☁️ Cuaca: Berawan Tebal (29.8°C)',
      x: 580,
      y: 565,
      props: {
        fontFamily: 'Plus Jakarta Sans',
        fontSize: 9.5,
        fill: '#ffffff'
      }
    }
  },
  {
    command: 'text.create',
    params: {
      parent: 2,
      name: 'Card 2 Desc',
      text: 'Pemasangan telemetry sensor IoT deteksi\npasang surut air laut dan salinitas di\npesisir pantai Talise Kota Palu.',
      x: 567,
      y: 600,
      props: {
        fontFamily: 'Plus Jakarta Sans',
        fontSize: 11,
        fill: '#94a3b8'
      }
    }
  },
  {
    command: 'text.create',
    params: {
      parent: 2,
      name: 'Card 2 PIC',
      text: '👤 Ketua Tim: Muhammad Zikri Adam\n🏢 FT - Teknik Elektro & Informatika',
      x: 567,
      y: 675,
      props: {
        fontFamily: 'Plus Jakarta Sans',
        fontSize: 10,
        fill: '#64748b'
      }
    }
  },
  {
    command: 'text.create',
    params: {
      parent: 2,
      name: 'Card 2 Stats',
      text: 'Realisasi: Rp 4.000.000     Plafon: Rp 12.000.000',
      x: 567,
      y: 730,
      props: {
        fontFamily: 'Space Grotesk',
        fontSize: 11,
        fill: '#38bdf8'
      }
    }
  },
  // Progress Track 2
  {
    command: 'node.create',
    params: {
      type: 'rectangle',
      parent: 2,
      name: 'Progress Track 2',
      x: 567,
      y: 755,
      width: 300,
      height: 6,
      props: { fill: '#1e293b', cornerRadius: 3 }
    }
  },
  {
    command: 'node.create',
    params: {
      type: 'rectangle',
      parent: 2,
      name: 'Progress Fill 2',
      x: 567,
      y: 755,
      width: 100,
      height: 6,
      props: { fill: '#0284c7', cornerRadius: 3 }
    }
  },
  {
    command: 'text.create',
    params: {
      parent: 2,
      name: 'Card 2 Bottom Meta',
      text: '2 Transaksi Tercatat • Sisa: Rp 8.000.000',
      x: 567,
      y: 775,
      props: {
        fontFamily: 'Plus Jakarta Sans',
        fontSize: 9.5,
        fill: '#10b981'
      }
    }
  },

  // --- CARD 3: TOKYO SYMPOSIUM (SUB-CPMK 4 CONTINUITY) ---
  {
    command: 'node.create',
    params: {
      type: 'rectangle',
      parent: 2,
      name: 'Card 3 Outer',
      x: 910,
      y: 465,
      width: 345,
      height: 410,
      props: {
        fill: '#0c1429',
        stroke: '#1e293b',
        strokeWeight: 1,
        cornerRadius: 24
      }
    }
  },
  {
    command: 'node.create',
    params: {
      type: 'rectangle',
      parent: 2,
      name: 'Card 3 Inner',
      x: 916,
      y: 471,
      width: 333,
      height: 398,
      props: {
        fill: '#080d1e',
        cornerRadius: 19
      }
    }
  },
  {
    command: 'text.create',
    params: {
      parent: 2,
      name: 'Card 3 Title',
      text: 'Studi Banding & Konferensi\nInternasional IEEE Tokyo',
      x: 932,
      y: 490,
      props: {
        fontFamily: 'Plus Jakarta Sans',
        fontSize: 15,
        fill: '#ffffff'
      }
    }
  },
  {
    command: 'text.create',
    params: {
      parent: 2,
      name: 'Card 3 Loc',
      text: '📍 Tokyo, Jepang (Valas Sub-CPMK 4)',
      x: 932,
      y: 535,
      props: {
        fontFamily: 'Plus Jakarta Sans',
        fontSize: 11,
        fill: '#38bdf8'
      }
    }
  },
  // Weather Pill Card 3
  {
    command: 'node.create',
    params: {
      type: 'rectangle',
      parent: 2,
      name: 'Weather Pill Card 3',
      x: 932,
      y: 558,
      width: 250,
      height: 26,
      props: {
        fill: '#131e38',
        stroke: '#1e293b',
        strokeWeight: 1,
        cornerRadius: 13
      }
    }
  },
  {
    command: 'text.create',
    params: {
      parent: 2,
      name: 'Weather Pill 3 Text',
      text: '☁️ Cuaca: Sejuk (18.2°C)',
      x: 945,
      y: 565,
      props: {
        fontFamily: 'Plus Jakarta Sans',
        fontSize: 9.5,
        fill: '#ffffff'
      }
    }
  },
  {
    command: 'text.create',
    params: {
      parent: 2,
      name: 'Card 3 Desc',
      text: 'Partisipasi delegasi riset sistem informasi\ncerdas Untad pada IEEE Conference Tokyo\n(kontinuitas data valas Sub-CPMK 4).',
      x: 932,
      y: 600,
      props: {
        fontFamily: 'Plus Jakarta Sans',
        fontSize: 11,
        fill: '#94a3b8'
      }
    }
  },
  {
    command: 'text.create',
    params: {
      parent: 2,
      name: 'Card 3 PIC',
      text: '👤 Ketua Tim: Lidiya, M.Cs.\n🏢 FT - Jurusan Teknik Informatika Untad',
      x: 932,
      y: 675,
      props: {
        fontFamily: 'Plus Jakarta Sans',
        fontSize: 10,
        fill: '#64748b'
      }
    }
  },
  {
    command: 'text.create',
    params: {
      parent: 2,
      name: 'Card 3 Stats',
      text: 'Realisasi: Rp 4.200.000     Plafon: Rp 25.000.000',
      x: 932,
      y: 730,
      props: {
        fontFamily: 'Space Grotesk',
        fontSize: 11,
        fill: '#38bdf8'
      }
    }
  },
  // Progress Track 3
  {
    command: 'node.create',
    params: {
      type: 'rectangle',
      parent: 2,
      name: 'Progress Track 3',
      x: 932,
      y: 755,
      width: 300,
      height: 6,
      props: { fill: '#1e293b', cornerRadius: 3 }
    }
  },
  {
    command: 'node.create',
    params: {
      type: 'rectangle',
      parent: 2,
      name: 'Progress Fill 3',
      x: 932,
      y: 755,
      width: 50,
      height: 6,
      props: { fill: '#0284c7', cornerRadius: 3 }
    }
  },
  {
    command: 'text.create',
    params: {
      parent: 2,
      name: 'Card 3 Bottom Meta',
      text: '4 Transaksi Tercatat • Sisa: Rp 20.800.000',
      x: 932,
      y: 775,
      props: {
        fontFamily: 'Plus Jakarta Sans',
        fontSize: 9.5,
        fill: '#10b981'
      }
    }
  },

  // ==================== 7. FOOTER ====================
  {
    command: 'text.create',
    params: {
      parent: 2,
      name: 'Footer Credits',
      text: 'FT UNTAD • S1 TEKNIK INFORMATIKA • KELOMPOK 3 (Lidiya, Tabita C. Theona, M. Zikri Adam, Trista S. Lambei)',
      x: 370,
      y: 915,
      props: {
        fontFamily: 'Space Grotesk',
        fontSize: 10,
        fill: '#475569'
      }
    }
  }
];

const SCRIPT_FILE = 'build-figcraft.json';
fs.writeFileSync(SCRIPT_FILE, JSON.stringify(commands, null, 2));
console.log(`Script saved to ${SCRIPT_FILE}. Executing FigCraft engine...`);

try {
  execSync(`"${CLI_PATH}" run "${SCRIPT_FILE}" --out "${OUT_FILE}"`, { stdio: 'inherit' });
  console.log(`FigCraft document created: ${OUT_FILE}`);

  execSync(`"${CLI_PATH}" render "${OUT_FILE}" -o "${PNG_FILE}" --scale 2`, { stdio: 'inherit' });
  console.log(`High-resolution preview exported: ${PNG_FILE}`);
} catch (err) {
  console.error('Error generating FigCraft design:', err.message);
}
