// src/shared/lib/http.js
const BASE = import.meta.env.VITE_API_URL || "http://localhost:8080/api";

/**
 * Construye headers según el tipo de body.
 * - Si el body es FormData, NO seteamos Content-Type (el browser pone el boundary).
 * - Si es JSON, ponemos Content-Type: application/json.
 */
function buildHeaders(body, extraHeaders = {}) {
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  const base = isForm ? {} : { "Content-Type": "application/json" };
  return { ...base, ...extraHeaders };
}

/**
 * Intenta parsear JSON de la respuesta. Si falla, devuelve texto.
 */
async function parseResponse(res) {
  const text = await res.text();
  if (!text) return null; // ej: 204 No Content
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * Lanza un Error enriquecido con status y payload del backend (si existe).
 */
function throwHttpError(status, payload) {
  const err = new Error(
    (payload && (payload.error || payload.message)) ||
    `HTTP ${status}`
  );
  err.status = status;
  err.payload = payload;
  throw err;
}

/**
 * Request genérico
 * - path: string tipo "/seller/products" o "/catalog/products?limit=60"
 * - opts: { method, body, headers }
 *   * body: objeto (JSON) o FormData
 */
async function req(path, opts = {}) {
  const isForm = typeof FormData !== "undefined" && opts.body instanceof FormData;

  const res = await fetch(`${BASE}${path}`, {
    method: opts.method || "GET",
    credentials: "include", // 🔒 importante para cookies httpOnly
    headers: buildHeaders(opts.body, opts.headers),
    body: isForm
      ? opts.body // FormData tal cual
      : (opts.body != null ? JSON.stringify(opts.body) : undefined),
  });

  const data = await parseResponse(res);

  if (!res.ok) {
    // Backend puede devolver { error, message, ... }
    throwHttpError(res.status, data);
  }

  return data; // puede ser null (204), objeto o texto
}

/* ===== API simple ===== */
const http = {
  get: (p, headers) => req(p, { method: "GET", headers }),

  post: (p, body, headers) => req(p, { method: "POST", body, headers }),

  put: (p, body, headers) => req(p, { method: "PUT", body, headers }),

  del: (p, headers) => req(p, { method: "DELETE", headers }),

  /**
   * Subida de archivos (FormData)
   */
  upload: (p, files, fieldName = "files", extra = {}) => {
    const form = new FormData();
    if (files && typeof files.length === "number") {
      Array.from(files).forEach((f) => form.append(fieldName, f));
    }
    Object.entries(extra).forEach(([k, v]) => form.append(k, v));
    return req(p, { method: "POST", body: form });
  },
};

export default http;
