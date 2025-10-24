import { useEffect, useMemo, useState } from "react";
import "./SellerDashboardPage.css";
import http from "../../../shared/lib/http.js";
import { csvFromArray } from "../../../shared/lib/csv.js";
import useAuth from "../../auth/context/useAuth.js";
import { PLAN_PERKS, getUserPlan } from "../../../shared/lib/constants.js";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8080/api";

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const rint = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

function simulateProducts(count = 6) {
  const names = [
    "Cable de cobre 2mm",
    "Bombilla LED 9W",
    "Tomacorriente triple",
    "Interruptor doble",
    "Cinta aislante negra",
    "Enchufe industrial 220V",
    "Panel solar 300W",
    "Batería 12V 7Ah",
  ];
  return Array.from({ length: count }, (_, i) => ({
    id: 100 + i,
    name: pick(names),
    price: Number((20 + Math.random() * 200).toFixed(2)),
    stock: rint(5, 80),
    images: [],
  }));
}

function simulateOrders(products = []) {
  const clientes = ["beymar castañeta flores", "alejandro", "Berekast", "juan perez"];
  const estados = ["pending", "paid", "shipped", "delivered", "cancelled"];
  const prods = products.length ? products : simulateProducts(4);
  const N = 14;

  return Array.from({ length: N }, (_, i) => {
    const p = pick(prods);
    const qty = rint(1, 3);
    const total = Number((Number(p.price || 0) * qty).toFixed(2));
    return {
      id: `S-${1001 + i}`,
      customer: pick(clientes),
      total,
      status: pick(estados),
      created_at: daysAgo(rint(0, 28)),
      items: qty,
    };
  });
}

function simulateTaxes() {
  return [
    { id: 1, region: "Bolivia", rate: 13 },
    { id: 2, region: "Chile", rate: 10 },
  ];
}

function simulateSecurity() {
  const sev = ["low", "medium", "high"];
  const vec = ["login_failed", "token_expired", "rate_limit", "csrf_blocked"];
  const n = 8;
  return Array.from({ length: n }, (_, i) => ({
    id: i + 1,
    ts: daysAgo(rint(0, 14)),
    ip: `192.168.${rint(0, 10)}.${rint(2, 200)}`,
    vector: pick(vec),
    severity: pick(sev),
  }));
}

function simulateAudit() {
  const acts = ["create_product", "update_price", "delete_product", "login", "logout"];
  return Array.from({ length: 6 }, (_, i) => ({
    id: i + 1,
    ts: daysAgo(rint(0, 30)),
    actor: "usuario_demo",
    action: pick(acts),
    meta: "demo",
  }));
}

function simulateFinance(orders = []) {
  const ingresos = (orders.length ? orders : simulateOrders())
    .filter((o) => o.status !== "cancelled")
    .map((o) => ({ concepto: `Venta ${o.id}`, fecha: o.created_at, monto: Number(o.total || 0) }));
  const gastos = [
    { concepto: "Publicidad", fecha: daysAgo(rint(0, 14)), monto: 120 },
    { concepto: "Comisiones", fecha: daysAgo(rint(0, 10)), monto: 75 },
    { concepto: "Logística",  fecha: daysAgo(rint(0, 20)), monto: 95 },
  ];
  return { ingresos, gastos };
}
/* ================================================================ */

