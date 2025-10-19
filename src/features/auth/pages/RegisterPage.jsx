import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import "./RegisterPage.css";
import useAuth from "../context/useAuth.js";

export default function RegisterPage() {
  const nav = useNavigate();
  const { register } = useAuth();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirm: "",
    role: "buyer",
    accept: false,
  });

  const [err, setErr] = useState("");

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");

    if (form.password !== form.confirm) {
      setErr("Las contraseñas no coinciden");
      return;
    }
    if (!form.accept) {
      setErr("Debes aceptar los términos y condiciones");
      return;
    }

    try {
      await register({
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role,   // plan lo forzará el backend a 'free'
      });
      nav("/", { replace: true });
    } catch (e) {
      setErr(e.message || "No se pudo crear la cuenta");
    }
  };

  return (
    <section className="section">
      <div className="container">
        <form className="card register" onSubmit={onSubmit}>
          <h2>Crea tu cuenta</h2>

          <div className="grid2">
            <label>Nombre completo
              <input name="name" value={form.name} onChange={onChange} required />
            </label>

            <label>Correo
              <input name="email" type="email" value={form.email} onChange={onChange} required />
            </label>

            <label>Contraseña
              <input name="password" type="password" value={form.password} onChange={onChange} required />
            </label>

            <label>Confirmar contraseña
              <input name="confirm" type="password" value={form.confirm} onChange={onChange} required />
            </label>

            <label>Tipo de cuenta
              <select name="role" value={form.role} onChange={onChange}>
                <option value="buyer">Comprador</option>
                <option value="seller">Vendedor</option>
              </select>
            </label>
          </div>

          <label className="check">
            <input type="checkbox" name="accept" checked={form.accept} onChange={onChange} />
            <span>Acepto los términos y condiciones</span>
          </label>

          {err && <p className="error">{err}</p>}
          <button className="btn">Crear cuenta</button>

          <p className="hint">
            ¿Ya tienes cuenta? <Link to="/login">Ingresar</Link>
          </p>
        </form>
      </div>
    </section>
  );
}
