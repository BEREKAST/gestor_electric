import Router from "./router";
import { AppProvider } from "./providers/AppProvider.jsx";
import Navbar from "../shared/components/Navbar.jsx";
import Footer from "../shared/components/Footer.jsx";
import { AuthProvider } from "../features/auth/context/AuthProvider.jsx";

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <Navbar />
        <Router />
        <Footer />
      </AppProvider>
    </AuthProvider>
    
  );
}
