import { Routes, Route, Navigate } from "react-router-dom";
import HomePage from "../../features/catalog/pages/HomePage.jsx";
import ProductDetailPage from "../../features/catalog/pages/ProductDetailPage.jsx";
import CartPage from "../../features/cart/pages/CartPage.jsx";
import CheckoutPage from "../../features/cart/pages/CheckoutPage.jsx";
import LoginPage from "../../features/auth/pages/LoginPage.jsx";
import SellerDashboardPage from "../../features/seller/pages/SellerDashboardPage.jsx";
import RegisterPage from "../../features/auth/pages/RegisterPage.jsx";
import ProfilePage from "../../features/auth/pages/ProfilePage.jsx";
import PricingPage from "../../features/billing/pages/PricingPage.jsx";

export default function Router() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/product/:id" element={<ProductDetailPage />} />
      <Route path="/cart" element={<CartPage />} />
      <Route path="/checkout" element={<CheckoutPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/seller" element={<SellerDashboardPage />} />
      <Route path="/pricing" element={<PricingPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
