import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import "./App.css";
import HomePage from "./pages/HomePage";
import ProductDetailPage from "./pages/ProductDetailPage";
import CheckoutPage from "./pages/CheckoutPage";
import OrderSuccessPage from "./pages/OrderSuccessPage";
import AdminLoginPage from "./pages/AdminLoginPage";
import AdminDashboard from "./pages/AdminDashboard";
import AuthCallback from "./pages/AuthCallback";
import OrderTrackPage from "./pages/OrderTrackPage";
import MyOrdersPage from "./pages/MyOrdersPage";
import WhatsAppButton from "./components/WhatsAppButton";
import CartDrawer from "./components/CartDrawer";
import { AuthProvider } from "./contexts/AuthContext";
import { CartProvider } from "./contexts/CartContext";
import { Toaster } from "./components/ui/sonner";

function AppRouter() {
  const location = useLocation();
  // Check URL fragment (not query params) for session_id - synchronous, prevents race
  if (location.hash?.includes("session_id=")) {
    return <AuthCallback />;
  }
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/product/:id" element={<ProductDetailPage />} />
      <Route path="/checkout" element={<CheckoutPage />} />
      <Route path="/order-success" element={<OrderSuccessPage />} />
      <Route path="/track" element={<OrderTrackPage />} />
      <Route path="/my-orders" element={<MyOrdersPage />} />
      <Route path="/admin" element={<AdminLoginPage />} />
      <Route path="/admin/dashboard" element={<AdminDashboard />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <CartDrawer />
          <WhatsAppButton />
          <Toaster position="top-center" richColors />
          <AppRouter />
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
