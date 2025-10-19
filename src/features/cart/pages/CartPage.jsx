import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "./CartPage.css";

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
  // Fallback inicial por si no hay carrito aún
  const fallback = [
    { id: "1", name: "Cable THHN 12AWG", price: 45.9, qty: 2 },
    { id: "2", name: "Medidor Digital",  price: 120.5, qty: 1 },
  ];

  const [items, setItems] = useState([]);

  useEffect(() => {
    const stored = loadCart();
    if (stored.length) {
      setItems(stored);
    } else {
      setItems(fallback);
      saveCart(fallback);
    }
  }, []);

  const subtotal = useMemo(
    () => items.reduce((a, i) => a + Number(i.price) * Number(i.qty), 0),
    [items]
  );
  const shipping = subtotal > FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FLAT;
  const total = subtotal + shipping;

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
        <div className="card cart__list">
          <h2>Carrito</h2>

          {!items.length && (
            <p className="muted">Tu carrito está vacío.</p>
          )}

          {items.map((i) => (
            <div key={i.id} className="cart__row">
              <span className="cart__name">{i.name}</span>

              <div className="cart__qtybox">
                <button className="btn btn--ghost" onClick={() => decQty(i.id)}>-</button>
                <span className="cart__qty">x{i.qty}</span>
                <button className="btn btn--ghost" onClick={() => incQty(i.id)}>+</button>
              </div>

              <span className="cart__price">{fmt(i.price * i.qty)}</span>
              <button className="link danger" onClick={() => removeItem(i.id)}>Quitar</button>
            </div>
          ))}

          {!!items.length && (
            <div className="cart__actions">
              <button className="btn btn--ghost" onClick={clearCart}>Vaciar carrito</button>
            </div>
          )}
        </div>

        <aside className="card cart__summary">
          <h3>Resumen</h3>
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
