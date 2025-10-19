import express from "express";
import cors from "cors";
import morgan from "morgan";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const app = express();
const PORT = 3002;

app.use(morgan("dev"));
app.use(cors());
app.use(express.json());

app.get("/health", (_,res)=>res.json({ ok:true, service:"catalog" }));

app.get("/products", async (req, res) => {
  const limit = Number(req.query.limit || 100);
  const rows = await prisma.product.findMany({
    include:{ category:true },
    take: limit,
    orderBy: { id: "asc" }
  });
  res.json(rows.map(p => ({
    id: String(p.id),
    name: p.name,
    price: p.price,
    image: p.image,
    stock: p.stock,
    category: p.category?.name || null
  })));
});

app.get("/products/:id", async (req, res) => {
  const id = Number(req.params.id);
  const p = await prisma.product.findUnique({ where:{ id }, include:{ category:true } });
  if (!p) return res.status(404).json({ error:"Not found" });
  res.json({
    id: String(p.id), name: p.name, price: p.price, image: p.image,
    stock: p.stock, category: p.category?.name || null
  });
});

app.get("/categories", async (_,res) => {
  const cats = await prisma.category.findMany({ orderBy:{ name:"asc" } });
  res.json(cats.map(c => ({ id: c.id, name: c.name })));
});

app.listen(PORT, ()=>console.log(`Catalog → :${PORT}`));
