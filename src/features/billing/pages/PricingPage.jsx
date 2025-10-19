import "./PricingPage.css";
import { useNavigate, Link } from "react-router-dom";
import useAuth from "../../auth/context/useAuth.js";

export default function PricingPage(){
  const { user } = useAuth();
  const nav = useNavigate();

  const plans = [
    {
      id: "free",
      title: "Free",
      price: "Bs0",
      period: "/mes",
      tagline: "Para pruebas o equipos pequeños",
      features: ["Hasta 50 dispositivos", "Retención 14 días", "3 reportes/mes"]
    },
    {
      id: "pro",
      title: "Pro",
      price: "Bs690",
      period: "/mes",
      tagline: "Operación seria y alertas avanzadas",
      popular: true,
      features: ["Hasta 5,000 dispositivos", "Retención 6 meses", "Reportes programados"]
    },
    {
      id: "ent",
      title: "Enterprise",
      price: "Custom",
      period: "",
      tagline: "Escala ilimitada y soporte 24/7",
      features: ["Dispositivos ilimitados", "Retención 36+ meses", "SSO/SCIM, auditoría avanzada"]
    }
  ];

  function start(planId){
    if (planId === "free") {
      return !user ? nav("/register?role=seller") : nav("/seller");
    }
    if (planId === "pro") {
      return !user ? nav("/register?role=seller&plan=pro") : nav("/checkout?plan=pro");
    }
    // Enterprise → contacto por email
    window.location.href =
      "mailto:ventas@gestorelectric.com?subject=GestorElectric%20Enterprise&body=Hola%20equipo%2C%20quisiera%20informaci%C3%B3n%20del%20plan%20Enterprise.";
  }

  return (
    <section className="section">
      <div className="container">
        <h1 className="h1">Planes</h1>
        <p className="muted">Elige el plan que se ajuste a tu operación.</p>

        <div className="pricing-grid">
          {plans.map(p => (
            <article key={p.id} className={`plan card ${p.popular ? "popular" : ""}`}>
              {p.popular && <div className="badge">Más popular</div>}
              <h3 className="plan__title">{p.title}</h3>

              <div className="plan__price">
                <span className="amount">{p.price}</span>
                {p.period && <span className="per">{p.period}</span>}
              </div>

              <p className="plan__tagline">{p.tagline}</p>

              <ul className="plan__features">
                {p.features.map((f,i)=> <li key={i}>{f}</li>)}
              </ul>

              <button className="btn wide" onClick={() => start(p.id)}>
                {p.id === "ent" ? "Contactar" : "Comenzar"}
              </button>
            </article>
          ))}
        </div>

        <p className="muted" style={{marginTop:12}}>
          ¿Tienes dudas? <Link to="/seller">Visita tu panel de vendedor</Link> o <a href="mailto:soporte@gestorelectric.com">escríbenos</a>.
        </p>
      </div>
    </section>
  );
}
