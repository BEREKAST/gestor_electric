import express from "express";
import morgan from "morgan";
import cors from "cors";
import cookieParser from "cookie-parser";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const app = express();

// === CONFIG GENERAL ===
const PORT = process.env.PORT || 3001;
const SECRET = process.env.AUTH_JWT_SECRET || process.env.JWT_SECRET || "dev_secret_change_me";
const ORIGIN = process.env.CORS_ORIGIN || "http://localhost:5173";

// ✅ cookies correctas detrás de proxy/gateway
app.set("trust proxy", 1);

// ✅ opciones de cookie coherentes dev/prod
const cookieOpts = {
  httpOnly: true,
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/", // siempre incluir
};

// ✅ CORS CONFIG (debe ir antes de las rutas)
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (origin === ORIGIN) return cb(null, true);
      console.warn("❌ Bloqueado por CORS:", origin);
      cb(new Error("CORS not allowed"));
    },
    credentials: true,
  })
);

app.use(morgan("dev"));
app.use(express.json());
app.use(cookieParser());

// === JWT helper ===
const sign = (payload) => jwt.sign(payload, SECRET, { expiresIn: "7d" });

// === health ===
app.get("/auth/health", (_, res) => res.json({ ok: true, service: "auth" }));

// --- helper para autenticar por cookie JWT
function requireAuth(req, res, next) {
  const token = req.cookies?.token;
  if (!token) return res.status(401).json({ error: "no autenticado" });
  try {
    const data = jwt.verify(token, SECRET);
    req.user = data;
    next();
  } catch {
    return res.status(401).json({ error: "token inválido" });
  }
}

// === Registro ===
app.post("/auth/register", async (req, res) => {
  try {
    const { name, email, password, role = "buyer" } = req.body || {};
    if (!email || !password)
      return res.status(400).json({ error: "email y password requeridos" });

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return res.status(409).json({ error: "email ya registrado" });

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { name, email, passwordHash, role, plan: "free" },
    });

    const token = sign({
      id: user.id,
      email: user.email,
      role: user.role,
      plan: user.plan,
      name: user.name,
    });

    // ✅ cookie en dev/producción segura
    res.cookie("token", token, cookieOpts);
    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        plan: user.plan,
      },
    });
  } catch (e) {
    if (e.code === "P2002") {
      return res.status(409).json({ error: "email ya registrado" });
    }
    console.error("❌ Error en /auth/register:", e);
    res.status(500).json({ error: "error al registrar" });
  }
});

// === Login ===
app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: "Credenciales inválidas" });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Credenciales inválidas" });

    const token = sign({
      id: user.id,
      email: user.email,
      role: user.role,
      plan: user.plan,
      name: user.name,
    });

    res.cookie("token", token, cookieOpts);
    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        plan: user.plan,
      },
    });
  } catch (e) {
    console.error("❌ Error en /auth/login:", e);
    res.status(500).json({ error: "error al iniciar sesión" });
  }
});

// === Obtener usuario actual ===
app.get("/auth/me", async (req, res) => {
  const t = req.cookies?.token;
  if (!t) return res.json({ user: null });
  try {
    const data = jwt.verify(t, SECRET);
    const user = await prisma.user.findUnique({ where: { id: data.id } });
    if (!user) return res.json({ user: null });
    res.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        plan: user.plan,
        name: user.name,
      },
    });
  } catch {
    res.json({ user: null });
  }
});

// === Cambiar plan ===
app.patch("/auth/plan", requireAuth, async (req, res) => {
  try {
    const { plan } = req.body || {};
    const allowed = ["free", "pro", "enterprise"];
    if (!allowed.includes(plan))
      return res.status(400).json({ error: "plan inválido" });

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: { plan },
    });

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
    console.error("❌ Error en /auth/plan:", e);
    res.status(500).json({ error: "no se pudo actualizar el plan" });
  }
});

// === Logout ===
app.post("/auth/logout", (req, res) => {
  res.clearCookie("token", cookieOpts);
  res.json({ ok: true });
});

// === Start ===
app.listen(PORT, () => console.log(`✅ Auth → http://localhost:${PORT}`));
