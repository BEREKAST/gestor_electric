import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "./HomePage.css";
import http from "../../../shared/lib/http.js";
import ProductCard from "../components/ProductCard.jsx";
import useAuth from "../../auth/context/useAuth.js";

export default function HomePage(){
  const { user } = useAuth();

  // datos
  const [all, setAll] = useState([]);
  const [categories, setCategories] = useState([]);

  // filtros
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");
  const [inStockOnly, setInStockOnly] = useState(false);

  // cargar productos
  useEffect(() => {
    (async () => {
      try {
        const data = await http.get("/products?limit=60");
        setAll(data);
      } catch {
        // Mock si no hay backend
        setAll([
          { id: "1", name: "Medidor Digital", price: 120.5, image: "/placeholder/medidor.jpg", stock: 12, category: "Medición" },
          { id: "2", name: "Transformador 5kVA", price: 890, image: "/placeholder/trafo.jpg", stock: 4, category: "Transformadores" },
          { id: "3", name: "Cable THHN 12AWG", price: 45.9, image: "/placeholder/cable.jpg", stock: 0, category: "Cables" },
          { id: "4", name: "Panel Solar 400W", price: 210, image: "/placeholder/trafo.jpg", stock: 20, category: "Energía" },
        ]);
      }
    })();
  }, []);

  // cargar categorías
  useEffect(() => {
    (async () => {
      try {
        const data = await http.get("/categories"); // [{id,name}]
        setCategories(data?.map(c => c.name) ?? []);
      } catch {
        // Derivar de productos si no hay backend
        setCategories(Array.from(new Set(all.map(p => p.category).filter(Boolean))));
      }
    })();
  }, [all]);

  const filtered = useMemo(() => {
    return all.filter(p => {
      if (q && !p.name.toLowerCase().includes(q.toLowerCase())) return false;
      if (cat && p.category !== cat) return false;
      if (inStockOnly && !(Number(p.stock) > 0)) return false;
      if (min && Number(p.price) < Number(min)) return false;
      if (max && Number(p.price) > Number(max)) return false;
      return true;
    });
  }, [all, q, cat, min, max, inStockOnly]);

  const resetFilters = () => {
    setQ(""); setCat(""); setMin(""); setMax(""); setInStockOnly(false);
  };

  return (
    <section className="section">
      <div className="container home-grid">
        {/* Sidebar: publicaciones */}
        <aside className="sidebar card">
          <h3 className="sidebar__title">Publicaciones</h3>
          <ul className="pub-list">

            {/* Freemium → CTA vendedor */}
            <li className="pub freemium">
              <strong>🆓 Plan Freemium para vendedores</strong>
              <p className="muted">Publica hasta 20 productos y empieza hoy mismo.</p>
              {!user ? (
                <Link className="cta-btn" to="/register?role=seller">Suscribirme (gratis)</Link>
              ) : user.role !== "seller" ? (
                <Link className="cta-btn" to="/seller">Activar modo vendedor</Link>
              ) : (
                <Link className="cta-btn" to="/seller">Ir a mi panel</Link>
              )}
            </li>

            {/* === Mini Pricing en sidebar === */}
            <li className="pub pricing-mini">
              <div className="pricing-mini__header">
                <strong>Planes para vendedores</strong>
                <Link to="/pricing" className="mini-link">Ver todos »</Link>
              </div>

              {/* Free */}
              <div className="pricing-mini__item">
                <div>
                  <span className="pricing-mini__title">Free</span>
                  <span className="pricing-mini__price">Bs0<span className="per">/mes</span></span>
                  <p className="muted">Para pruebas o equipos pequeños</p>
                </div>
                {!user ? (
                  <Link className="cta-btn" to="/register?role=seller">Comenzar</Link>
                ) : (
                  <Link className="cta-btn" to="/seller">Comenzar</Link>
                )}
              </div>

              {/* Pro */}
              <div className="pricing-mini__item popular">
                <span className="badge-mini">Más popular</span>
                <div>
                  <span className="pricing-mini__title">Pro</span>
                  <span className="pricing-mini__price">Bs690<span className="per">/mes</span></span>
                  <p className="muted">Operación seria y alertas avanzadas</p>
                </div>
                {!user ? (
                  <Link className="cta-btn" to="/register?role=seller&plan=pro">Comenzar</Link>
                ) : (
                  <Link className="cta-btn" to="/checkout?plan=pro">Comenzar</Link>
                )}
              </div>

              {/* Enterprise */}
              <div className="pricing-mini__item">
                <div>
                  <span className="pricing-mini__title">Enterprise</span>
                  <span className="pricing-mini__price">Custom</span>
                  <p className="muted">Escala ilimitada y soporte 24/7</p>
                </div>
                <a className="cta-btn" href="mailto:ventas@gestorelectric.com?subject=GestorElectric%20Enterprise">
                  Contactar
                </a>
              </div>
            </li>

            {/* Otras publicaciones */}
            <li className="pub">
              <Link to="/product/2">⚡ Nueva línea de transformadores</Link>
              <p className="muted">Descuentos por lanzamiento esta semana.</p>
            </li>
            <li className="pub">
              <a href="#" onClick={(e)=>e.preventDefault()}>🔧 Guía: elegir calibre de cable</a>
              <p className="muted">Tabla rápida por amperaje y distancia.</p>
            </li>
            <li className="pub">
              <a href="#" onClick={(e)=>e.preventDefault()}>🌞 Kits solares para hogar</a>
              <p className="muted">Paneles 400W + inversor off-grid.</p>
            </li>
          </ul>
        </aside>

        {/* Main: buscador + grilla */}
        <div className="content">
          <div className="filters card">
            <input
              className="filters__search"
              placeholder="Buscar productos (ej. cable, panel, medidor)…"
              value={q} onChange={(e)=>setQ(e.target.value)}
            />
            <div className="filters__row">
              <select value={cat} onChange={(e)=>setCat(e.target.value)}>
                <option value="">Todas las categorías</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <div className="price">
                <input type="number" min="0" placeholder="Precio mín."
                       value={min} onChange={(e)=>setMin(e.target.value)} />
                <span>-</span>
                <input type="number" min="0" placeholder="Precio máx."
                       value={max} onChange={(e)=>setMax(e.target.value)} />
              </div>
              <label className="chk">
                <input type="checkbox" checked={inStockOnly}
                       onChange={(e)=>setInStockOnly(e.target.checked)} />
                Solo con stock
              </label>
              <button className="btn btn--ghost" onClick={resetFilters}>Limpiar</button>
            </div>
          </div>

          <div className="grid-products">
            {filtered.map(p => (
              <ProductCard key={p.id} product={p} />
            ))}
            {!filtered.length && (
              <div className="card empty">
                <p>No hay productos que coincidan con los filtros.</p>
              </div>
            )}
          </div>

          {/* Nota para no registrados */}
          {!user && (
            <p className="muted note-login">
              Para comprar, <Link to="/login">inicia sesión</Link> o <Link to="/register">crea tu cuenta</Link>.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
