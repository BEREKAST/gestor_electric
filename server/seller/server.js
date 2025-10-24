import express from "express";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";

const app = express();
const prisma = new PrismaClient();

// === ENV ===
const PORT = process.env.PORT || 3003;
const ORIGIN = process.env.CORS_ORIGIN || "http://localhost:5173";
const SECRET = process.env.AUTH_JWT_SECRET || process.env.JWT_SECRET || "dev_secret_change_me";
const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";

// === Middlewares base ===
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
app.use(express.json());
app.use("/uploads", express.static(UPLOAD_DIR));

// === Auth por cookie/bearer ===
function requireAuth(req, res, next) {
  try {
    const token = req.cookies?.token || req.headers.authorization?.replace(/^Bearer\s+/i, "");
    if (!token) return res.status(401).json({ error: "NO_AUTH" });
    const data = jwt.verify(token, SECRET);
    req.user = data; // { id, email, role, plan, name }
    return next();
  } catch {
    return res.status(401).json({ error: "INVALID_TOKEN" });
  }
}

// === Multer (disco) ===
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "");
    const base = path.basename(file.originalname || "file", ext);
    cb(null, `${Date.now()}-${base}${ext}`);
  },
});
const upload = multer({ storage });

// === HEALTH ===
app.get("/seller/health", (_req, res) => res.json({ ok: true, service: "seller" }));

/* -------------------- PÚBLICO PARA HOME (sin auth) -------------------- */

// GET /products  → usado por Home (limit opcional)
app.get("/products", async (req, res) => {
  try {
    const take = Math.min(parseInt(String(req.query.limit || 200), 10) || 200, 500);
    const products = await prisma.product.findMany({
      take,
      orderBy: { createdAt: "desc" },
      include: { images: true },
    });
    res.json(products);
  } catch (e) {
    console.error("[public] list products:", e);
    res.status(200).json([]);
  }
});

// GET /products/:id  → usado por ProductDetailPage (público)
app.get("/products/:id", async (req, res) => {
  try {
    const id = String(req.params.id);
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        images: true,
        // seller: { select: { displayName: true, email: true } }
      },
    });
    if (!product) return res.status(404).json({ error: "NOT_FOUND" });

    const sellerDisplay =
      product?.seller?.displayName ||
      product?.sellerName ||
      "";

    const payload = {
      ...product,
      seller: { displayName: sellerDisplay },
    };

    res.json(payload);
  } catch (e) {
    console.error("[public] product detail:", e);
    res.status(500).json({ error: "DETAIL_FAILED" });
  }
});

// GET /categories
app.get("/categories", async (_req, res) => {
  try {
    const rows = await prisma.product.findMany({
      select: { category: true },
      where: { NOT: { category: null } },
    }).catch(() => []);
    const cats = Array.from(new Set((rows || []).map(r => r?.category).filter(Boolean)));
    res.json(cats);
  } catch {
    res.json([]);
  }
});

/* ------------------------- Productos (privado) ------------------------- */

// GET /seller/products
app.get("/seller/products", requireAuth, async (_req, res) => {
  try {
    const where = {}; // ej: { sellerId: req.user.id }
    const products = await prisma.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { images: true },
    });
    res.json(products);
  } catch (e) {
    console.error("[seller] list products:", e);
    res.status(500).json({ error: "LIST_PRODUCTS_FAILED" });
  }
});

// GET /seller/products/count
app.get("/seller/products/count", requireAuth, async (_req, res) => {
  try {
    const where = {}; // ej: { sellerId: req.user.id }
    const count = await prisma.product.count({ where });
    res.json({ count });
  } catch (e) {
    console.error("[seller] count products:", e);
    res.status(500).json({ error: "COUNT_PRODUCTS_FAILED" });
  }
});

// POST /seller/upload  (FormData: files[])
app.post("/seller/upload", requireAuth, upload.array("files"), async (req, res) => {
  try {
    const files = req.files || [];
    const out = files.map((f, i) => ({
      url: `/uploads/${path.basename(f.path)}`,
      alt: f.originalname || `img-${i + 1}`,
      order: i,
    }));
    res.json(out);
  } catch (e) {
    console.error("[seller] upload:", e);
    res.status(500).json({ error: "UPLOAD_FAILED" });
  }
});

