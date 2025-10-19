import "./ProfilePage.css";
import useAuth from "/src/features/auth/context/useAuth.js";
import { useNavigate } from "react-router-dom";

export default function ProfilePage(){
  const { user, logout, loading } = useAuth(); // ← añadimos loading
  const nav = useNavigate();

  // Mientras rehidratamos (AuthAPI.me), no renderizamos “no has iniciado sesión”
  if (loading) {
    return (
      <section className="section">
        <div className="container">
          <div className="card profile">
            <h2>Cargando…</h2>
          </div>
        </div>
      </section>
    );
  }

  if(!user){
    return (
      <section className="section">
        <div className="container">
          <div className="card profile">
            <h2>No has iniciado sesión</h2>
            <p>Por favor, inicia sesión para ver tu perfil.</p>
          </div>
        </div>
      </section>
    );
  }

  const name = user.name || (user.email ? user.email.split("@")[0] : "Usuario");

  const handleLogout = async () => {
    await logout();                // ← importante: espera el POST /auth/logout
    nav("/", { replace: true });
  };

  return (
    <section className="section">
      <div className="container">
        <div className="card profile">
          <div className="profile__header">
            <div className="avatar">{name.charAt(0).toUpperCase()}</div>
            <div>
              <h2>{name}</h2>
              <p className="muted">{user.email}</p>
              <p className="muted">Rol: {user.role || "buyer"}</p>
            </div>
          </div>

          <div className="profile__actions">
            <button className="btn" onClick={handleLogout}>Cerrar sesión</button>
          </div>
        </div>
      </div>
    </section>
  );
}
