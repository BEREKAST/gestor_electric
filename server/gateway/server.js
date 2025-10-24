import express from "express";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { createProxyMiddleware } from "http-proxy-middleware";
import jwt from "jsonwebtoken";

const app = express();
const PORT = process.env.PORT || 8080;
const ORIGIN = process.env.CORS_ORIGIN || "http://localhost:5173";

const AUTH_JWT_SECRET = process.env.AUTH_JWT_SECRET || process.env.JWT_SECRET || "dev_secret_change_me";

const AUTH_URL    = process.env.AUTH_URL    || "http://auth:3001";
const SELLER_URL  = process.env.SELLER_URL  || "http://seller:3003";
const CATALOG_URL = process.env.CATALOG_URL || "http://catalog:3002";
const ORDERS_URL  = process.env.ORDERS_URL  || "http://orders:3004";

app.use(morgan("dev"));
app.use(cookieParser());
app.use(cors({
  origin: ORIGIN,
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"],
  methods: ["GET","POST","PUT","PATCH","DELETE","OPTIONS"],
}));

// ⚠️ IMPORTANTE: NO usar app.use(express.json()) en el gateway.
// Si parseas el body aquí, el proxy ya no podrá reenviarlo al micro-servicio.

/* -------- helpers -------- */
const onProxyResFixCookies = (proxyRes) => {
  const sc = proxyRes.headers["set-cookie"];
  if (Array.isArray(sc)) {
    proxyRes.headers["set-cookie"] = sc.map((c) =>
      c.replace(/; *Domain=[^;]*/i, "")
       .replace(/; *Secure/i, "")
       .replace(/; *SameSite=[^;]*/i, "; SameSite=Lax")
    );
  }
};
const forwardAuthHeaders = (proxyReq, req) => {
  if (req.headers.cookie) proxyReq.setHeader("cookie", req.headers.cookie);
  if (req.headers.authorization) proxyReq.setHeader("authorization", req.headers.authorization);
};

/* ========= /uploads público (sin /api) ========= */
app.use("/uploads", createProxyMiddleware({
  changeOrigin: true,
  xfwd: true,
  cookieDomainRewrite: { "*": "" },
  target: SELLER_URL,
  onProxyRes: onProxyResFixCookies,
  onProxyReq: forwardAuthHeaders,
}));

/* ========= /api/auth directo ========= */
app.use("/api/auth", createProxyMiddleware({
  changeOrigin: true,
  xfwd: true,
  cookieDomainRewrite: { "*": "" },
  target: AUTH_URL,
  pathRewrite: { "^/api": "" },
  onProxyRes: onProxyResFixCookies,
  onProxyReq: forwardAuthHeaders,
}));

/* ========= guard para /api/seller ========= */
function authSeller(req, res, next) {
  try {
    const bearer = req.headers.authorization?.replace(/^Bearer\s+/i, "");
    const cookie = req.cookies?.token;
    const token = bearer || cookie;
    if (!token) return res.status(401).json({ error: "No autenticado" });
    const data = jwt.verify(token, AUTH_JWT_SECRET);
    req.user = data;
    return next();
  } catch (e) {
    console.error("[GW] authSeller error:", e.message);
    return res.status(401).json({ error: "Token inválido" });
  }
}

/* Log para confirmar el bloque */
app.use((req, _res, next) => {
  if (req.path.startsWith("/api/seller")) {
    console.log("[GW] HIT /api/seller ->", req.method, req.path);
  }
  next();
});

/* ========= /api/seller protegido — ANTES del catch-all /api =========
   NOTA: como el proxy está montado en "/api/seller", el path que llega al
   rewrite YA NO contiene ese prefijo. Para que el micro lo reciba bajo
   "/seller", lo prep endemos siempre.
*/
app.use("/api/seller", authSeller);
app.use("/api/seller", createProxyMiddleware({
  changeOrigin: true,
  xfwd: true,
  cookieDomainRewrite: { "*": "" },
  target: SELLER_URL,
  pathRewrite: (path) => `/seller${path}`,  // ← clave
  onProxyReq: (proxyReq, req) => {
    forwardAuthHeaders(proxyReq, req);
    console.log("[GW] FORWARDING →", req.method, req.originalUrl, "=>", proxyReq.path);
  },
  onProxyRes: onProxyResFixCookies,
}));

/* ========= RESTO /api ========= */
app.use("/api", createProxyMiddleware({
  changeOrigin: true,
  xfwd: true,
  cookieDomainRewrite: { "*": "" },
  router: (req) => {
    const p = req.path || "";
    if (p.startsWith("/products") || p.startsWith("/categories")) return SELLER_URL;
    if (p.startsWith("/checkout") || p.startsWith("/payments") || p.startsWith("/orders")) return ORDERS_URL;
    return CATALOG_URL;
  },
  pathRewrite: { "^/api": "" },
  onProxyRes: onProxyResFixCookies,
  onProxyReq: forwardAuthHeaders,
}));

app.get("/health", (_req, res) => res.json({ ok: true, service: "gateway" }));

app.listen(PORT, () => {
  console.log(`Gateway → http://localhost:${PORT}`);
  console.log(`Targets: AUTH=${AUTH_URL} CATALOG=${CATALOG_URL} SELLER=${SELLER_URL} ORDERS=${ORDERS_URL}`);
});
