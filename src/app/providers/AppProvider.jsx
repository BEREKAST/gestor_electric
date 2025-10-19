// src/app/providers/AppProvider.jsx
// ===============================================
// Este componente centraliza todos los providers globales
// (por ahora solo AuthProvider, pero aquí puedes añadir más
// como ThemeProvider, QueryClientProvider, etc.)
// ===============================================

import { AuthProvider } from "../../features/auth/context/AuthProvider.jsx"; // ✅ ruta actualizada

export function AppProvider({ children }) {
  // Envuelve toda la aplicación con los proveedores necesarios
  return <AuthProvider>{children}</AuthProvider>;
}
