import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "./CartPage.css";
import http from "../../../shared/lib/http.js";

const FREE_SHIPPING_THRESHOLD = 150;   // En Bs
const SHIPPING_FLAT = 9.99;            // En Bs

const fmt = (n) => `Bs ${Number(n).toFixed(2)}`;

function loadCart() {
  try { return JSON.parse(localStorage.getItem("cart") || "[]"); }
  catch { return []; }
}
function saveCart(items) {
  localStorage.setItem("cart", JSON.stringify(items));
}

export default function CartPage() {
  const fallback = [
    { id: "1", name: "Cable THHN 12AWG", price: 45.9, qty: 2 },
    { id: "2", name: "Medidor Digital",  price: 120.5, qty: 1 },
  ];

  const [items, setItems] = useState([]);
  const [hydrating, setHydrating] = useState(false);

  useEffect(() => {
    const stored = loadCart();
    if (stored.length) {
      setItems(stored);
    } else {
      setItems(fallback);
      saveCart(fallback);
    }
  }, []);

  useEffect(() => {
    const needHydrate = items.some(i => !i.image || !i.name);
    if (!items.length || !needHydrate) return;

    let mounted = true;
    (async () => {
      setHydrating(true);
      try {
        const next = await Promise.all(items.map(async (i) => {
          try {
            const p = await http.get(`/products/${i.id}`);
            const firstImg =
              (Array.isArray(p?.images) && p.images[0]?.url) ||
              p?.image ||
              null;

            return {
              ...i,
              name: i.name || p?.name || i.name,
              image: i.image || firstImg,
            };
          } catch {
            return i;
          }
        }));
        if (mounted) {
          setItems(next);
          saveCart(next);
        }
      } finally {
        if (mounted) setHydrating(false);
      }
    })();
    return () => { mounted = false; };
  }, [items.length]);

  const subtotal = useMemo(
    () => items.reduce((a, i) => a + Number(i.price) * Number(i.qty), 0),
    [items]
  );
  const shipping = subtotal >= FREE_SHIPPING_THRESHOLD || subtotal === 0 ? 0 : SHIPPING_FLAT;
  const total = subtotal + shipping;

  const progress = Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100);
  const missingForFree = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);

  const setAndSave = (next) => {
    setItems(next);
    saveCart(next);
  };

  const incQty = (id) => {
    setAndSave(items.map(i => i.id === id ? { ...i, qty: Number(i.qty)+1 } : i));
  };
  const decQty = (id) => {
    setAndSave(items.map(i => {
      if (i.id !== id) return i;
      const next = Math.max(1, Number(i.qty)-1);
      return { ...i, qty: next };
    }));
  };
  const removeItem = (id) => {
    const next = items.filter(i => i.id !== id);
    setAndSave(next);
  };
  const clearCart = () => setAndSave([]);

  return (
    <section className="section">
      <div className="container cart">
        {/* Lista */}
        <div className="card cart__list">
          <header className="cart__head">
            <h2>Carrito</h2>
            {hydrating && <span className="pill">Actualizando productos…</span>}
          </header>

          {!items.length && (
            <div className="cart__empty">
              <p className="muted">Tu carrito está vacío.</p>
              <Link to="/" className="btn btn--ghost">Explorar productos</Link>
            </div>
          )}

          {items.map((i) => (
            <div key={i.id} className="cart__row">
              <div className="cart__cell cart__prod">
                <div className="cart__thumb">
                  {i.image
                    ? <img src={i.image} alt={i.name} />
                    : <div className="cart__thumb--ph">IMG</div>}
                </div>
                <div className="cart__meta">
                  <span className="cart__name">{i.name}</span>
                  <span className="cart__unit muted">Unitario: {fmt(i.price)}</span>
                </div>
              </div>

              <div className="cart__cell cart__qtybox">
                <button
                  className="btn btn--ghost"
                  aria-label={`Disminuir ${i.name}`}
                  onClick={() => decQty(i.id)}
                >−</button>
                <span className="cart__qty" aria-live="polite">x{i.qty}</span>
                <button
                  className="btn btn--ghost"
                  aria-label={`Aumentar ${i.name}`}
                  onClick={() => incQty(i.id)}
                >+</button>
              </div>

              <div className="cart__cell cart__line">
                <span className="cart__price">{fmt(i.price * i.qty)}</span>
                <button className="link danger" onClick={() => removeItem(i.id)}>Quitar</button>
              </div>
            </div>
          ))}

          {!!items.length && (
            <div className="cart__actions">
              <button className="btn btn--ghost" onClick={clearCart}>Vaciar carrito</button>
            </div>
          )}
        </div>

        {/* Resumen */}
        <aside className="card cart__summary">
          <h3>Resumen</h3>

          <div className="shipbar">
            {subtotal >= FREE_SHIPPING_THRESHOLD ? (
              <div className="shipbar__ok">
                <span className="badge">¡Envío gratis aplicado!</span>
              </div>
            ) : (
              <>
                <div className="shipbar__label">
                  Te faltan <strong>{fmt(missingForFree)}</strong> para envío gratis
                </div>
                <div className="shipbar__track" aria-label="Progreso a envío gratis">
                  <div className="shipbar__fill" style={{ width: `${progress}%` }} />
                </div>
              </>
            )}
          </div>

          <div className="cart__sumrow"><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
          <div className="cart__sumrow"><span>Envío</span><span>{fmt(shipping)}</span></div>
          <div className="cart__sumrow cart__total"><span>Total</span><span>{fmt(total)}</span></div>

          <Link
            to="/checkout"
            className={`btn cart__btn ${!items.length ? "disabled" : ""}`}
            aria-disabled={!items.length}
            onClick={(e)=>{ if(!items.length){ e.preventDefault(); } }}
          >
            Continuar
          </Link>
        </aside>
      </div>
    </section>
  );
}
