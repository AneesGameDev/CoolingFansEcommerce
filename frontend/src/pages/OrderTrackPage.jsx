import { useState } from "react";
import axios from "axios";
import { Search, Package, ArrowLeft, CheckCircle, Truck, Clock, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const STATUS_INFO = {
  pending: { label: "Pending Confirmation", color: "bg-amber-100 text-amber-700 border-amber-200", icon: Clock, desc: "We will call you shortly to confirm your order." },
  confirmed: { label: "Confirmed", color: "bg-sky-100 text-sky-700 border-sky-200", icon: CheckCircle, desc: "Your order is confirmed and being prepared." },
  shipped: { label: "Shipped", color: "bg-blue-100 text-blue-700 border-blue-200", icon: Truck, desc: "Your order is on the way! Delivery in 1-2 days." },
  delivered: { label: "Delivered", color: "bg-green-100 text-green-700 border-green-200", icon: CheckCircle, desc: "Order delivered. Thank you for shopping!" },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-700 border-red-200", icon: AlertCircle, desc: "This order has been cancelled." },
};

export default function OrderTrackPage() {
  const navigate = useNavigate();
  const [orderNumber, setOrderNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");

  const handleTrack = async (e) => {
    e.preventDefault();
    if (!orderNumber.trim()) return;
    setLoading(true);
    setError("");
    setOrder(null);
    try {
      const r = await axios.get(`${API}/orders/track/${orderNumber.trim()}`);
      setOrder(r.data);
    } catch (err) {
      setError(err.response?.status === 404 ? "Order not found. Please check your order number." : "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const statusInfo = order ? (STATUS_INFO[order.status] || STATUS_INFO.pending) : null;
  const StatusIcon = statusInfo?.icon;

  return (
    <div className="min-h-screen bg-[#F0F9FF]">
      <Header />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-slate-500 hover:text-sky-500 mb-6 transition-colors"
          data-testid="track-back-btn"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </button>

        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-sky-100 text-sky-700 text-xs font-bold px-4 py-1.5 rounded-full mb-3 uppercase tracking-wider">
            <Package className="w-3.5 h-3.5" /> Order Tracking
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Track Your Order
          </h1>
          <p className="text-slate-500 mt-2">Enter your order number to see the latest status.</p>
        </div>

        <form onSubmit={handleTrack} className="bg-white rounded-2xl border border-sky-100 p-5 mb-6 shadow-sm" data-testid="track-form">
          <label className="block text-sm font-semibold text-slate-700 mb-2">Order Number</label>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value.toUpperCase())}
              placeholder="CB-20240501-XXXXXXXX"
              className="flex-1 border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:bg-white transition-all font-mono uppercase"
              data-testid="track-order-input"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-sky-500 hover:bg-sky-600 text-white font-bold px-6 py-3 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-60"
              data-testid="track-submit-btn"
            >
              <Search className="w-4 h-4" />
              {loading ? "Searching..." : "Track Order"}
            </button>
          </div>
          {error && <p className="text-red-500 text-sm mt-3 flex items-center gap-1.5" data-testid="track-error"><AlertCircle className="w-4 h-4" /> {error}</p>}
        </form>

        {order && (
          <div className="bg-white rounded-2xl border border-sky-100 overflow-hidden shadow-sm animate-fade-in-up" data-testid="track-order-result">
            <div className={`px-5 py-4 border-b ${statusInfo.color}`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/60 rounded-full flex items-center justify-center">
                  {StatusIcon && <StatusIcon className="w-5 h-5" />}
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold opacity-80 uppercase tracking-wider">Status</p>
                  <p className="font-black text-lg" data-testid="track-status">{statusInfo.label}</p>
                </div>
                <p className="text-xs font-mono opacity-70 hidden sm:block">{order.order_number}</p>
              </div>
              <p className="text-sm mt-2 opacity-90">{statusInfo.desc}</p>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-slate-400 uppercase font-semibold">Customer</p>
                  <p className="font-semibold text-slate-900">{order.customer_name}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase font-semibold">Phone</p>
                  <p className="font-semibold text-slate-900">{order.phone}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-slate-400 uppercase font-semibold">Delivery Address</p>
                  <p className="font-semibold text-slate-900">{order.address}, {order.city}{order.province ? `, ${order.province}` : ""}</p>
                </div>
              </div>

              {/* Items */}
              <div className="border-t border-slate-100 pt-4">
                <p className="text-xs text-slate-400 uppercase font-semibold mb-2">Items ({order.items?.length || 1})</p>
                <div className="space-y-2">
                  {(order.items || [{
                    product_name: order.product_name,
                    product_image: order.product_image,
                    quantity: order.quantity,
                    unit_price: order.unit_price,
                    line_total: order.total_price,
                    selected_color: order.selected_color,
                    selected_size: order.selected_size,
                  }]).map((it, i) => (
                    <div key={i} className="flex gap-3 bg-slate-50 rounded-xl p-3" data-testid={`track-item-${i}`}>
                      <img src={it.product_image} alt={it.product_name} className="w-14 h-14 rounded-lg object-cover bg-white" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-slate-900 line-clamp-1">{it.product_name}</p>
                        <div className="flex gap-1.5 text-xs text-slate-500 flex-wrap">
                          {it.selected_color && <span>Color: {it.selected_color}</span>}
                          {it.selected_size && <span>Size: {it.selected_size}</span>}
                          <span>Qty: {it.quantity}</span>
                        </div>
                      </div>
                      <p className="text-sm font-bold text-sky-600 self-center">Rs. {((it.line_total || it.unit_price * it.quantity) || 0).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 flex justify-between items-center">
                <span className="text-slate-700 font-semibold">Total (COD)</span>
                <span className="text-2xl font-black text-sky-600">Rs. {order.total_price.toLocaleString()}</span>
              </div>

              <a
                href={`https://wa.me/923000000000?text=Hi%20OHo Mart!%20I%20want%20to%20ask%20about%20order%20${encodeURIComponent(order.order_number)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-xl transition-all"
                data-testid="track-whatsapp-btn"
              >
                Need help? Chat on WhatsApp
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
