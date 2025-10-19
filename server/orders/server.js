import express from "express";
import cors from "cors";
import morgan from "morgan";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const app = express();
const PORT = 3004;
const CATALOG_URL = process.env.CATALOG_URL || "http://localhost:3002";

app.use(morgan("dev"));
app.use(cors());
app.use(express.json());

app.get("/health", (_, res) => res.json({ ok: true, service: "orders" }));

/**
 * POST /checkout
 * body: { customer:{name,email}, items:[{productId, quantity}] }
 * Valida precio y nombre desde Catalog, calcula total, crea order + items + payment.
 */
app.post("/checkout", async (req, res) => {
  try {
    const { customer, items } = req.body || {};
    if (!customer?.email || !customer?.name || !Array.isArray(items) || !items.length) {
      return res.status(400).json({ error: "customer{name,email} e items[] requeridos" });
    }

    // Traer productos del catálogo para fijar precio/nombre (evita manipulación del cliente)
    const fetchOne = async (id) => {
      const r = await fetch(`${CATALOG_URL}/products/${id}`);
      if (!r.ok) return null;
      return r.json();
    };

    const lines = [];
    for (const it of items) {
      const pid = Number(it.productId);
      const qty = Math.max(1, Number(it.quantity || 1));
      const p = await fetchOne(pid);
      if (!p) return res.status(400).json({ error: `Producto ${pid} no encontrado` });
      const unit = Number(p.price || 0);
      const lineTotal = unit * qty;
      lines.push({
        productId: pid,
        name: p.name,
        unitPrice: unit,
        quantity: qty,
        lineTotal
      });
    }

    const total = lines.reduce((a, b) => a + b.lineTotal, 0);

    const order = await prisma.order.create({
      data: {
        customerEmail: customer.email,
        customerName: customer.name,
        status: "paid",
        total,
        items: { create: lines },
        payments: {
          create: {
            method: "manual",
            status: "paid",
            amount: total,
            reference: `CHK-${Date.now()}`
          }
        }
      },
      include: { items: true, payments: true }
    });

    res.status(201).json({
      status: order.status,
      orderId: order.id,
      total: order.total,
      items: order.items,
      payment: order.payments[0]
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error en checkout" });
  }
});

// Listado simple
app.get("/orders", async (_req, res) => {
  const rows = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: { items: true, payments: true }
  });
  res.json(rows);
});

// Detalle
app.get("/orders/:id", async (req, res) => {
  const id = Number(req.params.id);
  const row = await prisma.order.findUnique({
    where: { id },
    include: { items: true, payments: true }
  });
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json(row);
});

// Estadísticas rápidas
app.get("/orders/stats", async (_req, res) => {
  const totalOrders = await prisma.order.count();
  const agg = await prisma.order.aggregate({ _sum: { total: true } });
  res.json({ totalOrders, totalRevenue: agg._sum.total || 0 });
});

// Webhook dummy (mantén compatibilidad)
app.post("/payments/webhook", (req, res) => {
  console.log("Webhook recibido:", req.body);
  res.json({ received: true });
});

app.listen(PORT, () => console.log(`Orders → :${PORT}`));
