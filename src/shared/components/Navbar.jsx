// src/shared/components/Navbar.jsx
import { Link, NavLink } from "react-router-dom";
import "./Navbar.css";
import useAuth from "/src/features/auth/context/useAuth.js";

export default function Navbar() {
  const { user, logout } = useAuth();

  const isLogged = !!user;
  const isAdmin = user?.role === "admin";
  const hasPlan = ["free", "pro", "enterprise"].includes(user?.plan || "");
  const canSell = isLogged && hasPlan; // ✅ mostrar "Vender" con cualquier plan

  const displayName =
    user?.name?.trim() ||
    (user?.email ? user.email.split("@")[0] : "") ||
    "Mi perfil";

  return (
    <header className="nav">
      <div className="container nav__inner">
        <Link to="/" className="nav__brand">GestorElectric</Link>

        <nav className="nav__links">
          {/* Siempre */}
          <NavLink to="/" end>Inicio</NavLink>
          <NavLink to="/cart">Carrito</NavLink>

          {/* ✅ Mostrar "Vender" si está logueado y tiene plan (free/pro/enterprise) */}
          {canSell && <NavLink to="/seller">Vender</NavLink>}

          {/* Usuario logueado */}
          {isLogged ? (
            <>
              <NavLink to="/profile" className="pill">{displayName}</NavLink>
              {user?.plan && (
                <span className={`plan-badge plan-${user.plan}`}>
                  {user.plan.toUpperCase()}
                </span>
              )}
              <button className="btn-link" onClick={logout}>Cerrar sesión</button>
            </>
          ) : (
            // No logueado
            <>
              <NavLink to="/register">Crear cuenta</NavLink>
              <NavLink to="/login" className="btn-primary">Ingresar</NavLink>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
