import { useEffect, useMemo, useState } from "react";
import "./SellerDashboardPage.css";
import http from "../../../shared/lib/http.js";
import { csvFromArray } from "../../../shared/lib/csv.js";
import useAuth from "../../auth/context/useAuth.js";

const FREE_PRODUCT_LIMIT = 20;
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8080/api";

export default function SellerDashboardPage() {
  const { user } = useAuth();

  // Plan detection robusta (usa lo que tengas en tu user)
  const plan = (user?.plan || user?.vendor?.plan || "free").toLowerCase();
  const isSeller = (user?.role || user?.vendor?.role) === "seller" || plan !== "free";
  const isPro = plan === "pro" || plan === "enterprise";
  const isEnterprise = plan === "enterprise";

  const [tab, setTab] = useState("resumen");

  // Datos
  const [myCount, setMyCount] = useState(0);
  const [orders, setOrders] = useState([]);
  const [taxes, setTaxes] = useState([]);
  const [securityEvents, setSecurityEvents] = useState([]);
  const [finance, setFinance] = useState({ ingresos: [], gastos: [] });

  // Form publicar producto (Free/Pro/Ent)
  const [form, setForm] = useState({ name: "", price: "", stock: "" });

  // helper PUT seguro (usa http.put si existe; si no, fetch nativo)
  const safePut = async (path, body) => {
    if (typeof http.put === "function") {
      return http.put(path, body);
    }
    const res = await fetch(`${API_BASE}${path}`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body || {}),
    });
    if (!res.ok) throw new Error("Error PUT");
    return res.json().catch(() => ({}));
  };

  // Cargas iniciales
  useEffect(() => {
    (async () => {
      // Conteo de productos del vendedor
      try {
        const c = await http.get("/seller/products/count"); // {count}
        setMyCount(Number(c?.count ?? 0));
      } catch {
        setMyCount(17);
      }

      // Pedidos (vía ORDERS, no /seller)
      try {
        const o = await http.get("/orders");
        setOrders(Array.isArray(o) ? o : []);
      } catch {
        // Mock
        setOrders([
          { id: "A-1001", customer: "ACME Ltd", total: 540.2, status: "paid", created_at: "2025-10-01", items: 3 },
          { id: "A-1002", customer: "Beta SA", total: 120.0, status: "pending", created_at: "2025-10-02", items: 1 },
          { id: "A-1003", customer: "Gamma SRL", total: 890.0, status: "shipped", created_at: "2025-10-03", items: 5 },
          { id: "A-1004", customer: "Delta Inc", total: 210.0, status: "delivered", created_at: "2025-10-04", items: 2 },
          { id: "A-1005", customer: "Omega LLC", total: 45.9, status: "cancelled", created_at: "2025-10-04", items: 1 },
        ]);
      }

      // Impuestos
      try {
        const t = await http.get("/seller/taxes");
        setTaxes(Array.isArray(t) ? t : []);
      } catch {
        setTaxes([
          { id: 1, region: "BO - General", rate: 13 },
          { id: 2, region: "AR - BsAs", rate: 21 },
        ]);
      }

      // Seguridad (intentos / eventos)
      try {
        const s = await http.get("/seller/security/events");
        setSecurityEvents(Array.isArray(s) ? s : []);
      } catch {
        setSecurityEvents([
          { id: "S-1", ts: "2025-10-02 12:02", ip: "192.168.1.10", vector: "login_fail", severity: "medium" },
          { id: "S-2", ts: "2025-10-03 09:45", ip: "200.87.22.14", vector: "rate_limit", severity: "low" },
          { id: "S-3", ts: "2025-10-04 18:21", ip: "177.234.5.7", vector: "suspicious_scan", severity: "high" },
        ]);
      }

      // Finanzas
      try {
        const f = await http.get("/seller/finance"); // {ingresos:[], gastos:[]}
        setFinance(f || { ingresos: [], gastos: [] });
      } catch {
        setFinance({
          ingresos: [
            { id: "I-1", fecha: "2025-10-01", concepto: "Ventas online", monto: 540.2 },
            { id: "I-2", fecha: "2025-10-03", concepto: "Ventas online", monto: 890.0 },
          ],
          gastos: [
            { id: "G-1", fecha: "2025-10-02", concepto: "Publicidad", monto: 120.0 },
            { id: "G-2", fecha: "2025-10-04", concepto: "Logística", monto: 60.0 },
          ],
        });
      }
    })();
  }, []);

  // KPIs rápidos
  const kpis = useMemo(() => {
    const totalOrders = orders.length;
    const paid = orders.filter(o => o.status === "paid" || o.status === "delivered").length;
    const revenue = orders.filter(o => o.status !== "cancelled")
                          .reduce((a, o) => a + Number(o.total || 0), 0);
    const avgOrder = totalOrders ? (revenue / totalOrders) : 0;
    const conv = totalOrders ? (paid / totalOrders) * 100 : 0;

    const ing = finance.ingresos?.reduce((a,i)=>a + Number(i.monto||0), 0) || 0;
    const gas = finance.gastos?.reduce((a,g)=>a + Number(g.monto||0), 0) || 0;
    const utilidad = ing - gas;

    return { totalOrders, paid, revenue, avgOrder, conv, ing, gas, utilidad };
  }, [orders, finance]);

  const remaining = Math.max(0, FREE_PRODUCT_LIMIT - myCount);

  // Handlers
  const onChangeForm = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const publicar = async (e) => {
    e.preventDefault();
    if (remaining <= 0) return alert("Límite Free alcanzado. Mejora tu plan en /pricing.");
    if (!form.name || form.name.length > 80) return alert("Nombre requerido (máx. 80).");
    if (!form.price || Number(form.price) < 0.01 || Number(form.price) > 100000) return alert("Precio inválido.");
    if (Number(form.stock) < 0) return alert("Stock no puede ser negativo.");

    try {
      await http.post("/seller/products", {
        name: form.name, price: Number(form.price), stock: Number(form.stock),
      });
      alert("Producto creado.");
      setMyCount(c => c + 1);
      setForm({ name: "", price: "", stock: "" });
    } catch {
      alert("Producto creado (demo).");
      setMyCount(c => c + 1);
      setForm({ name: "", price: "", stock: "" });
    }
  };

  const updateStatus = async (id, status) => {
    try {
      // Si existe endpoint real: PUT /orders/:id/status
      await safePut(`/orders/${id}/status`, { status });
      setOrders(orders.map(o => o.id === id ? { ...o, status } : o));
    } catch {
      // Fallback local (UI-only)
      setOrders(orders.map(o => o.id === id ? { ...o, status } : o));
    }
  };

  const addTax = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const region = String(fd.get("region") || "").trim();
    const rate = Number(fd.get("rate") || 0);
    if (!region || rate < 0 || rate > 100) return alert("Datos de tasa inválidos.");
    try {
      const created = await http.post("/seller/taxes", { region, rate });
      setTaxes(t => [...t, created || { id: Date.now(), region, rate }]);
      e.currentTarget.reset();
    } catch {
      setTaxes(t => [...t, { id: Date.now(), region, rate }]);
      e.currentTarget.reset();
    }
  };

  const removeTax = async (id) => {
    try {
      await http.del(`/seller/taxes/${id}`);
      setTaxes(t => t.filter(x => x.id !== id));
    } catch {
      setTaxes(t => t.filter(x => x.id !== id));
    }
  };

  const exportar = (tipo) => {
    if (tipo === "orders") {
      return csvFromArray(orders, "pedidos.csv");
    }
    if (tipo === "ventas") {
      const ventas = orders
        .filter(o => o.status !== "cancelled")
        .map(o => ({ id: o.id, fecha: o.created_at, total: o.total, status: o.status }));
      return csvFromArray(ventas, "ventas.csv");
    }
    if (tipo === "productos") {
      // En real vendría del backend /seller/products
      const productos = [
        { id: "1", nombre: "Medidor Digital", stock: 12, precio: 120.5 },
        { id: "2", nombre: "Transformador 5kVA", stock: 4, precio: 890.0 },
      ];
      return csvFromArray(productos, "productos.csv");
    }
  };

  // Gates de plan
  const Gate = ({ children }) => {
    if (isPro) return children;
    return (
      <div className="gate">
        <p><strong>Función disponible en Plan Pro o Enterprise.</strong></p>
        <a href="/pricing" className="btn">Mejorar plan</a>
      </div>
    );
  };

  // UI
  return (
    <section className="section">
      <div className="container">
        <div className="card seller">
          <header className="seller__head">
            <div>
              <h2>Panel de Vendedor</h2>
              <p className="muted">Plan actual: <strong className={`tag tag--${plan}`}>{plan}</strong></p>
            </div>
            {!isPro && <a className="btn" href="/pricing">Mejorar a Pro</a>}
          </header>

          {/* Tabs */}
          <div className="tabs">
            <button className={`tab ${tab==='resumen'?'active':''}`} onClick={()=>setTab("resumen")}>Resumen</button>
            <button className={`tab ${tab==='estados'?'active':''}`} onClick={()=>setTab("estados")}>Estados</button>
            <button className={`tab ${tab==='impuestos'?'active':''}`} onClick={()=>setTab("impuestos")}>Impuestos</button>
            <button className={`tab ${tab==='analitica'?'active':''}`} onClick={()=>setTab("analitica")}>Analítica</button>
            <button className={`tab ${tab==='informes'?'active':''}`} onClick={()=>setTab("informes")}>Informes</button>
            <button className={`tab ${tab==='seguridad'?'active':''}`} onClick={()=>setTab("seguridad")}>Seguridad</button>
            <button className={`tab ${tab==='finanzas'?'active':''}`} onClick={()=>setTab("finanzas")}>Finanzas</button>
          </div>

          {/* Contenido por pestaña */}
          {tab === "resumen" && (
            <div className="panel">
              <div className="kpis">
                <div className="kpi"><span className="kpi__label">Pedidos</span><span className="kpi__value">{kpis.totalOrders}</span></div>
                <div className="kpi"><span className="kpi__label">Ingresos</span><span className="kpi__value">Bs {kpis.revenue.toFixed(2)}</span></div>
                <div className="kpi"><span className="kpi__label">Ticket prom.</span><span className="kpi__value">Bs {kpis.avgOrder.toFixed(2)}</span></div>
                <div className="kpi"><span className="kpi__label">Conversión</span><span className="kpi__value">{kpis.conv.toFixed(1)}%</span></div>
              </div>

              {/* Límite Free */}
              <div className="limit">
                <div className="limit__info">
                  <strong>Plan Free:</strong> {myCount}/{FREE_PRODUCT_LIMIT} productos publicados
                  <span className="limit__hint">({remaining} disponibles)</span>
                </div>
                <div className="limit__bar">
                  <div className="limit__fill" style={{ width: `${(myCount/ FREE_PRODUCT_LIMIT) * 100}%` }} />
                </div>
                {remaining <= 0 && (
                  <p className="limit__warning">
                    Límite alcanzado. <a href="/pricing">Mejorar plan</a>
                  </p>
                )}
              </div>

              {/* Publicar producto */}
              <form className="seller__form" onSubmit={publicar}>
                <label>Nombre (máx. 80)
                  <input name="name" value={form.name} onChange={onChangeForm} maxLength={80} required />
                </label>
                <label>Precio (0.01–100000)
                  <input name="price" type="number" step="0.01" min="0.01" max="100000"
                        value={form.price} onChange={onChangeForm} required />
                </label>
                <label>Stock (≥ 0)
                  <input name="stock" type="number" min="0" value={form.stock} onChange={onChangeForm} required />
                </label>
                <button className="btn" disabled={!isSeller || remaining <= 0}>Publicar</button>
              </form>
              {!isSeller && <p className="muted">Activa tu modo vendedor para publicar productos.</p>}
            </div>
          )}

          {tab === "estados" && (
            <div className="panel">
              <div className="table">
                <div className="table__head">
                  <div>ID</div><div>Cliente</div><div>Total</div><div>Estado</div><div>Fecha</div><div>Acción</div>
                </div>
                {orders.map(o => (
                  <div className="table__row" key={o.id}>
                    <div>{o.id}</div>
                    <div>{o.customer || o.customerName || "—"}</div>
                    <div>Bs {Number(o.total).toFixed(2)}</div>
                    <div><span className={`status status--${o.status}`}>{o.status}</span></div>
                    <div>{o.created_at || o.createdAt?.slice?.(0,10) || "—"}</div>
                    <div>
                      <select defaultValue={o.status} onChange={(e)=>updateStatus(o.id, e.target.value)}>
                        <option value="pending">pending</option>
                        <option value="paid">paid</option>
                        <option value="shipped">shipped</option>
                        <option value="delivered">delivered</option>
                        <option value="cancelled">cancelled</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "impuestos" && (
            <Gate>
              <div className="panel">
                <form className="row" onSubmit={addTax}>
                  <input name="region" placeholder="Región / País" />
                  <input name="rate" type="number" min="0" max="100" step="0.01" placeholder="% tasa" />
                  <button className="btn" type="submit">Agregar tasa</button>
                </form>

                <div className="table">
                  <div className="table__head"><div>Región</div><div>Tasa (%)</div><div>Acción</div></div>
                  {taxes.map(t => (
                    <div className="table__row" key={t.id}>
                      <div>{t.region}</div>
                      <div>{Number(t.rate)}%</div>
                      <div><button className="btn btn--ghost" onClick={()=>removeTax(t.id)}>Eliminar</button></div>
                    </div>
                  ))}
                </div>
                <p className="muted">Estas tasas se aplicarán en el cálculo de impuestos en tu checkout (cuando el backend lo integre).</p>
              </div>
            </Gate>
          )}

          {tab === "analitica" && (
            <Gate>
              <div className="panel">
                <h3>Métricas de rendimiento</h3>
                <div className="kpis kpis--grid4">
                  <div className="kpi"><span className="kpi__label">Pedidos</span><span className="kpi__value">{kpis.totalOrders}</span></div>
                  <div className="kpi"><span className="kpi__label">Pagados/Entregados</span><span className="kpi__value">{kpis.paid}</span></div>
                  <div className="kpi"><span className="kpi__label">Ingresos (Bs)</span><span className="kpi__value">{kpis.revenue.toFixed(2)}</span></div>
                  <div className="kpi"><span className="kpi__label">Conversión</span><span className="kpi__value">{kpis.conv.toFixed(1)}%</span></div>
                </div>

                <div className="cards">
                  <div className="card small">
                    <h4>Ticket promedio</h4>
                    <p className="big">Bs {kpis.avgOrder.toFixed(2)}</p>
                    <p className="muted">Promedio de venta por pedido.</p>
                  </div>
                  <div className="card small">
                    <h4>Top canales (demo)</h4>
                    <ul className="list">
                      <li>Orgánico — 52%</li>
                      <li>Referidos — 28%</li>
                      <li>Anuncios — 20%</li>
                    </ul>
                  </div>
                  <div className="card small">
                    <h4>Rendimiento (motor)</h4>
                    <p className="muted">Estimación simple basada en estados:</p>
                    <ul className="list">
                      <li>Score = paid*2 + shipped*1.5 + delivered*2.5 − cancelled*1</li>
                    </ul>
                    <p className="big">
                      {
                        (() => {
                          const paid = orders.filter(o=>o.status==='paid').length;
                          const shipped = orders.filter(o=>o.status==='shipped').length;
                          const delivered = orders.filter(o=>o.status==='delivered').length;
                          const cancelled = orders.filter(o=>o.status==='cancelled').length;
                          const score = paid*2 + shipped*1.5 + delivered*2.5 - cancelled*1;
                          return score.toFixed(1);
                        })()
                      }
                    </p>
                  </div>
                </div>
              </div>
            </Gate>
          )}

          {tab === "informes" && (
            <Gate>
              <div className="panel">
                <div className="row">
                  <button className="btn" onClick={()=>exportar("orders")}>Descargar pedidos (CSV)</button>
                  <button className="btn" onClick={()=>exportar("ventas")}>Descargar ventas (CSV)</button>
                  <button className="btn" onClick={()=>exportar("productos")}>Descargar productos (CSV)</button>
                </div>
                <p className="muted">Los informes se generan en el navegador a partir de los datos cargados. Con backend, se podrán programar y enviar por email.</p>
              </div>
            </Gate>
          )}

          {tab === "seguridad" && (
            <Gate>
              <div className="panel">
                <div className="table">
                  <div className="table__head">
                    <div>Fecha</div><div>IP</div><div>Vector</div><div>Severidad</div>
                  </div>
                  {securityEvents.map(s => (
                    <div className="table__row" key={s.id}>
                      <div>{s.ts}</div>
                      <div>{s.ip}</div>
                      <div>{s.vector}</div>
                      <div><span className={`sev sev--${s.severity}`}>{s.severity}</span></div>
                    </div>
                  ))}
                </div>
                {isEnterprise ? (
                  <p className="muted">Como Enterprise, puedes solicitar informes detallados de auditoría (SSO/SCIM).</p>
                ) : (
                  <p className="muted">Para auditoría avanzada y SSO/SCIM, mejora a Enterprise.</p>
                )}
              </div>
            </Gate>
          )}

          {tab === "finanzas" && (
            <Gate>
              <div className="panel">
                <div className="kpis kpis--grid3">
                  <div className="kpi"><span className="kpi__label">Ingresos</span><span className="kpi__value">Bs {kpis.ing.toFixed(2)}</span></div>
                  <div className="kpi"><span className="kpi__label">Gastos</span><span className="kpi__value">Bs {kpis.gas.toFixed(2)}</span></div>
                  <div className={`kpi ${kpis.utilidad>=0?'':'neg'}`}>
                    <span className="kpi__label">Utilidad</span>
                    <span className="kpi__value">Bs {kpis.utilidad.toFixed(2)}</span>
                  </div>
                </div>

                <div className="grid2">
                  <div className="card">
                    <h4>Ingresos</h4>
                    <div className="table compact">
                      <div className="table__head"><div>Fecha</div><div>Concepto</div><div>Monto</div></div>
                      {finance.ingresos?.map(i=>(
                        <div className="table__row" key={i.id}>
                          <div>{i.fecha}</div><div>{i.concepto}</div><div>Bs {Number(i.monto).toFixed(2)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="card">
                    <h4>Gastos</h4>
                    <div className="table compact">
                      <div className="table__head"><div>Fecha</div><div>Concepto</div><div>Monto</div></div>
                      {finance.gastos?.map(g=>(
                        <div className="table__row" key={g.id}>
                          <div>{g.fecha}</div><div>{g.concepto}</div><div>Bs {Number(g.monto).toFixed(2)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </Gate>
          )}
        </div>
      </div>
    </section>
  );
}