export default function SellerDashboardPage() {
  const { user } = useAuth();

  const plan = getUserPlan(user);
  const perks = PLAN_PERKS[plan] || PLAN_PERKS.free;

  const isAdmin = user?.role === "admin";
  const isSellerByRole = user?.role === "seller";
  const canSell = isAdmin || isSellerByRole || perks.canSell;

  const [tab, setTab] = useState("resumen");

  // Datos
  const [myCount, setMyCount] = useState(0);
  const [orders, setOrders] = useState([]);
  const [taxes, setTaxes] = useState([]);
  const [securityEvents, setSecurityEvents] = useState([]);
  const [audit, setAudit] = useState([]);
  const [finance, setFinance] = useState({ ingresos: [], gastos: [] });

  // Mis productos (lista real)
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [errorProducts, setErrorProducts] = useState("");

  // Form crear/editar
  const [form, setForm] = useState({ name: "", price: "", stock: "" });
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  // imágenes
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);

  const safePut = async (path, body) => {
    if (typeof http.put === "function") return http.put(path, body);
    const res = await fetch(`${API_BASE}${path}`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body || {}),
    });
    if (!res.ok) throw new Error("Error PUT");
    return res.json().catch(() => ({}));
  };

  // Helpers productos
  const loadMyProducts = async () => {
    setLoadingProducts(true);
    setErrorProducts("");
    try {
      const data = await http.get("/seller/products"); // [{id,name,price,stock,images:[...]}]
      const arr = Array.isArray(data) ? data : [];
      const final = arr.length ? arr : simulateProducts();
      setProducts(final);
      return final;
    } catch (e) {
      console.error("[INIT] /seller/products ERROR:", e);
      const mock = simulateProducts();
      setProducts(mock);
      setErrorProducts(""); // 
      return mock;
    } finally {
      setLoadingProducts(false);
    }
  };

  const loadMyCount = async () => {
    try {
      const c = await http.get("/seller/products/count"); // {count}
      setMyCount(Number(c?.count ?? 0));
    } catch {
      setMyCount((prev) => (products?.length || 0));
    }
  };

  // Cargas iniciales
  useEffect(() => {
    (async () => {
      const prods = await loadMyProducts();
      await loadMyCount();

      try {
        const o = await http.get("/orders");
        const arr = Array.isArray(o) ? o : [];
        setOrders(arr.length ? arr : simulateOrders(prods));
      } catch {
        setOrders(simulateOrders(prods));
      }

      if (perks.taxes) {
        try {
          const t = await http.get("/seller/taxes");
          const arr = Array.isArray(t) ? t : [];
          setTaxes(arr.length ? arr : simulateTaxes());
        } catch {
          setTaxes(simulateTaxes());
        }
      }

      try {
        const s = await http.get("/seller/security/events");
        const arr = Array.isArray(s) ? s : [];
        setSecurityEvents(arr.length ? arr : simulateSecurity());
      } catch {
        setSecurityEvents(simulateSecurity());
      }

      if (perks.audit) {
        try {
          const a = await http.get("/seller/audit");
          const arr = Array.isArray(a) ? a : [];
          setAudit(arr.length ? arr : simulateAudit());
        } catch {
          setAudit(simulateAudit());
        }
      }

      try {
        const f = await http.get("/seller/finance");
        const obj = f && typeof f === "object" ? f : null;
        setFinance(
          obj && (obj.ingresos?.length || obj.gastos?.length) ? obj : simulateFinance(orders)
        );
      } catch {
        setFinance(simulateFinance(orders));
      }
    })();
  }, [plan]);

  // KPIs
  const kpis = useMemo(() => {
    const totalOrders = orders.length;
    const paid = orders.filter(o => o.status === "paid" || o.status === "delivered").length;
    const revenue = orders.filter(o => o.status !== "cancelled")
      .reduce((a, o) => a + Number(o.total || 0), 0);
    const avgOrder = totalOrders ? (revenue / totalOrders) : 0;
    const conv = totalOrders ? (paid / totalOrders) * 100 : 0;

    const ing = finance.ingresos?.reduce((a, i) => a + Number(i.monto || 0), 0) || 0;
    const gas = finance.gastos?.reduce((a, g) => a + Number(g.monto || 0), 0) || 0;
    const utilidad = ing - gas;

    return { totalOrders, paid, revenue, avgOrder, conv, ing, gas, utilidad };
  }, [orders, finance]);

  const remaining = Math.max(0, (perks.productLimit ?? 0) - myCount);

  const onChangeForm = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const onPickImages = (e) => {
    const arr = Array.from(e.target.files || []);
    const limited = arr.slice(0, perks.maxImagesPerProduct);
    setFiles(limited);
    setPreviews(limited.map(f => URL.createObjectURL(f)));
  };

  const uploadImages = async () => {
    if (!files.length) return [];
    if (!import.meta.env.VITE_CLOUDINARY_UPLOAD_URL) {
      try {
        const form = new FormData();
        files.forEach(f => form.append("files", f));
        const res = await fetch(`${API_BASE}/seller/upload`, { method: "POST", credentials: "include", body: form });
        if (!res.ok) throw new Error("upload failed");
        const data = await res.json().catch(() => ({}));
        if (Array.isArray(data)) return data;
        if (Array.isArray(data?.images)) return data.images;
        return [];
      } catch {
        // fallback: previews (temporal)
        return previews.map((u, i) => ({ url: u, alt: `img-${i + 1}`, order: i }));
      }
    }
    try {
      const urls = [];
      for (const f of files) {
        const fd = new FormData();
        fd.append("file", f);
        fd.append("upload_preset", import.meta.env.VITE_CLOUDINARY_UNSIGNED_PRESET || "");
        const res = await fetch(import.meta.env.VITE_CLOUDINARY_UPLOAD_URL, { method: "POST", body: fd });
        const json = await res.json();
        if (json.secure_url) urls.push({ url: json.secure_url, alt: f.name, order: urls.length });
      }
      return urls;
    } catch {
      return previews.map((u, i) => ({ url: u, alt: `img-${i + 1}`, order: i }));
    }
  };

  const resetForm = () => {
    setForm({ name: "", price: "", stock: "" });
    setFiles([]); setPreviews([]); setEditingId(null);
  };

  const publicar = async (e) => {
    e.preventDefault();
    if (saving) return;

    if (!canSell) return alert("Tu plan no permite publicar. Mejora a PRO o ENTERPRISE.");
    if (perks.productLimit && remaining <= 0 && !editingId) return alert(`Límite de productos (${perks.productLimit}) alcanzado. Mejora tu plan.`);
    if (!form.name || form.name.length > 80) return alert("Nombre requerido (máx. 80).");
    if (!form.price || Number(form.price) < 0.01 || Number(form.price) > 100000) return alert("Precio inválido.");
    if (Number(form.stock) < 0) return alert("Stock no puede ser negativo.");

    if (perks.maxImagesPerProduct === 0 && files.length > 0) {
      return alert("Tu plan no permite subir imágenes. Mejora el plan.");
    }
    if (files.length > perks.maxImagesPerProduct) {
      return alert(`Máximo ${perks.maxImagesPerProduct} imágenes por producto en tu plan.`);
    }

    setSaving(true);
    try {
      const newImages = await uploadImages();
      const body = {
        name: String(form.name).trim(),
        price: Number(form.price),
        stock: Number(form.stock),
        ...(newImages.length ? { images: newImages } : {}),
      };

      if (editingId) {
        await http.put(`/seller/products/${editingId}`, body);
        alert("Producto actualizado.");
      } else {
        await http.post("/seller/products", body);
        alert("Producto creado.");
      }

      await Promise.allSettled([loadMyProducts(), loadMyCount()]);
      resetForm();
    } catch (e2) {
      const msg = e2?.payload?.error || e2?.payload?.message || e2?.message || "No se pudo guardar el producto.";
      alert(msg);
    } finally {
      setSaving(false);
    }
  };

  const editProduct = (p) => {
    setEditingId(p.id);
    setForm({
      name: p.name || "",
      price: Number(p.price ?? 0),
      stock: Number(p.stock ?? 0),
    });
    setFiles([]);
    setPreviews((p.images || []).map((im) => im.url));
  };

  const deleteProduct = async (id) => {
    if (!confirm("¿Eliminar este producto?")) return;
    try {
      await http.del(`/seller/products/${id}`);
      await Promise.allSettled([loadMyProducts(), loadMyCount()]);
      if (editingId === id) resetForm();
    } catch {
      alert("No se pudo eliminar.");
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await safePut(`/orders/${id}/status`, { status });
      setOrders(orders.map(o => (o.id === id ? { ...o, status } : o)));
    } catch {
      setOrders(orders.map(o => (o.id === id ? { ...o, status } : o))); // optimista
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
    if (tipo === "orders") return csvFromArray(orders, "pedidos.csv");
    if (tipo === "ventas") {
      const ventas = orders
        .filter(o => o.status !== "cancelled")
        .map(o => ({ id: o.id, fecha: o.created_at, total: o.total, status: o.status }));
      return csvFromArray(ventas, "ventas.csv");
    }
    if (tipo === "productos") {
      const listado = products.map(p => ({
        id: p.id, nombre: p.name, stock: p.stock, precio: p.price, imagenes: (p.images?.length || 0)
      }));
      return csvFromArray(listado, "productos.csv");
    }
  };

  const GateProEnt = ({ children }) => (perks.canSell ? children : (
    <div className="gate">
      <p><strong>Función disponible en Plan Pro o Enterprise.</strong></p>
      <a href="/pricing" className="btn">Mejorar plan</a>
    </div>
  ));

  const GateEnt = ({ children }) => (perks.audit ? children : (
    <div className="gate">
      <p><strong>Función exclusiva de Enterprise (Auditoría avanzada).</strong></p>
      <a href="/pricing" className="btn">Mejorar a Enterprise</a>
    </div>
  ));

  return (
    <section className="section">
      <div className="container">
        <div className="card seller">
          <header className="seller__head">
            <div>
              <h2>Panel de Vendedor</h2>
              <p className="muted">Plan actual: <strong className={`tag tag--${plan}`}>{perks.label}</strong></p>
            </div>
            {!perks.canSell && <a className="btn" href="/pricing">Mejorar plan</a>}
          </header>

          <div className="tabs">
            <button className={`tab ${tab==='resumen'?'active':''}`} onClick={()=>setTab("resumen")}>Resumen</button>
            <button className={`tab ${tab==='estados'?'active':''}`} onClick={()=>setTab("estados")}>Estados</button>
            <button className={`tab ${tab==='impuestos'?'active':''}`} onClick={()=>setTab("impuestos")}>Impuestos</button>
            <button className={`tab ${tab==='analitica'?'active':''}`} onClick={()=>setTab("analitica")}>Analítica</button>
            <button className={`tab ${tab==='informes'?'active':''}`} onClick={()=>setTab("informes")}>Informes</button>
            <button className={`tab ${tab==='seguridad'?'active':''}`} onClick={()=>setTab("seguridad")}>Seguridad</button>
            <button className={`tab ${tab==='auditoria'?'active':''}`} onClick={()=>setTab("auditoria")}>Auditoría</button>
            <button className={`tab ${tab==='finanzas'?'active':''}`} onClick={()=>setTab("finanzas")}>Finanzas</button>
          </div>

          {/* RESUMEN: KPIs + Form + Lista de productos */}
          {tab === "resumen" && (
            <div className="panel">
              <div className="kpis">
                <div className="kpi"><span className="kpi__label">Pedidos</span><span className="kpi__value">{kpis.totalOrders}</span></div>
                <div className="kpi"><span className="kpi__label">Ingresos</span><span className="kpi__value">Bs {kpis.revenue.toFixed(2)}</span></div>
                <div className="kpi"><span className="kpi__label">Ticket prom.</span><span className="kpi__value">Bs {kpis.avgOrder.toFixed(2)}</span></div>
                <div className="kpi"><span className="kpi__label">Conversión</span><span className="kpi__value">{kpis.conv.toFixed(1)}%</span></div>
              </div>

              {/* Límite */}
              <div className="limit">
                <div className="limit__info">
                  <strong>Productos:</strong> {myCount}/{perks.productLimit} permitidos
                  <span className="limit__hint">({Math.max(0, (perks.productLimit - myCount))} restantes)</span>
                </div>
                <div className="limit__bar">
                  <div className="limit__fill" style={{ width: `${Math.min(100, (myCount / perks.productLimit) * 100)}%` }} />
                </div>
                {perks.productLimit && myCount >= perks.productLimit && (
                  <p className="limit__warning">Límite alcanzado. <a href="/pricing">Mejorar plan</a></p>
                )}
              </div>

              {/* Form crear/editar */}
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

                <div style={{ gridColumn: "1 / -1" }}>
                  <label>Imágenes ({files.length}/{perks.maxImagesPerProduct})</label>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    disabled={!perks.canSell || perks.maxImagesPerProduct === 0}
                    onChange={onPickImages}
                  />
                  {!!previews.length && (
                    <div className="row" style={{ marginTop: 8 }}>
                      {previews.map((src, i) => (
                        <img key={i} src={src} alt={`prev-${i}`} style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 8 }} />
                      ))}
                    </div>
                  )}
                  {editingId && <p className="muted">Editando producto <strong>#{editingId}</strong>. Si no subes nuevas imágenes, se mantienen las actuales.</p>}
                </div>

                <div className="row">
                  <button type="submit" className="btn" disabled={saving || !canSell || (!editingId && (perks.productLimit && remaining <= 0))}>
                    {saving ? "Guardando…" : (editingId ? "Guardar cambios" : "Publicar")}
                  </button>
                  {editingId && (
                    <button type="button" className="btn btn--ghost" onClick={resetForm} disabled={saving}>Cancelar edición</button>
                  )}
                </div>

                {!canSell && <p className="muted">Tu plan no permite publicar. Mejora a PRO o ENTERPRISE.</p>}
              </form>

              {/* Lista de mis productos */}
              <div className="table" style={{ marginTop: 8 }}>
                <div className="table__head">
                  <div>Nombre</div><div>Precio</div><div>Stock</div><div>Imágenes</div><div>ID</div><div>Acciones</div>
                </div>
                {loadingProducts && (
                  <div className="table__row"><div>Cargando…</div><div></div><div></div><div></div><div></div><div></div></div>
                )}
                {!loadingProducts && errorProducts && (
                  <div className="table__row"><div>{errorProducts}</div><div></div><div></div><div></div><div></div><div></div></div>
                )}
                {!loadingProducts && !products.length && !errorProducts && (
                  <div className="table__row"><div>No tienes productos publicados todavía.</div><div></div><div></div><div></div><div></div><div></div></div>
                )}
                {products.map(p => (
                  <div className="table__row" key={p.id}>
                    <div>{p.name}</div>
                    <div>Bs {Number(p.price).toFixed(2)}</div>
                    <div>{Number(p.stock)}</div>
                    <div>{p.images?.length || 0}</div>
                    <div>{p.id}</div>
                    <div className="row">
                      <button className="btn btn--ghost" onClick={()=>editProduct(p)} disabled={saving}>Editar</button>
                      <button className="btn btn--ghost" onClick={()=>deleteProduct(p.id)} disabled={saving}>Eliminar</button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="row" style={{ marginTop: 8 }}>
                <button className="btn btn--ghost" onClick={()=>exportar("productos")}>Exportar listado (CSV)</button>
              </div>
            </div>
          )}

          {/* Estados */}
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

          {/* Impuestos */}
          {tab === "impuestos" && (
            <GateProEnt>
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
              </div>
            </GateProEnt>
          )}

          {/* Analítica */}
          {tab === "analitica" && (
            <GateProEnt>
              <div className="panel">
                <h3>Métricas de rendimiento</h3>
                <div className="kpis kpis--grid4">
                  <div className="kpi"><span className="kpi__label">Pedidos</span><span className="kpi__value">{kpis.totalOrders}</span></div>
                  <div className="kpi"><span className="kpi__label">Pagados/Entregados</span><span className="kpi__value">{kpis.paid}</span></div>
                  <div className="kpi"><span className="kpi__label">Ingresos (Bs)</span><span className="kpi__value">{kpis.revenue.toFixed(2)}</span></div>
                  <div className="kpi"><span className="kpi__label">Conversión</span><span className="kpi__value">{kpis.conv.toFixed(1)}%</span></div>
                </div>
              </div>
            </GateProEnt>
          )}

          {/* Informes */}
          {tab === "informes" && (
            <GateProEnt>
              <div className="panel">
                <div className="row">
                  <button className="btn" onClick={()=>exportar("orders")}>Descargar pedidos (CSV)</button>
                  <button className="btn" onClick={()=>exportar("ventas")}>Descargar ventas (CSV)</button>
                  <button className="btn" onClick={()=>exportar("productos")}>Descargar productos (CSV)</button>
                </div>
              </div>
            </GateProEnt>
          )}

          {/* Seguridad */}
          {tab === "seguridad" && (
            <GateProEnt>
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
              </div>
            </GateProEnt>
          )}

          {/* Auditoría */}
          {tab === "auditoria" && (
            <GateEnt>
              <div className="panel">
                <h3>Auditoría</h3>
                <div className="table">
                  <div className="table__head">
                    <div>Fecha</div><div>Actor</div><div>Acción</div><div>Meta</div><div>ID</div><div>—</div>
                  </div>
                  {audit.map(a => (
                    <div className="table__row" key={a.id}>
                      <div>{a.ts}</div>
                      <div>{a.actor}</div>
                      <div>{a.action}</div>
                      <div>{a.meta || "—"}</div>
                      <div>{a.id}</div>
                      <div><button className="btn btn--ghost" onClick={()=>alert("Detalle de auditoría (demo)")}>Ver</button></div>
                    </div>
                  ))}
                </div>
                <div className="row">
                  <button className="btn" onClick={()=>csvFromArray(audit, "auditoria.csv")}>Exportar auditoría (CSV)</button>
                </div>
              </div>
            </GateEnt>
          )}

          {/* Finanzas */}
          {tab === "finanzas" && (
            <GateProEnt>
              <div className="panel">
                <div className="kpis kpis--grid3">
                  <div className="kpi"><span className="kpi__label">Ingresos</span><span className="kpi__value">Bs {kpis.ing.toFixed(2)}</span></div>
                  <div className="kpi"><span className="kpi__label">Gastos</span><span className="kpi__value">Bs {kpis.gas.toFixed(2)}</span></div>
                  <div className={`kpi ${kpis.utilidad>=0?'':'neg'}`}>
                    <span className="kpi__label">Utilidad</span>
                    <span className="kpi__value">Bs {kpis.utilidad.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </GateProEnt>
          )}
        </div>
      </div>
    </section>
  );
}
