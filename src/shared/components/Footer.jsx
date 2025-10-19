import { Link } from "react-router-dom";
import "./Footer.css";

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="footer">
      <div className="container footer__inner">
        <div className="footer__brand">
          <strong>GestorElectric</strong>
          <span>Marketplace de productos eléctricos</span>
        </div>

        <nav className="footer__links">
          <Link to="/">Inicio</Link>
          <Link to="/pricing">Planes</Link>
          <Link to="/seller">Vender</Link>
          <Link to="/cart">Carrito</Link>
          <a href="mailto:soporte@gestorelectric.com">Soporte</a>
        </nav>
      </div>

      <div className="footer__bottom">
        <div className="container">
          <small>© {year} GestorElectric. Todos los derechos reservados.</small>
        </div>
      </div>
    </footer>
  );
}
