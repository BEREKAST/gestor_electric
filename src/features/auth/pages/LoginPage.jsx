import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./LoginPage.css";
import useAuth from "../context/useAuth.js"; // ✅ usamos el hook del contexto

export default function LoginPage() {
  const { login } = useAuth();         // obtenemos la función login() del contexto
  const nav = useNavigate();           // para redirigir luego del login

  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      // 🔹 Llama al método login del contexto (usa backend o mock)
      await login({ email, password: pass });

      // 🔹 Redirige al inicio o dashboard
      nav("/");
    } catch (err) {
      setError("Error al iniciar sesión. Intenta nuevamente.");
      console.error(err);
    }
  };

  return (
    <section className="section">
      <div className="container">
        <form className="card login" onSubmit={onSubmit}>
          <h2>Ingresar</h2>

          {/* Campo email */}
          <label>Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>

          {/* Campo contraseña */}
          <label>Contraseña
            <input
              type="password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              required
            />
          </label>

          {/* Botón */}
          <button className="btn">Entrar</button>

          {/* Mensaje de error */}
          {error && <p className="error">{error}</p>}
        </form>
      </div>
    </section>
  );
}
