function kirimJSON(res, statusCode, data, customHeaders = {}) {
  const body = JSON.stringify(data, null, 2);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key, X-API-KEY',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    ...customHeaders
  });
  res.end(body);
}

function kirimError(res, statusCode, pesan, detail = null, customHeaders = {}) {
  const payload = {
    sukses: false,
    status: statusCode,
    error: pesan
  };
  if (detail) payload.detail = detail;
  kirimJSON(res, statusCode, payload, customHeaders);
}

function bacaBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      if (!body.trim()) return resolve(null);
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        const errorJSON = new Error('Body request bukan format JSON yang valid.');
        errorJSON.statusCode = 400;
        reject(errorJSON);
      }
    });
    req.on('error', reject);
  });
}

module.exports = {
  kirimJSON,
  kirimError,
  bacaBody
};
