// src/app/providers/AppProvider.jsx
// ===============================================
// Este componente centraliza todos los providers globales
// (AuthProvider, PlanProvider y futuros contextos globales)
// ===============================================

import { AuthProvider } from "../../features/auth/context/AuthProvider.jsx";
import { PlanProvider } from "../../features/billing/context/PlanProvider.jsx";

// ✅ Envuelve toda la app con Auth y Billing (planes)
export function AppProvider({ children }) {
  return (
    <AuthProvider>
      <PlanProvider>{children}</PlanProvider>
    </AuthProvider>
  );
}
