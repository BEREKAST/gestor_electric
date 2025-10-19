import express from "express";
import morgan from "morgan";
import cors from "cors";
import cookieParser from "cookie-parser";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const app = express();

// ✅ PORT por ENV (sin hardcode)
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";
const ORIGIN = process.env.CORS_ORIGIN || "http://localhost:5173";

// ✅ cookies correctas detrás de proxy/gateway
app.set("trust proxy", 1);

// ✅ opciones de cookie coherentes dev/prod
const cookieOpts = {
  httpOnly: true,
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  secure: process.env.NODE_ENV === "production",
};

app.use(morgan("dev"));
app.use(express.json());
app.use(cookieParser());
app.use(cors({ origin: ORIGIN, credentials: true }));

const sign = (payload) => jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });

// ✅ health namespaced (no rompe otros servicios)
app.get("/auth/health", (_, res) => res.json({ ok: true, service: "auth" }));

// --- helper para autenticar por cookie JWT
function requireAuth(req, res, next) {
  const t = req.cookies?.token;
  if (!t) return res.status(401).json({ error: "no autenticado" });
  try {
    const data = jwt.verify(t, JWT_SECRET);
    req.user = data;
    next();
  } catch {
    return res.status(401).json({ error: "token inválido" });
  }
}

app.post("/auth/register", async (req, res) => {
  try {
    const { name, email, password, role = "buyer" } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: "email y password requeridos" });

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return res.status(409).json({ error: "email ya registrado" });

    const passwordHash = await bcrypt.hash(password, 10);

    // ✅ SIEMPRE crear con plan 'free' (se actualizará más adelante tras pago)
    const user = await prisma.user.create({
      data: { name, email, passwordHash, role, plan: "free" },
    });

    const token = sign({ id: user.id, email, role: user.role, plan: user.plan, name: user.name });
    res.cookie("token", token, cookieOpts);
    res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role, plan: user.plan } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "error al registrar" });
  }
});

app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: "Credenciales inválidas" });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Credenciales inválidas" });

    const token = sign({ id: user.id, email: user.email, role: user.role, plan: user.plan, name: user.name });
    res.cookie("token", token, cookieOpts);
    res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role, plan: user.plan } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "error al iniciar sesión" });
  }
});

app.get("/auth/me", async (req, res) => {
  const t = req.cookies?.token;
  if (!t) return res.json({ user: null });
  try {
    const data = jwt.verify(t, JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: data.id } });
    if (!user) return res.json({ user: null });
    res.json({ user: { id: user.id, email: user.email, role: user.role, plan: user.plan, name: user.name } });
  } catch {
    res.json({ user: null });
  }
});

// ✅ Cambiar plan tras pago (free|pro|enterprise)
app.patch("/auth/plan", requireAuth, async (req, res) => {
  try {
    const { plan } = req.body || {};
    const allowed = ["free", "pro", "enterprise"];
    if (!allowed.includes(plan)) return res.status(400).json({ error: "plan inválido" });

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: { plan },
    });

    // refresca cookie
    const token = sign({
      id: updated.id,
      email: updated.email,
      role: updated.role,
      plan: updated.plan,
      name: updated.name,
    });
    res.cookie("token", token, cookieOpts);

    res.json({
      user: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        role: updated.role,
        plan: updated.plan,
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "no se pudo actualizar el plan" });
  }
});

// ✅ logout para frontend
app.post("/auth/logout", (req, res) => {
  res.clearCookie("token", cookieOpts);
  res.json({ ok: true });
});

app.listen(PORT, () => console.log(`Auth → :${PORT}`));
