import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "./HomePage.css";
import http from "../../../shared/lib/http.js";
import ProductCard from "../components/ProductCard.jsx";
import useAuth from "../../auth/context/useAuth.js";
import { PLAN_PERKS, getUserPlan } from "../../../shared/lib/constants.js";

export default function HomePage(){
  const { user } = useAuth();
  const plan = getUserPlan(user);
  const perks = PLAN_PERKS[plan] || PLAN_PERKS.free;

  // datos
  const [all, setAll] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // filtros
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");
  const [inStockOnly, setInStockOnly] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true); setError("");
      try {
        const data = await http.get("/products?limit=200");
        setAll(Array.isArray(data) ? data : []);
      } catch (e) {
        setAll([]);
        setError("No se pudieron cargar los productos.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const data = await http.get("/categories"); // [{id,name}]
        setCategories(data?.map(c => c.name) ?? []);
      } catch {
        // si no hay endpoint de categorías, derivamos desde productos
        setCategories(Array.from(new Set(all.map(p => p.category).filter(Boolean))));
      }
    })();
  }, [all]);

  const filtered = useMemo(() => {
    return all.filter(p => {
      if (q && !String(p.name || "").toLowerCase().includes(q.toLowerCase())) return false;
      if (cat && p.category !== cat) return false;
      if (inStockOnly && !(Number(p.stock) > 0)) return false;
      if (min && Number(p.price) < Number(min)) return false;
      if (max && Number(p.price) > Number(max)) return false;
      return true;
    });
  }, [all, q, cat, min, max, inStockOnly]);

  const maxVisible = perks?.catalog?.maxProductsOnHome || 20;
  const visible = filtered.slice(0, maxVisible);
  const isClamped = filtered.length > visible.length;

  const resetFilters = () => {
    setQ(""); setCat(""); setMin(""); setMax(""); setInStockOnly(false);
  };

  return (
    <section className="section">
      <div className="container home-grid">
        {/* Sidebar */}
        <aside className="sidebar card">
          <h3 className="sidebar__title">Planes y Vendedor</h3>
          <ul className="pub-list">
            <li className="pub">
              <strong>Modo vendedor</strong>
              {!user ? (
                <>
                  <p className="muted">Crea tu cuenta y publica tus productos.</p>
                  <Link className="cta-btn" to="/register?role=seller">Crear cuenta</Link>
                </>
              ) : (
                <>
                  <p className="muted">Gestiona tu catálogo desde el panel.</p>
                  <Link className="cta-btn" to="/seller">Ir a mi panel</Link>
                </>
              )}
            </li>

            <li className="pub pricing-mini">
              <div className="pricing-mini__header">
                <strong>Planes para vendedores</strong>
                <Link to="/pricing" className="mini-link">Ver todos »</Link>
              </div>

              <div className="pricing-mini__item">
                <div>
                  <span className="pricing-mini__title">Free</span>
                  <span className="pricing-mini__price">Bs0<span className="per">/mes</span></span>
                  <p className="muted">Hasta {PLAN_PERKS.free.productLimit} productos.</p>
                </div>
                <Link className="cta-btn" to={user ? "/seller" : "/register?role=seller"}>Comenzar</Link>
              </div>

              <div className="pricing-mini__item popular">
                <span className="badge-mini">Más popular</span>
                <div>
                  <span className="pricing-mini__title">Pro</span>
                  <span className="pricing-mini__price">Bs690<span className="per">/mes</span></span>
                  <p className="muted">Impuestos, informes y galería ampliada.</p>
                </div>
                <Link className="cta-btn" to={user ? "/checkout?plan=pro" : "/register?role=seller&plan=pro"}>Mejorar</Link>
              </div>

              <div className="pricing-mini__item">
                <div>
                  <span className="pricing-mini__title">Enterprise</span>
                  <span className="pricing-mini__price">Custom</span>
                  <p className="muted">Límites altos y auditoría.</p>
                </div>
                <a className="cta-btn" href="mailto:ventas@gestorelectric.com?subject=GestorElectric%20Enterprise">Contactar</a>
              </div>
            </li>
          </ul>
        </aside>

        {/* Main */}
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

          {loading && (
            <div className="card info"><p>Cargando productos…</p></div>
          )}
          {!loading && error && (
            <div className="card danger"><p>{error}</p></div>
          )}

          {!loading && !error && !all.length && (
            <div className="card empty">
              <p>No hay productos publicados aún.</p>
              <p className="muted">Si eres vendedor, <Link to="/seller">publica tus primeros productos</Link>.</p>
            </div>
          )}

          {!loading && !error && !!all.length && (
            <>
              {isClamped && (
                <div className="card info">
                  <p>
                    Mostrando <strong>{visible.length}</strong> de <strong>{filtered.length}</strong> resultados.
                    Para ver más en el inicio, considera <Link to="/pricing">mejorar tu plan</Link>.
                  </p>
                </div>
              )}

              <div className="grid-products">
                {visible.map(p => <ProductCard key={p.id} product={p} />)}
                {!visible.length && (
                  <div className="card empty">
                    <p>No hay productos que coincidan con los filtros.</p>
                  </div>
                )}
              </div>
            </>
          )}

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
