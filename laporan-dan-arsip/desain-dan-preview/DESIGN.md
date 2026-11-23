# DESIGN.md — Untad Field Research & Expense System

Dokumentasi sistem desain antarmuka berbasis standar **Impeccable Design Quality & WCAG AA Compliance**.

---

## 1. Design Direction & Mode

* **Mode:** **Operate** — Antarmuka berorientasi tugas untuk mengelola logistik, transaksi keuangan riset lapangan, telemetri cuaca kampus real-time, dan audit reliabilitas API.
* **Prinsip Utama:**
  * **Precision & Restraint:** Menghindari dekorasi berlebihan (tidak ada gradient text, tidak ada pulsing dot imitasi, tidak ada kartu bertumpuk/nested cards).
  * **True Contrast:** Memenuhi rasio kontras WCAG AA (≥ 4.5:1 untuk teks biasa, ≥ 3:1 untuk teks besar/badge).
  * **Browser Surface Craft:** `::selection`, scrollbar custom, focus ring yang jelas untuk navigasi keyboard, serta format `tabular-nums` pada seluruh data angka dan finansial.

---

## 2. Typography

* **UI & Display:** [`Sora`](https://fonts.google.com/specimen/Sora) (Weights: 400, 500, 600, 700, 800)
  * Geometric sans dengan keterbacaan tinggi untuk antarmuka digital dan data teknis.
* **Mono & Numeric:** [`JetBrains Mono`](https://fonts.google.com/specimen/JetBrains+Mono) (Weights: 500, 600, 700)
  * Digunakan untuk ID, koordinat GPS, nilai mata uang, header HTTP, dan editor GraphQL.
* **Banned Fonts:** Inter, Roboto, Arial, Segoe UI, Plus Jakarta Sans, Space Grotesk.
* **Legibility Floor:** Semua teks fungsional interaktif minimal 12px (`0.75rem`), tidak ada teks di bawah batas aman 11px.

---

## 3. Color Palette & Elevation

| Peran | Nilai Warna | Rasio Kontras | Kegunaan |
|---|---|---|---|
| Page Background | `#070b14` | - | Dasar canvas aplikasi |
| Surface Card | `#0e1526` | - | Kontainer utama widget telemetri & tabel |
| Surface Elevated | `#151f35` | - | Kontainer filter, input form, header tabel |
| Text Primary | `#f8fafc` | > 12:1 | Judul, angka utama, teks tombol |
| Text Secondary | `#cbd5e1` | > 8:1 | Deskripsi, nilai tabel, label formulir |
| Text Muted | `#94a3b8` | > 4.8:1 | Meta info, ID tag, satuan |
| Accent Blue (Primary Action) | `#0369a1` | 4.75:1 | Tombol utama, progress bar |
| Accent Cyan (Highlight) | `#38bdf8` | 7.8:1 | Highlight teknis, nominal IDR |
| Accent Emerald (Safe State) | `#10b981` | 5.2:1 | Status pagu aman, v2 active badge |
| Accent Amber (Sunset State) | `#f59e0b` | 4.6:1 | Peringatan /v1 deprecated sunset |
| Accent Rose (Destructive) | `#f43f5e` | 4.5:1 | Tombol hapus, aksi kritis |

---

## 4. Components & Affordances

1. **Header Navigation:**
   * Terpasang `sticky` dengan latar belakang semi-transparan `rgba(14, 21, 38, 0.88)` dan efek `backdrop-filter: blur(16px)`.
   * Menampilkan status pengguna (`guest` / `admin` / `mahasiswa`) dengan dot status solid non-animasi.
2. **Single-Elevation Cards (`.telemetry-card`, `.activity-card`, `.audit-card`):**
   * Menggunakan satu deklarasi elevasi yang konsisten: `border: 1px solid rgba(255, 255, 255, 0.09)` dan `box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3)`.
   * Radius sudut `14px` (`--radius-md`).
   * Tidak ada card bersarang di dalam card (*no nested cards*).
3. **Data Table (`.data-table`):**
   * Berada di dalam `.table-container` dengan padding `0.5rem` agar border sel tidak menempel (*no cramped padding*).
   * Nilai nominal menggunakan font mono dengan `tabular-nums` untuk perataan vertikal yang presisi.
4. **Modal Dialog (`.modal-card`):**
   * Modal terfokus dengan overlay gelap `rgba(4, 7, 14, 0.75)` dan blur 10px.
   * Dilengkapi tombol tutup `&times;` dengan label `aria-label="Tutup Modal"`.

---

## 5. Verification & Testing

* **Impeccable Mechanical Detector:**
  * Perintah: `impeccable detect --json public/index.html public/style.css`
  * Status: **0 defects, 0 warnings (Exit code 0, output `[]`)**.
* **Integration Tests:**
  * Perintah: `node test-suite.js`
  * Status: **28 Passed, 0 Failed**.
