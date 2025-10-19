import express from "express";
import cors from "cors";
import morgan from "morgan";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const app = express();
const PORT = 3003;

app.use(morgan("dev"));
app.use(cors());
app.use(express.json());

app.get("/health", (_,res)=>res.json({ ok:true, service:"seller" }));

// Tasas
app.get("/seller/taxes", async (_req,res)=>{
  const rows = await prisma.tax.findMany({ orderBy:{ createdAt:"desc" }});
  res.json(rows);
});
app.post("/seller/taxes", async (req,res)=>{
  const { region, rate } = req.body || {};
  if (!region || rate == null) return res.status(400).json({ error:"region y rate requeridos" });
  const created = await prisma.tax.create({ data:{ region, rate:Number(rate) }});
  res.status(201).json(created);
});
app.delete("/seller/taxes/:id", async (req,res)=>{
  await prisma.tax.delete({ where:{ id:Number(req.params.id) }}).catch(()=>null);
  res.json({ ok:true });
});

// Seguridad
app.get("/seller/security/events", async (_req,res)=>{
  const rows = await prisma.securityEvent.findMany({ orderBy:{ ts:"desc" }});
  res.json(rows);
});

// Finanzas
app.get("/seller/finance", async (_req,res)=>{
  const ingresos = await prisma.financeIncome.findMany({ orderBy:{ fecha:"asc" }});
  const gastos   = await prisma.financeExpense.findMany({ orderBy:{ fecha:"asc" }});
  const f = (d)=> new Date(d).toISOString().slice(0,10);
  res.json({
    ingresos: ingresos.map(i=>({ id:`I-${i.id}`, fecha:f(i.fecha), concepto:i.concepto, monto:i.monto })),
    gastos:   gastos.map(g=>({ id:`G-${g.id}`, fecha:f(g.fecha), concepto:g.concepto, monto:g.monto }))
  });
});

// Analítica (resumen)
app.get("/seller/analytics/summary", async (_req,res)=>{
  const inc = await prisma.financeIncome.aggregate({ _sum:{ monto:true }});
  const exp = await prisma.financeExpense.aggregate({ _sum:{ monto:true }});
  const totalIncome  = inc._sum.monto || 0;
  const totalExpense = exp._sum.monto || 0;
  const net = totalIncome - totalExpense;
  res.json({ totalIncome, totalExpense, net });
});

// Export CSV simple (finanzas)
app.get("/seller/finance/export.csv", async (_req,res)=>{
  const [ingresos, gastos] = await Promise.all([
    prisma.financeIncome.findMany({ orderBy:{ fecha:"asc" }}),
    prisma.financeExpense.findMany({ orderBy:{ fecha:"asc" }})
  ]);
  const rows = [
    "tipo,fecha,concepto,monto",
    ...ingresos.map(i=>`ingreso,${i.fecha.toISOString().slice(0,10)},${i.concepto},${i.monto}`),
    ...gastos.map(g=>`gasto,${g.fecha.toISOString().slice(0,10)},${g.concepto},${g.monto}`)
  ];
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", "attachment; filename=finanzas.csv");
  res.send(rows.join("\n"));
});

app.listen(PORT, ()=>console.log(`Seller → :${PORT}`));
