// server/catalog/server.js
import express from "express";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { PrismaClient } from "@prisma/client";

const app = express();
const prisma = new PrismaClient();

const PORT   = process.env.PORT || 3002;
const ORIGIN = process.env.CORS_ORIGIN || "http://localhost:5173";

app.set("trust proxy", 1);
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (origin === ORIGIN) return cb(null, true);
    cb(new Error("CORS not allowed"));
  },
  credentials: true,
}));
app.use(morgan("dev"));
app.use(cookieParser());
app.use(express.json());

app.get("/catalog/health", (_req, res) => res.json({ ok: true, service: "catalog" }));

// Evita 304 y forzamos datos frescos
function noStore(res) {
  res.setHeader("Cache-Control", "no-store");
}

/* ==================== PRODUCTS ==================== */
app.get("/products", async (_req, res) => {
  noStore(res);
  try {
    const limit = 200;

    // Intento 1: con include imágenes si existe la relación
    try {
      const rows = await prisma.product.findMany({
        where: {}, // sin filtros de flags
        orderBy: { createdAt: "desc" }, // si no tienes createdAt, cambia por id
        take: limit,
        include: { images: true },      // si no existe "images", saltamos al catch interno
      });
      return res.json(rows);
    } catch {
      // Intento 2: sin include imágenes
      try {
        const rows = await prisma.product.findMany({
          where: {},
          orderBy: { createdAt: "desc" },
          take: limit,
        });
        return res.json(rows);
      } catch {
        // Intento 3: sin orderBy por si no existe createdAt
        const rows = await prisma.product.findMany({
          where: {},
          take: limit,
        });
        return res.json(rows);
      }
    }
  } catch (e) {
    console.error("[catalog] /products error (fallback a vacío):", e);
    // Para NO provocar 504 del gateway, respondemos vacío si algo sale mal
    return res.json([]);
  }
});

/* ==================== CATEGORIES ==================== */
app.get("/categories", async (_req, res) => {
  noStore(res);
  // 1) si hay tabla Category
  try {
    if (prisma.category?.findMany) {
      const cats = await prisma.category.findMany({ orderBy: { name: "asc" } });
      return res.json(cats);
    }
  } catch { /* ignoramos y derivamos */ }

  // 2) derivar desde products.category
  try {
    const products = await prisma.product.findMany({ select: { category: true } });
    const names = Array.from(new Set(products.map(p => p.category).filter(Boolean)))
      .sort((a, b) => String(a).localeCompare(String(b)));
    return res.json(names.map((name, i) => ({ id: i + 1, name })));
  } catch (e) {
    console.error("[catalog] /categories error (fallback a vacío):", e);
    return res.json([]);
  }
});

app.listen(PORT, () => {
  console.log(`✅ Catalog → http://localhost:${PORT}`);
});