// POST /seller/products
app.post("/seller/products", requireAuth, async (req, res) => {
  try {
    const { name, price, stock, images = [], category, sellerName } = req.body || {};
    if (!name || typeof price === "undefined" || typeof stock === "undefined") {
      return res.status(400).json({ error: "MISSING_FIELDS" });
    }
    const created = await prisma.product.create({
      data: {
        name,
        price: Number(price),
        stock: Number(stock),
        ...(category ? { category: String(category) } : {}),
        ...(sellerName ? { sellerName: String(sellerName) } : {}),
        images: {
          create: (Array.isArray(images) ? images : []).map((im, i) => ({
            url: String(im.url || ""),
            alt: String(im.alt || `img-${i + 1}`),
            order: Number(im.order ?? i),
          })),
        },
      },
      include: { images: true },
    });
    res.status(201).json(created);
  } catch (e) {
    console.error("[seller] create product:", e);
    res.status(500).json({ error: "CREATE_PRODUCT_FAILED" });
  }
});

// PUT /seller/products/:id
app.put("/seller/products/:id", requireAuth, async (req, res) => {
  try {
    const id = req.params.id;
    const { name, price, stock, images, category, sellerName } = req.body || {};
    const data = {};
    if (typeof name !== "undefined") data.name = name;
    if (typeof price !== "undefined") data.price = Number(price);
    if (typeof stock !== "undefined") data.stock = Number(stock);
    if (typeof category !== "undefined") data.category = String(category || "");
    if (typeof sellerName !== "undefined") data.sellerName = String(sellerName || "");

    let updated;
    if (Array.isArray(images)) {
      await prisma.productImage.deleteMany({ where: { productId: id } });
      updated = await prisma.product.update({
        where: { id },
        data: {
          ...data,
          images: {
            create: images.map((im, i) => ({
              url: String(im.url || ""),
              alt: String(im.alt || `img-${i + 1}`),
              order: Number(im.order ?? i),
            })),
          },
        },
        include: { images: true },
      });
    } else {
      updated = await prisma.product.update({
        where: { id },
        data,
        include: { images: true },
      });
    }
    res.json(updated);
  } catch (e) {
    console.error("[seller] update product:", e);
    res.status(500).json({ error: "UPDATE_PRODUCT_FAILED" });
  }
});

// DELETE /seller/products/:id
app.delete("/seller/products/:id", requireAuth, async (req, res) => {
  try {
    const id = req.params.id;
    await prisma.productImage.deleteMany({ where: { productId: id } }).catch(() => {});
    await prisma.product.delete({ where: { id } });
    res.json({ ok: true });
  } catch (e) {
    console.error("[seller] delete product:", e);
    res.status(500).json({ error: "DELETE_PRODUCT_FAILED" });
  }
});

/* ------------------------- Impuestos ------------------------- */
app.get("/seller/taxes", requireAuth, async (_req, res) => {
  try {
    const taxes = await prisma.sellerTax?.findMany?.({ orderBy: { id: "asc" } }) || [];
    res.json(taxes);
  } catch {
    res.json([]);
  }
});

app.post("/seller/taxes", requireAuth, async (req, res) => {
  try {
    const { region, rate } = req.body || {};
    if (!region || typeof rate === "undefined") return res.status(400).json({ error: "MISSING_FIELDS" });
    if (!prisma.sellerTax?.create) return res.status(501).json({ error: "TAXES_NOT_IMPLEMENTED" });
    const created = await prisma.sellerTax.create({ data: { region: String(region), rate: Number(rate) } });
    res.status(201).json(created);
  } catch (e) {
    console.error("[seller] create tax:", e);
    res.status(500).json({ error: "CREATE_TAX_FAILED" });
  }
});

app.delete("/seller/taxes/:id", requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!prisma.sellerTax?.delete) return res.status(501).json({ error: "TAXES_NOT_IMPLEMENTED" });
    await prisma.sellerTax.delete({ where: { id } });
    res.json({ ok: true });
  } catch (e) {
    console.error("[seller] delete tax:", e);
    res.status(500).json({ error: "DELETE_TAX_FAILED" });
  }
});

/* ------------------------- Seguridad / Finanzas ------------------------- */
app.get("/seller/security/events", requireAuth, async (_req, res) => {
  res.json([]);
});

app.get("/seller/finance", requireAuth, async (_req, res) => {
  res.json({ ingresos: [], gastos: [] });
});

/* ------------------------- Start ------------------------- */
app.listen(PORT, () => {
  console.log(`✅ Seller → http://localhost:${PORT}`);
});
