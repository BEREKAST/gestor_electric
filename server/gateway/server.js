import express from "express";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { createProxyMiddleware } from "http-proxy-middleware";
import jwt from "jsonwebtoken";

const app = express();
const PORT = process.env.PORT || 8080;
const ORIGIN = process.env.CORS_ORIGIN || "http://localhost:5173";
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";

// Targets: en Docker usa nombres de servicio; fuera, localhost.
const AUTH_URL    = process.env.AUTH_URL    || "http://localhost:3001";
const SELLER_URL  = process.env.SELLER_URL  || "http://localhost:3003";
const CATALOG_URL = process.env.CATALOG_URL || "http://localhost:3002";
const ORDERS_URL  = process.env.ORDERS_URL  || "http://localhost:3004";

app.use(morgan("dev"));
app.use(express.json());
app.use(cookieParser());
app.use(cors({ origin: ORIGIN, credentials: true }));

app.get("/health", (_req, res) => res.json({ ok: true, service: "gateway" }));

/** Middleware de protección para rutas de vendedor */
function authSeller(req, res, next) {
  try {
    const bearer = req.headers.authorization?.replace(/^Bearer\s+/i, "");
    const cookie = req.cookies?.token;
    const token = bearer || cookie;
    if (!token) return res.status(401).json({ error: "No autenticado" });

    const data = jwt.verify(token, JWT_SECRET);
    if (data.role !== "seller") return res.status(403).json({ error: "Solo vendedores" });

    // Endpoints “avanzados”: requieren plan pro|enterprise
    const advanced =
      req.path.startsWith("/seller/analytics") ||
      req.path.startsWith("/seller/finance/export") ||
      (req.method !== "GET" && req.path.startsWith("/seller/taxes"));

    if (advanced && !["pro", "enterprise"].includes(String(data.plan))) {
      return res.status(403).json({ error: "Requiere plan Pro o Enterprise" });
    }

    req.user = data;
    next();
  } catch {
    return res.status(401).json({ error: "Token inválido" });
  }
}

// Auth
app.use(
  "/api/auth",
  createProxyMiddleware({
    target: AUTH_URL,
    changeOrigin: true,
    pathRewrite: { "^/api": "" },
  })
);

// Seller (protegido)
app.use("/api/seller", authSeller);
app.use(
  "/api/seller",
  createProxyMiddleware({
    target: SELLER_URL,
    changeOrigin: true,
    pathRewrite: { "^/api": "" },
  })
);

// Catálogo / Órdenes / Payments
app.use(
  "/api",
  createProxyMiddleware({
    router: (req) => {
      if (req.path.startsWith("/products") || req.path.startsWith("/categories")) {
        return CATALOG_URL;
      }
      if (
        req.path.startsWith("/checkout") ||
        req.path.startsWith("/payments") ||
        req.path.startsWith("/orders")
      ) {
        return ORDERS_URL;
      }
      // default → catálogo
      return CATALOG_URL;
    },
    changeOrigin: true,
    pathRewrite: { "^/api": "" },
  })
);

app.listen(PORT, () => {
  console.log(`Gateway → http://localhost:${PORT}`);
  console.log(
    `Targets: AUTH=${AUTH_URL} CATALOG=${CATALOG_URL} SELLER=${SELLER_URL} ORDERS=${ORDERS_URL}`
  );
});
