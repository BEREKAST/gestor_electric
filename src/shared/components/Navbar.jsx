import { Link, NavLink } from "react-router-dom";
import "./Navbar.css";
import useAuth from "/src/features/auth/context/useAuth.js";


export default function Navbar(){
  const { user } = useAuth();

  // Nombre a mostrar: name → email (antes de @) → "Mi perfil"
  const displayName =
    user?.name?.trim() ||
    (user?.email ? user.email.split("@")[0] : "") ||
    "Mi perfil";

  const isAdmin = user?.role === "admin";
  const isLogged = Boolean(user);

  return (
    <header className="nav">
      <div className="container nav__inner">
        <Link to="/" className="nav__brand">GestorElectric</Link>

        <nav className="nav__links">
          {/* Siempre */}
          <NavLink to="/" end>Inicio</NavLink>
          <NavLink to="/cart">Carrito</NavLink>

          {/* Usuario logueado NO admin → solo Inicio, Carrito, Perfil */}
          {isLogged && !isAdmin && (
            <NavLink to="/profile" className="pill">
              {displayName}
            </NavLink>
          )}

          {/* Admin o no logueado → mantenemos lo que ya había */}
          {!isLogged || isAdmin ? (
            <>
              <NavLink to="/seller">Vender</NavLink>
              <NavLink to="/register">Crear cuenta</NavLink>
              <NavLink to="/login" className="btn-primary">Ingresar</NavLink>
            </>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
