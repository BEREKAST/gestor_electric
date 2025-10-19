import { useEffect, useMemo, useState } from "react";
import "./CheckoutPage.css";
import http from "../../../shared/lib/http.js";

const FREE_SHIPPING_THRESHOLD = 150; // Bs
const SHIPPING_FLAT = 9.99;
const fmt = (n) => `Bs ${Number(n).toFixed(2)}`;

function loadCart() {
  try { return JSON.parse(localStorage.getItem("cart") || "[]"); }
  catch { return []; }
}
function clearCart() {
  localStorage.removeItem("cart");
}

export default function CheckoutPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null); // respuesta del backend
  const [error, setError] = useState("");

  useEffect(() => {
    const stored = loadCart();
    setItems(stored);
  }, []);

  const subtotal = useMemo(
    () => items.reduce((a, i) => a + Number(i.price) * Number(i.qty), 0),
    [items]
  );
  const shipping = subtotal > FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FLAT;
  const total = subtotal + shipping;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!items.length) {
      setError("Tu carrito está vacío.");
      return;
    }

    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") || "").trim();
    const email = String(fd.get("email") || "").trim();

    if (!name || !email) {
      setError("Nombre y correo son obligatorios.");
      return;
    }

    const payload = {
      customer: { name, email },
      items: items.map(i => ({
        productId: Number(i.id),
        quantity: Number(i.qty || 1),
      })),
    };

    try {
      setLoading(true);
      const r = await http.post("/checkout", payload);
      setResult(r);
      clearCart();
    } catch (err) {
      setError(err?.message || "No se pudo procesar el pago.");
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    return (
      <section className="section">
        <div className="container">
          <div className="card checkout">
            <h2>¡Gracias por tu compra!</h2>
            <p>Orden <strong>#{result.orderId}</strong> creada correctamente.</p>
            <p>Total: <strong>{fmt(result.total)}</strong></p>
            <div className="row">
              <a className="btn" href="/">Volver al inicio</a>
              <a className="btn btn--ghost" href="/orders">Ver mis pedidos</a>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="section">
      <div className="container">
        <form className="card checkout" onSubmit={handleSubmit}>
          <h2>Checkout</h2>

          <div className="grid2">
            <label>Nombre
              <input name="name" type="text" required />
            </label>
            <label>Correo
              <input name="email" type="email" required />
            </label>
            <label>Dirección
              <input name="address" type="text" />
            </label>
            <label>Ciudad
              <input name="city" type="text" />
            </label>
            <label>Tarjeta (demo)
              <input name="card" type="text" placeholder="4242 4242 4242 4242" />
            </label>
            <label>CVV
              <input name="cvv" type="text" />
            </label>
          </div>

          {!!items.length && (
            <div className="mini-summary">
              <h4>Resumen</h4>
              <ul>
                {items.map(i => (
                  <li key={i.id}>
                    {i.name} × {i.qty} — <strong>{fmt(i.price * i.qty)}</strong>
                  </li>
                ))}
              </ul>
              <div className="mini-summary__line">
                <span>Subtotal</span><span>{fmt(subtotal)}</span>
              </div>
              <div className="mini-summary__line">
                <span>Envío</span><span>{fmt(shipping)}</span>
              </div>
              <div className="mini-summary__line total">
                <span>Total</span><span>{fmt(total)}</span>
              </div>
            </div>
          )}

          {error && <p className="error">{error}</p>}

          <button className="btn" disabled={loading || !items.length}>
            {loading ? "Procesando…" : "Pagar (Sandbox)"}
          </button>
        </form>
      </div>
    </section>
  );
}
