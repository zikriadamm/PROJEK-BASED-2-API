const crypto = require('crypto');
const config = require('./config');

// ---------- Password Hashing (Salt + Scrypt) ----------
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, originalHash] = storedHash.split(':');
  const computedHash = crypto.scryptSync(password, salt, 64).toString('hex');
  const bufA = Buffer.from(computedHash, 'hex');
  const bufB = Buffer.from(originalHash, 'hex');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

// ---------- Signed Token (HMAC-SHA256) ----------
function base64url(input) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(typeof input === 'string' ? input : JSON.stringify(input));
  return buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function parseBase64url(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  return Buffer.from(str, 'base64').toString('utf-8');
}

function generateToken(user, expiresInSeconds = 7200) { // 2 jam default
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    id: user.id,
    username: user.username,
    role: user.role,
    fullName: user.fullName,
    identifier: user.identifier,
    iat: now,
    exp: now + expiresInSeconds
  };

  const encodedHeader = base64url(header);
  const encodedPayload = base64url(payload);
  const dataToSign = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto.createHmac('sha256', config.JWT_SECRET).update(dataToSign).digest();
  const encodedSignature = base64url(signature);

  return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
}

function verifyToken(token) {
  if (!token || typeof token !== 'string') {
    return { valid: false, error: 'Token tidak disertakan atau bukan string.' };
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    return { valid: false, error: 'Format struktur token tidak valid.' };
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const dataToSign = `${encodedHeader}.${encodedPayload}`;
  const expectedSig = base64url(crypto.createHmac('sha256', config.JWT_SECRET).update(dataToSign).digest());

  const bufExpected = Buffer.from(expectedSig);
  const bufActual = Buffer.from(encodedSignature);

  if (bufExpected.length !== bufActual.length || !crypto.timingSafeEqual(bufExpected, bufActual)) {
    return { valid: false, error: 'Tanda tangan digital token tidak valid (manipulasi terdeteksi).' };
  }

  try {
    const payload = JSON.parse(parseBase64url(encodedPayload));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && now > payload.exp) {
      return { valid: false, error: 'Token telah kedaluwarsa (expired). Silakan login kembali.' };
    }
    return { valid: true, user: payload };
  } catch (err) {
    return { valid: false, error: 'Payload token gagal diurai.' };
  }
}

// ---------- Helper Pemeriksaan API Key ----------
function verifyApiKey(req) {
  const headerKey = req.headers['x-api-key'] || req.headers['X-API-KEY'] || req.headers['x-api_key'];
  if (!headerKey) {
    return { valid: false, error: 'Header x-api-key wajib disertakan pada seluruh request API.' };
  }
  if (headerKey !== config.API_KEY) {
    return { valid: false, error: 'Nilai x-api-key tidak valid atau tidak terdaftar.' };
  }
  return { valid: true };
}

// ---------- Helper Pemeriksaan Bearer Token ----------
function extractBearerToken(req) {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  if (!authHeader) return null;
  const parts = authHeader.split(' ');
  if (parts.length === 2 && /^Bearer$/i.test(parts[0])) {
    return parts[1];
  }
  return null;
}

module.exports = {
  hashPassword,
  verifyPassword,
  generateToken,
  verifyToken,
  verifyApiKey,
  extractBearerToken
};
