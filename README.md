# Untad Field Research & Travel Expense API (Sub-CPMK 5)

Proyek Akhir Mata Kuliah **Rekayasa API (`F09252013`)** — Kelas TIC  
**Kelompok 2** — Program Studi S1 Teknik Informatika, Fakultas Teknik Universitas Tadulako  
Repositori GitHub: https://github.com/zikriadamm/PROJEK-BASED-2-API

---

## Anggota Kelompok & Pembagian Peran
1. **Lidiya** — `F5512530118` (*Backend REST API v2 & Public API Integration*)
   - Perancangan resource `activities` dan `expenses` berelasi (`/v2/activities`, `/v2/expenses`, `/v2/expenses/summary`).
   - Integrasi ExchangeRate-API (kurs valas) dan Open-Meteo (cuaca posko Sulteng) dengan *timeout* 4 detik dan *cache fallback*.
   - Branch: `feat/rest-v2-public-apis`
2. **Tabita Creaselia Belicia Theona** — `F5512520086` (*Security & RBAC*)
   - Middleware API Key (`x-api-key`) untuk endpoint `/v1`, `/v2`, dan `/graphql`.
   - Endpoint `POST /v2/auth/login` dan `POST /v2/auth/logout`, hashing password `scrypt` + *salt* acak, dan penandatanganan token HMAC-SHA256 berbatas waktu 2 jam.
   - Otorisasi berbasis peran (*role* `admin` dan `mahasiswa`) dengan penegakan status `401 Unauthorized` dan `403 Forbidden`.
   - Branch: `feat/security-auth`
3. **Muhammad Zikri Adam** — `F5512530117` (*GraphQL, Versioning & Web Dashboard*)
   - Endpoint `POST /graphql` (queries berargumen, relasi bersarang dua arah, dan mutation `createExpense`).
   - Endpoint legasi `GET /v1/expenses` dengan header HTTP `Sunset`, `Deprecation: true`, dan `Link`.
   - Antarmuka *Web Dashboard* (`public/`).
   - Branch: `feat/graphql-web-dashboard`
4. **Trista Sheryl Lambei** — `F5512530106` (*OpenAPI Docs, Testing & Laporan*)
   - Dokumentasi spesifikasi OpenAPI 3.0.3 (`openapi.yaml`).
   - Koleksi pengujian Bruno (`bruno-collection/`) dan Postman (`postman/`) dengan 8 skenario uji, serta pembaruan aplikasi CLI (`client.js`).
   - Penyusunan laporan akhir proyek (`.docx` dan `.pdf`).
   - Branch: `feat/testing-docs-report`

---

## Gambaran Arsitektur Sistem
Proyek ini mengembangkan prototipe Evaluasi Sub-CPMK 4 menjadi layanan *backend* manajemen biaya perjalanan dinas dan riset lapangan Fakultas Teknik Universitas Tadulako menggunakan modul `http` dan `crypto` Node.js bawaan (dependensi produksi tambahan hanya `graphql`).

```text
[ Klien: Bruno / Postman / Client CLI / Web Dashboard ]
                         |
                         v  (HTTP + 'x-api-key' & 'Authorization: Bearer')
[ Gateway HTTP Node.js (server.js) ]
     |                |                  |
     +-- REST /v2     +-- REST /v1       +-- GraphQL POST /graphql
     |   (Relasional) |   (Sunset RFC 8594)
     v                v
[ storage.js ]   [ publicApis.js (Timeout 4s + Cache Fallback) ]
  - activities.json  - ExchangeRate-API (open.er-api.com)
  - expenses.json    - Open-Meteo API (api.open-meteo.com)
  - users.json
```

---

## Cara Menjalankan Proyek

### 1. Prasyarat & Instalasi
- Node.js v18+ (diuji pada Node.js v24)
```bash
npm install
```

### 2. Konfigurasi Environment (`.env`)
Salin `.env.example` menjadi `.env`:
```bash
cp .env.example .env
```
Konfigurasi default:
```env
PORT=3000
API_KEY=untad-api-key-2026
JWT_SECRET=untad-rahasia-rekayasa-api-sub-cpmk-5-kelompok-2
NODE_ENV=development
```

### 3. Menjalankan Server API & Web Dashboard
```bash
npm start
```
Server berjalan di `http://localhost:3000`:
- Web Dashboard: `http://localhost:3000/`
- Ringkasan Endpoint: `http://localhost:3000/api`
- Spesifikasi OpenAPI YAML: `http://localhost:3000/openapi.yaml`
- Endpoint GraphQL: `POST http://localhost:3000/graphql`

### 4. Menjalankan Client Console (CLI)
```bash
npm run client
```

---

## Pengujian Otomatis

### A. Integration Test Suite (Terminal)
```bash
npm test
```
Menjalankan 9 kelompok pengujian terintegrasi dengan **28 assertions** (`test-suite.js`).

### B. End-to-End Browser Test (Playwright)
```bash
npm run test:e2e
```
Menguji alur UI lengkap (login admin, widget cuaca/valas, tab pengeluaran, audit header Sunset v1 vs v2, eksekusi GraphQL, dan tambah kegiatan) pada peramban headless (**19 assertions**).

### C. Bruno & Postman Collection
- **Bruno:** Buka folder `bruno-collection/` (berisi 8 request skenario positif & negatif).
- **Postman:** Impor `postman/PBL2_Untad_Research_Expense_API.postman_collection.json` lalu jalankan via *Collection Runner*.

---

## Keamanan & Versioning
1. **API Key (`x-api-key`):** Wajib pada seluruh rute `/v1`, `/v2`, dan `/graphql`. Tanpa kunci valid mengembalikan `401 Unauthorized`.
2. **Signed Token (HMAC-SHA256) & Password Hashing:** Password disimpan dalam format `salt:hash` (`crypto.scryptSync`); token berlaku 2 jam dan diverifikasi dengan `crypto.timingSafeEqual`.
3. **RBAC (`admin` vs `mahasiswa`):** Role `mahasiswa` dapat melihat data dan menambah pengeluaran, namun ditolak dengan `403 Forbidden` jika mencoba menambah master kegiatan atau menghapus transaksi.
4. **Versioning (`/v1` vs `/v2`):** Endpoint `/v2/expenses` mewajibkan `activityId` dan menggunakan objek `cost`, sementara `GET /v1/expenses` tetap aktif sebagai endpoint legasi dengan header `Sunset: Thu, 31 Dec 2026 23:59:59 GMT`, `Deprecation: true`, dan `Link: </v2/expenses>; rel="successor-version"`.

---

## Berkas Dokumentasi & Laporan
- Spesifikasi OpenAPI 3.0.3: [`openapi.yaml`](openapi.yaml)
- Laporan Akhir Proyek: [`laporan-dan-arsip/laporan/FinalProject_Kelompok2_UntadFieldResearchExpenseAPI.docx`](laporan-dan-arsip/laporan/FinalProject_Kelompok2_UntadFieldResearchExpenseAPI.docx)
