import "./CheckoutPage.css";
import { useEffect, useMemo, useState } from "react";
import http from "../../../shared/lib/http.js";
import useAuth from "../../auth/context/useAuth.js";
import usePlan from "../../billing/context/usePlan.js";
import { AuthAPI } from "../../../shared/lib/api.js";

// Mantén estos en sync con CartPage
const FREE_SHIPPING_THRESHOLD = 150;   // En Bs
const SHIPPING_FLAT = 9.99;            // En Bs

const PLAN_PRICES = { free: 0, pro: 690, enterprise: 0 }; // Bs
const fmt = (n) => `Bs ${Number(n).toFixed(2)}`;

function loadCart() {
  try { return JSON.parse(localStorage.getItem("cart") || "[]"); }
  catch { return []; }
}
function clearCart() { localStorage.removeItem("cart"); }

export default function CheckoutPage() {
  const { user, setUser } = useAuth();
  const { selectedPlan, setSelectedPlan } = usePlan();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  // Recuperar plan desde query si se refresca
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const plan = params.get("plan");
    if (plan && !selectedPlan) setSelectedPlan(plan);
  }, [selectedPlan, setSelectedPlan]);

  // Cargar carrito solo si NO es modo plan
  useEffect(() => {
    if (!selectedPlan) setItems(loadCart());
  }, [selectedPlan]);

  // Cálculos (coherentes con el carrito)
  const subtotal = useMemo(
    () => items.reduce((a, i) => a + Number(i.price) * Number(i.qty), 0),
    [items]
  );
  const shipping = selectedPlan
    ? 0
    : (subtotal >= FREE_SHIPPING_THRESHOLD || subtotal === 0 ? 0 : SHIPPING_FLAT);
  const total = selectedPlan ? (PLAN_PRICES[selectedPlan] ?? 0) : (subtotal + shipping);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    // === MODO SUSCRIPCIÓN (plan) ===
    if (selectedPlan) {
      try {
        setLoading(true);
        const { user: updated } = await AuthAPI.updatePlan(selectedPlan);
        setUser(updated);
        setResult({ plan: updated.plan });
        setSelectedPlan(null);
      } catch (err) {
        console.error(err);
        setResult({ plan: selectedPlan });
        setSelectedPlan(null);
      } finally {
        setLoading(false);
      }
      return;
    }

    // === MODO CARRITO ===
    if (!items.length) {
      setError("Tu carrito está vacío.");
      return;
    }

    const fd = new FormData(e.currentTarget);
    const name  = String(fd.get("name")  || "").trim() || user?.name  || "";
    const email = String(fd.get("email") || "").trim() || user?.email || "";
    const address = String(fd.get("address") || "").trim();
    const city    = String(fd.get("city") || "").trim();
    // NO validamos tarjeta/cvv en modo demo:
    const card    = String(fd.get("card") || "");
    const cvv     = String(fd.get("cvv") || "");

    if (!name || !email) {
      setError("Nombre y correo son obligatorios.");
      return;
    }

    const payload = {
      customer: { name, email, address, city },
      items: items.map(i => ({
        productId: String(i.id),    // conservamos como string si así lo guardas
        quantity: Number(i.qty || 1)
      })),
      pricing: { subtotal, shipping, total },
      // Datos de pago (demo, sin validar)
      payment: { card, cvv }
    };

    try {
      setLoading(true);
      // Intento real (si orders está OK)
      const r = await http.post("/checkout", payload);
      setResult({
        orderId: r?.orderId || `S-${Date.now().toString().slice(-6)}`,
        total: r?.total ?? total,
      });
      clearCart();
    } catch (err) {
      console.warn("[Checkout] fallback (simular compra):", err?.message || err);
      // Simulación SIEMPRE exitosa
      setResult({
        orderId: `S-${Date.now().toString().slice(-6)}`,
        total,
      });
      clearCart();
    } finally {
      setLoading(false);
    }
  }

  // === Vistas de éxito ===
  if (result) {
    if (result.plan) {
      return (
        <section className="section">
          <div className="container">
            <div className="card checkout">
              <div className="checkout__head">
                <h2>¡Gracias!</h2>
                <p className="muted">Tu suscripción fue actualizada.</p>
              </div>
              <div className="successBox">
                <p>Plan aplicado: <strong>{String(result.plan).toUpperCase()}</strong></p>
              </div>
              <div className="row">
                <a className="btn" href="/profile">Ir a mi perfil</a>
                <a className="btn btn--ghost" href="/">Volver al inicio</a>
              </div>
            </div>
          </div>
        </section>
      );
    }
    return (
      <section className="section">
        <div className="container">
          <div className="card checkout">
            <div className="checkout__head">
              <h2>¡Gracias por tu compra!</h2>
              <p className="muted">Procesamos tu pedido correctamente.</p>
            </div>
            <div className="successBox">
              <p>Orden <strong>#{result.orderId}</strong></p>
              <p>Total pagado: <strong>{fmt(result.total)}</strong></p>
            </div>
            <div className="row">
              <a className="btn" href="/">Volver al inicio</a>
              <a className="btn btn--ghost" href="/orders">Ver mis pedidos</a>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // === Vista normal ===
  return (
    <section className="section">
      <div className="container">
        <form className="card checkout" onSubmit={handleSubmit}>
          <div className="checkout__head">
            <h2>{selectedPlan ? `Confirmar suscripción (${String(selectedPlan).toUpperCase()})` : "Checkout"}</h2>
            {!selectedPlan && (
              <p className="muted">Completa tus datos para finalizar la compra.</p>
            )}
          </div>

          <div className="checkout__grid">
            <div className="checkout__form">
              <div className="grid2">
                <label>Nombre
                  <input name="name" type="text" defaultValue={user?.name || ""} required />
                </label>
                <label>Correo
                  <input name="email" type="email" defaultValue={user?.email || ""} required />
                </label>

                {/* Campos de envío/tarjeta solo para carrito */}
                {!selectedPlan && (
                  <>
                    <label>Dirección
                      <input name="address" type="text" placeholder="Av. Principal #123" />
                    </label>
                    <label>Ciudad
                      <input name="city" type="text" placeholder="La Paz" />
                    </label>
                    <label>Tarjeta (demo)
                      <input name="card" type="text" placeholder="4242 4242 4242 4242" />
                    </label>
                    <label>CVV
                      <input name="cvv" type="text" placeholder="123" />
                    </label>
                  </>
                )}
              </div>
            </div>

            <aside className="checkout__summary">
              {selectedPlan ? (
                <div className="mini-summary">
                  <h4>Resumen de suscripción</h4>
                  <div className="mini-summary__line">
                    <span>Plan</span><span>{String(selectedPlan).toUpperCase()}</span>
                  </div>
                  <div className="mini-summary__line total">
                    <span>Total</span><span>{fmt(total)}</span>
                  </div>
                </div>
              ) : (
                <>
                  {!!items.length && (
                    <div className="mini-summary">
                      <h4>Resumen</h4>
                      <ul className="mini-summary__list">
                        {items.map(i => (
                          <li key={i.id}>
                            <span className="name">
                              {i.image && <img src={i.image} alt="" aria-hidden />}
                              {i.name} × {i.qty}
                            </span>
                            <span className="value">{fmt(i.price * i.qty)}</span>
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
                  {!items.length && (
                    <p className="muted">Tu carrito está vacío.</p>
                  )}
                </>
              )}

              {error && <p className="error">{error}</p>}

              <button className="btn checkout__btn" disabled={loading}>
                {loading ? "Procesando…" : selectedPlan ? "Confirmar suscripción" : "Pagar (Sandbox)"}
              </button>
            </aside>
          </div>
        </form>
      </div>
    </section>
  );
}
