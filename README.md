# Untad Field Research & Travel Expense API (Sub-CPMK 5)
**Pengembangan API Sesuai Standar Industri — Project Based Learning (PBL)**  
Mata Kuliah: **Rekayasa API (`F09252013`)** — Kelas TIC  
Kelompok: **Kelompok 3**

---

## 👥 Anggota Kelompok & Pembagian Peran
1. **Lidiya** — `F5512530118` (*Lead Backend & Public API Engineer*)
   - Perancangan Resource `activities` & `expenses` (REST API `/v2`).
   - Integrasi Public API: *ExchangeRate-API* (kurs valas riset) & *Open-Meteo* (cuaca posko riset Sulteng) dengan sistem ketahanan *timeout* dan *cache fallback*.
   - Branch: `feat/rest-v2-public-apis`
2. **Tabita Creaselia Belicia Theona** — `F5512520086` (*Security & Cryptography Engineer*)
   - Middleware proteksi API Key (`x-api-key`).
   - Endpoint Login (`POST /v2/auth/login`) & penerbitan token bertanda tangan digital HMAC-SHA256 berbatas waktu (2 jam).
   - Hashing password dengan salt kriptografis murni modul `crypto` Node.js.
   - Role-Based Access Control (RBAC): Role `admin` (akses penuh) & Role `mahasiswa` (akses terbatas), penegakan status `401 Unauthorized` dan `403 Forbidden`.
   - Branch: `feat/security-auth`
3. **Muhammad Zikri Adam** — `F5512530117` (*GraphQL & Frontend Engineer*)
   - Endpoint GraphQL `POST /graphql` (TypeDefs, Queries berargumen, Nested Relations, & Mutations) di atas HTTP native tanpa framework.
   - Endpoint Legacy REST `/v1/expenses` dengan header HTTP `Sunset: Thu, 31 Dec 2026 23:59:59 GMT` dan `Deprecation: true`.
   - Web Dashboard Interaktif modern (`public/`) untuk meraih kriteria nilai **"Sangat Baik"**.
   - Branch: `feat/graphql-web-dashboard`
4. **Trista Sheryl Lambei** — `F5512530106` (*QA, API Documentation & Technical Writer*)
   - Dokumentasi kontrak API standar industri: `openapi.yaml` (OpenAPI 3.0.3) tanpa error di Swagger Editor.
   - Koleksi Pengujian Otomatis **Bruno** (`bruno-collection/`) & **Postman** (`postman/...json`) dengan 7 test case (positif & negatif) serta auto-save token.
   - Pembaruan Client Console CLI (`client.js`) interaktif.
   - Penyusunan Laporan Proyek Akademik 12 Bab (.docx & PDF) sesuai format margin 4-4-3-3 cm, Times New Roman 12 pt, 1.5 spasi.
   - Branch: `feat/testing-docs-report`

---

## 🏛️ Arsitektur & Gambaran Sistem
Proyek ini mengadaptasi dan mengembangkan sistem dari **Evaluasi Sub-CPMK 4 (Travel Expense API)** menjadi **Sistem Manajemen Biaya & Logistik Perjalanan Dinas / Riset Lapangan Fakultas Teknik Universitas Tadulako di Sulawesi Tengah**.

```text
[ Klien: Bruno / Postman / Client Console CLI / Web Dashboard UI ]
                             │
                             ▼  (HTTP + Header 'x-api-key' & 'Authorization: Bearer')
[ Server Gateway Native HTTP Node.js (Tanpa Framework) ]
     │                │                  │
     ├─ REST /v2      ├─ REST /v1        └─ GraphQL POST /graphql
     │  (Standar      │  (Legacy +          (Resolusi Relasi Bersarang)
     │   Industri)    │   Sunset Header)
     │                │
     ▼                ▼
[ Storage JSON ]  [ Public API Resilience Manager ]
  • activities.json ├── ExchangeRate-API (Valas Live ke IDR)
  • expenses.json   └── Open-Meteo API (Cuaca Posko Sulteng)
  • users.json
```

---

## 🚀 Cara Menjalankan Proyek untuk Demo

### 1. Prasyarat Lingkungan
* Node.js versi 18+ (Dibuat dan diuji pada Node.js v24 murni di atas modul `http`, package tambahan yang diperbolehkan hanya `graphql`).
* Dependensi telah terpasang:
  ```bash
  npm install
  ```

### 2. Konfigurasi Variabel Lingkungan (.env)
Salin berkas `.env.example` menjadi `.env`:
```bash
cp .env.example .env
```
Isi konfigurasi default:
```env
PORT=3000
API_KEY=untad-api-key-2026
JWT_SECRET=untad-rahasia-rekayasa-api-sub-cpmk-5-kelompok-3
NODE_ENV=development
```

