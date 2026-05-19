import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Package, ArrowLeft, ShoppingBag } from "lucide-react";
import Header from "../components/Header";
import { useAuth } from "../contexts/AuthContext";
import GoogleLoginButton from "../components/GoogleLoginButton";
import Seo from "../seo/Seo";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const STATUS_COLORS = {
  pending: "bg-amber-100 text-amber-700",
  confirmed: "bg-sky-100 text-sky-700",
  shipped: "bg-blue-100 text-blue-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

export default function MyOrdersPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setLoading(false); return; }
    axios.get(`${API}/orders/my`, { withCredentials: true })
      .then((r) => setOrders(r.data))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, [user, authLoading]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#F0F9FF]">
        <Seo title="My Orders | OHo Mart" description="Your OHo Mart order history." canonicalPath="/my-orders" robots="noindex, nofollow" />
        <Header /><div className="p-12 text-center text-slate-500">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F0F9FF]">
        <Seo title="My Orders | OHo Mart" description="Sign in to view your OHo Mart order history." canonicalPath="/my-orders" robots="noindex, nofollow" />
        <Header />
        <div className="max-w-md mx-auto px-4 py-16 text-center" data-testid="my-orders-login-required">
          <div className="w-20 h-20 bg-sky-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Package className="w-10 h-10 text-sky-500" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 mb-2">Sign in to see your orders</h1>
          <p className="text-slate-500 mb-6">Login with Google to view all your past orders in one place.</p>
          <div className="flex justify-center" data-testid="my-orders-login-btn">
            <GoogleLoginButton />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F0F9FF]">
      <Seo title="My Orders | OHo Mart" description="Your OHo Mart order history." canonicalPath="/my-orders" robots="noindex, nofollow" />
      <Header />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-slate-500 hover:text-sky-500 mb-6 transition-colors"
          data-testid="my-orders-back-btn"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </button>

        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900" style={{ fontFamily: 'Outfit, sans-serif' }}>My Orders</h1>
          <p className="text-slate-500 mt-2">{orders.length} order{orders.length !== 1 ? "s" : ""} placed with your account</p>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-400">Loading orders...</div>
        ) : orders.length === 0 ? (
          <div className="bg-white rounded-2xl border border-sky-100 p-12 text-center" data-testid="my-orders-empty">
            <Package className="w-14 h-14 mx-auto text-slate-200 mb-3" />
            <p className="font-bold text-slate-700 mb-2">No orders yet</p>
            <p className="text-slate-500 text-sm mb-5">Start shopping to see your orders here.</p>
            <button
              onClick={() => navigate("/")}
              className="bg-sky-500 hover:bg-sky-600 text-white font-bold px-6 py-3 rounded-full transition-all inline-flex items-center gap-2"
            >
              <ShoppingBag className="w-4 h-4" /> Browse Products
            </button>
          </div>
        ) : (
          <div className="space-y-4" data-testid="my-orders-list">
            {orders.map((order) => (
              <div key={order.id} className="bg-white rounded-2xl border border-sky-100 overflow-hidden" data-testid={`my-order-${order.order_number}`}>
                <div className="px-5 py-3 bg-sky-50 border-b border-sky-100 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Order</p>
                    <p className="font-bold font-mono text-sky-700 text-sm">{order.order_number}</p>
                  </div>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${STATUS_COLORS[order.status] || "bg-slate-100"}`}>
                    {order.status?.toUpperCase()}
                  </span>
                  <p className="text-xs text-slate-500">{new Date(order.created_at).toLocaleDateString()}</p>
                </div>
                <div className="p-5">
                  <div className="space-y-2 mb-4">
                    {(order.items || [{
                      product_name: order.product_name,
                      product_image: order.product_image,
                      quantity: order.quantity,
                      unit_price: order.unit_price,
                    }]).map((it, i) => (
                      <div key={i} className="flex gap-3">
                        <img src={it.product_image} alt={it.product_name} className="w-14 h-14 rounded-lg object-cover bg-slate-50" />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-slate-900 line-clamp-1">{it.product_name}</p>
                          <p className="text-xs text-slate-500">Qty: {it.quantity}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                    <span className="text-sm text-slate-600">Total</span>
                    <span className="text-lg font-black text-sky-600">Rs. {order.total_price.toLocaleString()}</span>
                  </div>
                  <button
                    onClick={() => navigate(`/track`)}
                    className="mt-3 w-full bg-slate-100 hover:bg-sky-50 hover:text-sky-700 text-slate-700 font-semibold py-2.5 rounded-xl text-sm transition-all"
                    data-testid={`track-order-${order.order_number}`}
                  >
                    Track this order
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
