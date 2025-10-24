// Reglas de producto, visibilidad y límites por plan
export const PLAN_PERKS = {
  free: {
    label: "FREE",
    canSell: false,
    productLimit: 20,           // Solo lectura + formulario bloqueado
    maxImagesPerProduct: 0,     // No puede subir imágenes
    catalog:
      { maxProductsOnHome: 20, showPremiumSpecs: false, showGallery: 1 },
    analytics: false,
    reports: false,
    taxes: false,
    audit: false,
  },
  pro: {
    label: "PRO",
    canSell: true,
    productLimit: 200,          // Ajusta si tienes otro límite
    maxImagesPerProduct: 3,
    catalog:
      { maxProductsOnHome: 60, showPremiumSpecs: true, showGallery: 3 },
    analytics: true,
    reports: true,
    taxes: true,
    audit: false,
  },
  enterprise: {
    label: "ENTERPRISE",
    canSell: true,
    productLimit: 100000,       // Prácticamente sin límite
    maxImagesPerProduct: 8,
    catalog:
      { maxProductsOnHome: 200, showPremiumSpecs: true, showGallery: 8 },
    analytics: true,
    reports: true,
    taxes: true,
    audit: true,                // ✅ Auditoría activada
  },
};

// Helper seguro para leer plan del user
export const getUserPlan = (user) =>
  (user?.plan || user?.vendor?.plan || "free").toLowerCase();
