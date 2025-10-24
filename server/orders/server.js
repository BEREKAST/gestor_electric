// server/orders/server.js
import express from "express";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";

const app = express();
const prisma = new PrismaClient();

/* ========= ENV ========= */
const PORT   = process.env.PORT || 3004;
const ORIGIN = process.env.CORS_ORIGIN || "http://localhost:5173";
// Debe coincidir con AUTH/GATEWAY/SELLER
const SECRET = process.env.AUTH_JWT_SECRET || process.env.JWT_SECRET || "dev_secret_change_me";

/* ========= Middlewares ========= */
app.set("trust proxy", 1);
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (origin === ORIGIN) return cb(null, true);
    return cb(new Error("CORS not allowed"));
  },
  credentials: true,
}));
app.use(morgan("dev"));
app.use(cookieParser());
app.use(express.json({ limit: "2mb" }));

/* ========= Auth por cookie JWT ========= */
function requireAuth(req, res, next) {
  try {
    const t = req.cookies?.token;
    if (!t) return res.status(401).json({ error: "NO_AUTH" });
    const data = jwt.verify(t, SECRET);
    req.user = data; // { id, email, role, plan, name }
    next();
  } catch {
    res.status(401).json({ error: "INVALID_TOKEN" });
  }
}

/* ========= Health ========= */
app.get("/orders/health", (_req, res) => res.json({ ok: true, service: "orders" }));

/* ========= Endpoints ========= */

// Lista de pedidos (para KPIs). En el futuro puedes filtrar por vendedor si lo necesitas.
app.get("/orders", requireAuth, async (_req, res) => {
  try {
    const orders = await prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      include: { items: true },
    });
    res.json(orders);
  } catch (e) {
    console.error("[orders] list:", e);
    res.status(500).json({ error: "ORDERS_LIST_FAILED" });
  }
});

// Actualizar estado
app.put("/orders/:id/status", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};
    const allowed = ["pending", "paid", "shipped", "delivered", "cancelled"];
    if (!allowed.includes(status)) return res.status(400).json({ error: "STATUS_INVALID" });

    const updated = await prisma.order.update({
      where: { id },
      data: { status },
      include: { items: true },
    });
    res.json(updated);
  } catch (e) {
    console.error("[orders] update status:", e);
    if (String(e?.code) === "P2025") return res.status(404).json({ error: "NOT_FOUND" });
    res.status(500).json({ error: "ORDERS_UPDATE_FAILED" });
  }
});

// (Opcional) Crear pedido de prueba (útil para poblar)
app.post("/orders/seed-one", requireAuth, async (_req, res) => {
  try {
    const count = await prisma.order.count();
    const number = `A-${(1001 + count).toString().padStart(4, "0")}`;
    const created = await prisma.order.create({
      data: {
        number,
        customer: "Cliente Demo",
        total: 123.45,
        status: "pending",
        items: {
          create: [
            { name: "Item demo", price: 100.00, qty: 1 },
            { name: "Accesorio", price: 23.45, qty: 1 },
          ],
        },
      },
      include: { items: true },
    });
    res.status(201).json(created);
  } catch (e) {
    console.error("[orders] seed-one:", e);
    res.status(500).json({ error: "SEED_FAILED" });
  }
});

/* ========= Start ========= */
app.listen(PORT, () => {
  console.log(`✅ Orders → http://localhost:${PORT}`);
});
