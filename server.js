console.log('================================================================================');
console.log('  FINAL PROJECT REKAYASA API (SUB-CPMK 5) - STANDAR INDUSTRI');
console.log('  Sistem Manajemen Biaya & Logistik Riset Lapangan Fakultas Teknik Untad');
console.log('  1. Lidiya (F5512530118)');
console.log('  2. Tabita Creaselia Belicia Theona (F5512520086)');
console.log('  3. Muhammad Zikri Adam (F5512530117)');
console.log('  4. Trista Sheryl Lambei (F5512530106)');
console.log('================================================================================');

const http = require('http');
const url = require('url');
const path = require('path');
const fs = require('fs/promises');
const fsSync = require('fs');

const config = require('./src/config');
const security = require('./src/security');
const { kirimJSON, kirimError, bacaBody } = require('./src/httpHelpers');
const { handleV1Router } = require('./src/v1Router');
const { handleV2Router } = require('./src/v2Router');
const { executeGraphQL } = require('./src/graphqlSchema');

const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.yaml': 'text/yaml; charset=utf-8',
  '.yml': 'text/yaml; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

async function serveStaticFile(res, filePath) {
  try {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'text/plain';
    const content = await fs.readFile(filePath);
    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': content.length,
      'Access-Control-Allow-Origin': '*'
    });
    res.end(content);
  } catch (err) {
    kirimError(res, 404, 'Berkas antarmuka tidak ditemukan.');
  }
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  let pathname = parsedUrl.pathname.replace(/\/+$/, '') || '/';
  const method = req.method.toUpperCase();
  const query = parsedUrl.query;

  // 1. CORS Preflight Handling
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key, X-API-KEY',
      'Access-Control-Max-Age': '86400'
    });
    return res.end();
  }

  try {
    // 2. Layanan Berkas Terbuka: Dokumentasi openapi.yaml
    if (pathname === '/openapi.yaml' || pathname === '/openapi.yml') {
      const yamlPath = path.join(__dirname, 'openapi.yaml');
      if (fsSync.existsSync(yamlPath)) {
        return serveStaticFile(res, yamlPath);
      }
    }

    // 3. Layanan Web Dashboard Interaktif (Kriteria Nilai "Sangat Baik")
    if (pathname === '/' || pathname === '' || pathname === '/app') {
      const indexPath = path.join(PUBLIC_DIR, 'index.html');
      if (fsSync.existsSync(indexPath)) {
        return serveStaticFile(res, indexPath);
      }
    }
    if (pathname.startsWith('/public/') || pathname.startsWith('/css/') || pathname.startsWith('/js/')) {
      const cleanPath = pathname.replace(/^\/(public|css|js)\//, '');
      const targetPath = path.join(PUBLIC_DIR, cleanPath);
      if (fsSync.existsSync(targetPath)) {
        return serveStaticFile(res, targetPath);
      }
    }

    // 4. Info Root API (/api)
    if (pathname === '/api') {
      return kirimJSON(res, 200, {
        namaSistem: 'Untad Field Research & Travel Expense API (Sub-CPMK 5)',
        status: 'ONLINE & READY',
        kelompok: 'Kelompok 3 - Rekayasa API FT Untad',
        keamanan: {
          wajibApiKey: true,
          headerApiKey: 'x-api-key: untad-api-key-2026',
          autentikasi: 'Bearer Token (HMAC-SHA256 Signed Token)'
        },
        endpointsUtama: {
          webDashboard: 'GET http://localhost:' + config.PORT + '/',
          authLogin: 'POST /v2/auth/login',
          restV2Kegiatan: 'GET, POST /v2/activities',
          restV2Pengeluaran: 'GET, POST /v2/expenses (wajib activityId)',
          restV2Summary: 'GET /v2/expenses/summary (analisis risiko anggaran & cuaca)',
          restV1Legacy: 'GET /v1/expenses (membawa header HTTP Sunset)',
          graphQLEndpoint: 'POST /graphql',
          openApiKontrak: 'GET /openapi.yaml'
        }
      });
    }

    // 5. Verifikasi Keamanan: Header API Key (Wajib untuk Seluruh Endpoint API /v1, /v2, /graphql)
    const isApiRequest = pathname.startsWith('/v1') || pathname.startsWith('/v2') || pathname === '/graphql';
    if (isApiRequest) {
      const apiKeyCheck = security.verifyApiKey(req);
      if (!apiKeyCheck.valid) {
        return kirimError(res, 401, apiKeyCheck.error, {
          petunjuk: 'Sertakan header "x-api-key: untad-api-key-2026" pada request Anda.'
        });
      }
    }

    // 6. Router REST v1 (Legacy Sub-CPMK 4)
    if (pathname.startsWith('/v1')) {
      return await handleV1Router(req, res, pathname, method, query);
    }

    // 7. Router REST v2 (Standar Industri Baru)
    if (pathname.startsWith('/v2')) {
      return await handleV2Router(req, res, pathname, method, query);
    }

    // 8. Router GraphQL (POST /graphql)
    if (pathname === '/graphql') {
      if (method !== 'POST') {
        return kirimError(res, 405, 'Endpoint GraphQL hanya menerima metode POST.');
      }

      const body = await bacaBody(req);
      if (!body || !body.query) {
        return kirimError(res, 400, 'Body request GraphQL wajib memuat properti "query".');
      }

      // Ekstrak token jika ada untuk context otorisasi
      const tokenStr = security.extractBearerToken(req);
      let userContext = null;
      if (tokenStr) {
        const verifyRes = security.verifyToken(tokenStr);
        if (verifyRes.valid) {
          userContext = verifyRes.user;
        }
      }

      const gqlResult = await executeGraphQL(body.query, body.variables || null, { req, user: userContext });

      const statusCode = gqlResult.errors && gqlResult.errors.some(e => e.message.startsWith('401'))
        ? 401
        : (gqlResult.errors && gqlResult.errors.some(e => e.message.startsWith('403')) ? 403 : 200);

      return kirimJSON(res, statusCode, gqlResult);
    }

    // 9. 404 Not Found untuk endpoint tidak dikenal
    return kirimError(res, 404, `Endpoint ${pathname} tidak ditemukan di server API FT Untad.`);
  } catch (err) {
    console.error('[Server Internal Error]', err);
    return kirimError(res, 500, 'Terjadi kesalahan internal pada server.', err.message);
  }
});

server.listen(config.PORT, () => {
  console.log(`[Server Berjalan] Server aktif di: http://localhost:${config.PORT}`);
  console.log(`[Web Dashboard]   Kunjungi:        http://localhost:${config.PORT}/`);
  console.log(`[API Key Default] x-api-key:       ${config.API_KEY}`);
  console.log(`[GraphQL Service] Endpoint:        http://localhost:${config.PORT}/graphql\n`);
});
