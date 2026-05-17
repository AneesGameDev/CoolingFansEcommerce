import { useEffect } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { CheckCircle, Package, MessageCircle, Home, ShoppingBag, Truck, Search } from "lucide-react";

export default function OrderSuccessPage() {
  const { state } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!state?.order) navigate("/", { replace: true });
  }, [state, navigate]);

  if (!state?.order) return null;

  const { order } = state;
  const items = order.items || [];

  const itemSummary = items.map((it) => `${it.product_name} (x${it.quantity})`).join(", ");
  const waMessage = encodeURIComponent(
    `Hi OHo Mart! I just placed an order.\n\nOrder #: ${order.order_number}\nItems: ${itemSummary}\nTotal: Rs. ${order.total_price.toLocaleString()}\nName: ${order.customer_name}\nPhone: ${order.phone}\nAddress: ${order.address}, ${order.city}${order.province ? `, ${order.province}` : ""}`
  );

  const statusColors = {
    pending: "bg-amber-100 text-amber-700",
    confirmed: "bg-sky-100 text-sky-700",
    shipped: "bg-blue-100 text-blue-700",
    delivered: "bg-green-100 text-green-700",
  };

  return (
    <div className="min-h-screen bg-[#F0F9FF] flex items-center justify-center px-4 py-12">
      <div className="max-w-lg w-full">
        <div className="text-center mb-6 animate-fade-in-up">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Order Placed!
          </h1>
          <p className="text-slate-500">Thank you! Your order has been received successfully.</p>
        </div>

        <div className="bg-white rounded-2xl border border-sky-100 overflow-hidden mb-4 shadow-sm" data-testid="order-success-card">
          <div className="bg-sky-50 border-b border-sky-100 px-5 py-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Order Number</p>
              <p className="text-lg font-black text-sky-600" data-testid="order-number">{order.order_number}</p>
            </div>
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${statusColors[order.status] || "bg-slate-100 text-slate-600"}`}>
              {order.status?.toUpperCase()}
            </span>
          </div>

          <div className="p-5">
            {/* Items list */}
            <div className="space-y-3 mb-5 pb-5 border-b border-slate-100">
              {items.map((it, i) => (
                <div key={i} className="flex gap-3" data-testid={`success-item-${i}`}>
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-50 flex-shrink-0">
                    <img src={it.product_image} alt={it.product_name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 text-sm line-clamp-1">{it.product_name}</p>
                    {it.selected_color && <span className="text-[10px] text-slate-500">Color: {it.selected_color}</span>}
                    {it.selected_size && <span className="text-[10px] text-slate-500"> • Size: {it.selected_size}</span>}
                    <p className="text-xs text-slate-500">Qty: {it.quantity}</p>
                  </div>
                  <p className="text-sm font-bold text-sky-600 self-center">Rs. {(it.line_total || it.unit_price * it.quantity).toLocaleString()}</p>
                </div>
              ))}
            </div>

            <div className="space-y-2 text-sm mb-5">
              <div className="flex justify-between">
                <span className="text-slate-500 flex items-center gap-1.5"><Package className="w-3.5 h-3.5" /> Customer</span>
                <span className="font-semibold text-slate-800">{order.customer_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Phone</span>
                <span className="font-semibold text-slate-800">{order.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">WhatsApp</span>
                <span className="font-semibold text-slate-800">{order.whatsapp}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 flex items-center gap-1.5"><Truck className="w-3.5 h-3.5" /> Location</span>
                <span className="font-semibold text-slate-800 text-right">{order.city}{order.province ? `, ${order.province}` : ""}</span>
              </div>
              <div className="border-t border-slate-100 pt-2 flex justify-between font-black text-base">
                <span className="text-slate-700">Total (COD)</span>
                <span className="text-sky-600">Rs. {order.total_price.toLocaleString()}</span>
              </div>
            </div>

            <div className="bg-sky-50 rounded-xl p-4">
              <p className="text-xs font-bold text-sky-700 mb-3 uppercase tracking-wider">What happens next?</p>
              <div className="space-y-2">
                {[
                  "Our team will call you to confirm the order",
                  "Product will be dispatched within 1-2 days",
                  "You will receive tracking info on WhatsApp",
                  "Pay cash when you receive the delivery",
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-sky-700">
                    <div className="w-4 h-4 bg-sky-200 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-sky-700 font-bold text-xs">{i + 1}</span>
                    </div>
                    {step}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <a
            href={`https://wa.me/923000000000?text=${waMessage}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md"
            data-testid="whatsapp-confirm-btn"
          >
            <MessageCircle className="w-5 h-5" />
            Confirm Order on WhatsApp
          </a>

          <Link
            to="/track"
            className="w-full bg-amber-400 hover:bg-amber-500 text-slate-900 font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95"
            data-testid="track-this-order-btn"
          >
            <Search className="w-4 h-4" />
            Track This Order
          </Link>

          <Link
            to="/"
            className="w-full bg-sky-500 hover:bg-sky-600 text-white font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95"
            data-testid="continue-shopping-btn"
          >
            <ShoppingBag className="w-5 h-5" />
            Continue Shopping
          </Link>

          <Link
            to="/"
            className="w-full bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-all"
            data-testid="back-home-btn"
          >
            <Home className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