### 3. Menjalankan Server API
Buka Terminal 1:
```bash
node server.js
```
*Server akan mencetak identitas kelompok dan aktif di `http://localhost:3000`.*

### 4. Membuka Web Dashboard Interaktif (Nilai Sangat Baik)
Buka peramban (browser) dan akses:
👉 **`http://localhost:3000/`**
*Menyajikan visualisasi anggaran riset FT Untad, widget cuaca kampus Untad, widget valas live, panel pengujian Sunset header, dan GraphQL interactive query runner.*

### 5. Menjalankan Client Console Interaktif (CLI)
Buka Terminal 2:
```bash
node client.js
```
*Client console menyediakan menu 0–8 interaktif untuk melakukan login, melihat kegiatan, mencatat pengeluaran baru, menguji penolakan 403 role mahasiswa, serta memeriksa response header Sunset.*

---

## 🧪 Koleksi Pengujian Otomatis (Testing)

### A. Pengujian via Bruno (Direkomendasikan Kelompok)
Folder koleksi Bruno tersedia di folder: `bruno-collection/`
1. Buka aplikasi **Bruno**.
2. Klik **Open Collection** -> pilih folder `bruno-collection/`.
3. Pilih Environment **Local** di pojok kanan atas.
4. Anda dapat menjalankan seluruh request dari nomor `1` sampai `8`.
5. Script secara otomatis menyimpan token login (`auth_token`) ke sesi pengujian.

### B. Pengujian via Postman (Kepatuhan Spesifikasi Modul)
File koleksi Postman tersedia di:  
`postman/PBL2_Untad_Research_Expense_API.postman_collection.json`
1. Buka aplikasi **Postman** -> Klik **Import** -> pilih file JSON di atas.
2. Buka menu **Collection Runner**, pilih seluruh test case (termasuk skenario negatif 401 dan 403).
3. Klik **Run Collection**. Seluruh test case terbukti **100% PASS** berulang kali.

### C. Menjalankan Automated Test Suite via Terminal
Anda juga dapat menjalankan verifikasi pengujian otomatis mandiri langsung via Node.js:
```bash
node test-suite.js
```
*Akan mengeksekusi 9 skenario integrasi dengan hasil 27 assertions PASS tanpa error.*

---

## 🔒 Strategi Keamanan & Hak Akses (RBAC)

1. **Header API Key (`x-api-key`)**:
   Wajib disertakan pada seluruh pemanggilan endpoint API. Jika absen atau salah, server mengembalikan status `401 Unauthorized`.
2. **Autentikasi & Signed Token (HMAC-SHA256)**:
   Endpoint `POST /v2/auth/login` memverifikasi password ber-salt scrypt/PBKDF2 dan menerbitkan token bertanda tangan digital berbatas waktu (2 jam).
3. **Pembagian Role Pengguna**:
   * **Role `admin`** (Dosen Pembimbing / Staf Keuangan): Memiliki wewenang CRUD penuh atas kegiatan riset dan seluruh pengeluaran.
   * **Role `mahasiswa`** (Peneliti Lapangan): Hanya diizinkan melihat data dan mencatat pengeluaran baru. Jika mencoba menghapus data kegiatan/pengeluaran, server secara presisi mengembalikan status `403 Forbidden`.

---

## 🔄 Versioning: REST /v1 vs REST /v2

* **REST `/v2` (Current Standard)**:
  Mewajibkan parameter `activityId` (relasi ke kegiatan riset Untad), mengelompokkan struktur biaya ke objek bersarang `cost: { amount, currency, nominalIDR, formatRupiah }`, serta menyajikan pengayaan data cuaca posko Sulteng dan kurs valas live.
* **REST `/v1` (Legacy Sub-CPMK 4)**:
  Tetap melayani pembacaan data format flat lama pada `GET /v1/expenses` dan `GET /v1/expenses/:id` untuk menjaga backward-compatibility.
  Dilengkapi header HTTP standar RFC:
  * `Sunset: Thu, 31 Dec 2026 23:59:59 GMT`
  * `Deprecation: true`
  * `Link: </v2/expenses>; rel="successor-version"`

---

## 📑 Dokumentasi Kontrak OpenAPI (Swagger)
Spesifikasi lengkap standar OpenAPI 3.0.3 tersedia pada berkas `openapi.yaml`.  
Dapat dibuka langsung tanpa error pada [Swagger Editor](https://editor.swagger.io/) atau melalui endpoint server:  
👉 `http://localhost:3000/openapi.yaml`

---

## 📜 Berkas Laporan Proyek Akademik
Laporan resmi format Times New Roman 12 pt, 1.5 spasi, margin 4-4-3-3 cm, ukuran A4 dengan 12 Bab lengkap tersedia di:  
📄 `Laporan_Final_Project_Kelompok3_Rekayasa_API.docx`
