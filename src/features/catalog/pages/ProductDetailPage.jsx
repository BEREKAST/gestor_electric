import { useParams, Link, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import "./ProductDetailPage.css";
import http from "../../../shared/lib/http.js";
import useAuth from "../../auth/context/useAuth.js";
import { PLAN_PERKS, getUserPlan } from "../../../shared/lib/constants.js";
import { addItem } from "../../../shared/lib/cart.js";

export default function ProductDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();

  // Plan solo para limitar galería (sin bloquear specs)
  const plan = getUserPlan(user);
  const perks =
    (PLAN_PERKS?.[plan] ?? PLAN_PERKS?.free) ?? { catalog: { showGallery: 1 } };

  const [product, setProduct] = useState(null);
  const [error, setError] = useState("");

  // Host del gateway (para absolutizar /uploads/...)
  const API_HOST = useMemo(() => {
    const base = import.meta.env.VITE_API_URL || "http://localhost:8080/api";
    return base.replace(/\/api\/?$/i, "");
  }, []);

  const absolutize = (urlLike) => {
    if (!urlLike) return "";
    const u = String(urlLike);
    if (/^https?:\/\//i.test(u)) return u;       // ya es absoluta
    if (u.startsWith("/")) return `${API_HOST}${u}`; // ej: /uploads/x.jpg
    return `${API_HOST}/${u.replace(/^\.?\//, "")}`;
  };

  // === CARGAR DETALLE DE PRODUCTO ===
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await http.get(`/products/${id}`);
        if (mounted) setProduct(data);
      } catch (e) {
        console.error("Error al cargar producto:", e);
        if (mounted) setError("No se pudo cargar el producto.");
      }
    })();
    return () => { mounted = false; };
  }, [id]);

  // === GALERÍA (limitada por plan) ===
  const gallery = useMemo(() => {
    const imgs = product?.images || (product?.image ? [{ url: product.image }] : []);
    const max = perks?.catalog?.showGallery ?? 1;
    return imgs.slice(0, max).map(g => ({ ...g, url: absolutize(g.url || product?.image) }));
  }, [product, perks?.catalog?.showGallery, API_HOST]);

  // === VENDEDOR REAL ===
  const sellerName =
    product?.seller?.displayName ||
    product?.sellerName ||
    "Vendedor";

  const sellerInitials = useMemo(() => {
    const safe = (sellerName || "Vendedor").trim();
    if (!safe) return "VD";
    return safe
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() || "")
      .join("") || "VD";
  }, [sellerName]);

  // === FORMATO PRECIO ===
  const formattedPrice = useMemo(() => {
    const n = Number(product?.price ?? 0);
    return `Bs ${n.toFixed(2)}`;
  }, [product?.price]);

  // === ERRORES / CARGA ===
  if (error) {
    return (
      <section className="section">
        <div className="container">
          <div className="card pdp__card pdp__card--error" role="alert" aria-live="polite">
            <h3 className="pdp__alertTitle">Hubo un problema</h3>
            <p className="pdp__alertMsg">{error}</p>
            <div className="pdp__alertActions">
              <button className="btn btn--ghost" onClick={() => nav(-1)}>Volver</button>
              <Link className="btn" to="/">Ir al inicio</Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (!product) {
    return (
      <section className="section">
        <div className="container">
          <div className="pdp__skeleton">
            <div className="pdp__skeletonMedia card" />
            <div className="pdp__skeletonInfo card" />
          </div>
        </div>
      </section>
    );
  }

  const outOfStock = Number(product.stock ?? 0) <= 0;

  // === UI PRINCIPAL ===
  return (
    <section className="section">
      <div className="container pdp">
        {/* Breadcrumb */}
        <nav className="pdp__crumb" aria-label="Breadcrumb">
          <ol>
            <li><Link to="/">Inicio</Link></li>
            <li aria-current="page">Producto</li>
          </ol>
        </nav>

        {/* Media */}
        <div className="pdp__media card pdp__card">
          <div className="pdp__gallery">
            {gallery.length > 0 ? (
              gallery.map((g, i) => (
                <figure key={i} className="pdp__figure">
                  <img
                    src={g.url}
                    alt={g.alt || product.name || `Imagen ${i + 1}`}
                    className="pdp__img"
                    loading="lazy"
                    onError={(e) => e.currentTarget.classList.add("is-hidden")}
                  />
                </figure>
              ))
            ) : (
              <div className="pdp__noImg">Sin imágenes disponibles</div>
            )}
          </div>

          {product.images && product.images.length > gallery.length && (
            <div className="pdp__locked">
              <p className="pdp__lockedText">
                Este producto tiene más imágenes. Mejora tu plan para ver la galería completa.
              </p>
              <Link to="/pricing" className="btn btn--ghost">Ver planes</Link>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="pdp__info card pdp__card">
          <header className="pdp__header">
            <h1 className="pdp__title">{product.name}</h1>
            <div className="pdp__priceWrap">
              <span className="pdp__price">{formattedPrice}</span>
              {outOfStock ? (
                <span className="badge badge--danger">Sin stock</span>
              ) : (
                <span className="badge">Disponible</span>
              )}
            </div>
          </header>

          {product.description && <p className="pdp__desc">{product.description}</p>}

          <div className="pdp__sellerCard" aria-label={`Vendido por ${sellerName}`}>
            <div className="pdp__sellerAvatar" aria-hidden="true">{sellerInitials}</div>
            <div className="pdp__sellerMeta">
              <p className="pdp__sellerName">Vendido por: <strong>{sellerName}</strong></p>
              <p className="pdp__sellerBadges">
                <span className="badge">Vendedor verificado</span>
              </p>
            </div>
          </div>

          <div className="pdp__actions">
            <button
              className="btn"
              disabled={outOfStock}
              onClick={() => {
                addItem(product, 1);
                const el = document.getElementById("pdp-live");
                if (el) el.textContent = "Producto agregado al carrito";
                alert("Producto agregado al carrito");
              }}
            >
              Añadir al carrito
            </button>

            <button
              className="btn btn--ghost"
              disabled={outOfStock}
              onClick={() => {
                const oneItem = [{ id: String(product.id), name: product.name, price: Number(product.price), qty: 1 }];
                localStorage.setItem("cart", JSON.stringify(oneItem));
                nav("/checkout");
              }}
            >
              Comprar ahora
            </button>
          </div>

          <footer className="pdp__footer">
            <small className="pdp__stock">{outOfStock ? "Stock: 0" : `Stock: ${product.stock}`}</small>
          </footer>

          <div id="pdp-live" className="sr-only" aria-live="polite" />
        </div>
      </div>
    </section>
  );
}
