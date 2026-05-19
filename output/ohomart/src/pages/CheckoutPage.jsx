import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { ArrowLeft, MapPin, Phone, User, MessageCircle, ShoppingBag, CheckCircle, Truck, ShieldCheck } from "lucide-react";
import Header from "../components/Header";
import { useCart } from "../contexts/CartContext";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";
import Seo from "../seo/Seo";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const PROVINCES = ["Punjab", "Sindh", "KPK", "Balochistan", "AJK", "Gilgit-Baltistan", "ICT Islamabad"];

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { items, total, originalTotal, clear } = useCart();
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const [submitted, setSubmitted] = useState(false);

  const [form, setForm] = useState({
    customer_name: "",
    phone: "",
    whatsapp: "",
    email: "",
    address: "",
    city: "",
    province: "Punjab",
    notes: "",
  });

  useEffect(() => {
    if (!submitted && items.length === 0) navigate("/");
  }, [items.length, navigate, submitted]);

  useEffect(() => {
    if (user) {
      setForm((prev) => ({
        ...prev,
        customer_name: prev.customer_name || user.name || "",
        email: prev.email || user.email || "",
      }));
    }
  }, [user]);

  if (items.length === 0) return null;

  const savings = originalTotal - total;

  const validate = () => {
    const errs = {};
    if (!form.customer_name.trim()) errs.customer_name = "Name is required";
    if (!form.phone.trim()) errs.phone = "Phone number is required";
    else if (!/^(\+92|0)[0-9]{10}$/.test(form.phone.replace(/\s/g, ""))) errs.phone = "Enter valid Pakistani phone number";
    if (!form.whatsapp.trim()) errs.whatsapp = "WhatsApp number is required";
    if (!form.address.trim()) errs.address = "Address is required";
    if (!form.city.trim()) errs.city = "Location/City is required";
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setSubmitting(true);
    try {
      const orderData = {
        ...form,
        items: items.map((it) => ({
          product_id: it.product_id,
          product_name: it.product_name,
          product_image: it.product_image,
          quantity: it.quantity,
          selected_color: it.selected_color || null,
          selected_size: it.selected_size || null,
          unit_price: it.unit_price,
          line_total: it.unit_price * it.quantity,
        })),
        total_price: total,
      };
      const res = await axios.post(`${API}/orders`, orderData, { withCredentials: true });
      // Save order_number to localStorage so it can be claimed on signup/login later
      try {
        const stored = JSON.parse(localStorage.getItem("ohomart_guest_orders_v1") || "[]");
        if (!stored.includes(res.data.order_number)) {
          stored.push(res.data.order_number);
          localStorage.setItem("ohomart_guest_orders_v1", JSON.stringify(stored));
        }
      } catch (e) { /* guest order-linking is non-critical — proceed silently */ }
      setSubmitted(true);
      navigate("/order-success", { state: { order: res.data } });
      clear();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to place order. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const set = (field) => (e) => {
    setForm((p) => ({ ...p, [field]: e.target.value }));
    if (errors[field]) setErrors((p) => ({ ...p, [field]: "" }));
  };

  const inputClass = (field) =>
    `w-full border ${errors[field] ? "border-red-400 bg-red-50" : "border-slate-200 bg-slate-50"} rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:bg-white transition-all`;

  return (
    <div className="min-h-screen bg-[#F0F9FF]">
      <Seo title="Checkout | OHo Mart" description="Complete your OHo Mart order with cash on delivery." canonicalPath="/checkout" robots="noindex, nofollow" />
      <Header />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-500 hover:text-sky-500 mb-6 transition-colors group"
          data-testid="back-to-product-btn"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back
        </button>

        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2" style={{ fontFamily: 'Outfit, sans-serif' }} data-testid="checkout-title">
          Complete Your COD Order
        </h1>
        <p className="text-slate-500 mb-8">Pay cash when you receive your delivery. No advance payment.</p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="space-y-5" data-testid="checkout-form">
              {/* Personal */}
              <div className="bg-white rounded-2xl p-5 border border-sky-100">
                <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  <User className="w-5 h-5 text-sky-500" />
                  Your Information
                </h2>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Full Name *</label>
                  <input type="text" value={form.customer_name} onChange={set("customer_name")} placeholder="Muhammad Ali" className={inputClass("customer_name")} data-testid="input-name" />
                  {errors.customer_name && <p className="text-red-500 text-xs mt-1">{errors.customer_name}</p>}
                </div>
              </div>

              {/* Contact */}
              <div className="bg-white rounded-2xl p-5 border border-sky-100">
                <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  <Phone className="w-5 h-5 text-sky-500" />
                  Contact Numbers
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Phone Number *</label>
                    <input type="tel" value={form.phone} onChange={set("phone")} placeholder="03001234567" className={inputClass("phone")} data-testid="input-phone" />
                    {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">WhatsApp Number *</label>
                    <input type="tel" value={form.whatsapp} onChange={set("whatsapp")} placeholder="03001234567" className={inputClass("whatsapp")} data-testid="input-whatsapp" />
                    {errors.whatsapp && <p className="text-red-500 text-xs mt-1">{errors.whatsapp}</p>}
                  </div>
                </div>
                <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                  <MessageCircle className="w-3 h-3" />
                  We'll send order confirmation to your WhatsApp
                </p>
              </div>

              {/* Address */}
              <div className="bg-white rounded-2xl p-5 border border-sky-100">
                <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  <MapPin className="w-5 h-5 text-sky-500" />
                  Delivery Address
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Full Address *</label>
                    <textarea value={form.address} onChange={set("address")} placeholder="House/Flat No., Street, Area/Mohalla..." rows={2} className={`${inputClass("address")} resize-none`} data-testid="input-address" />
                    {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Location / City *</label>
                      <input type="text" value={form.city} onChange={set("city")} placeholder="Karachi" className={inputClass("city")} data-testid="input-city" />
                      {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Province *</label>
                      <select value={form.province} onChange={set("province")} className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" data-testid="input-province">
                        {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Order Notes (Optional)</label>
                    <textarea value={form.notes} onChange={set("notes")} placeholder="Any special instructions, landmark, or delivery notes..." rows={2} className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 resize-none" data-testid="input-notes" />
                  </div>
                </div>
              </div>

              {/* COD badge */}
              <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <Truck className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="font-bold text-green-800 text-sm">Cash on Delivery Only</p>
                  <p className="text-xs text-green-600">Pay cash when you receive your order. 100% safe!</p>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-sky-500 hover:bg-sky-600 text-white font-bold py-4 rounded-2xl text-lg transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
                data-testid="place-order-btn"
              >
                <ShoppingBag className="w-5 h-5" />
                {submitting ? "Placing Order..." : `Place Order — Rs. ${total.toLocaleString()}`}
              </button>
            </form>
          </div>

          {/* Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-sky-100 overflow-hidden sticky top-24" data-testid="order-summary">
              <div className="p-5 border-b border-sky-100">
                <h3 className="font-black text-slate-900" style={{ fontFamily: 'Outfit, sans-serif' }}>Order Summary</h3>
                <p className="text-xs text-slate-400 mt-0.5">{items.length} item{items.length !== 1 ? "s" : ""}</p>
              </div>
              <div className="p-5">
                <div className="space-y-3 mb-5 max-h-72 overflow-y-auto">
                  {items.map((it) => (
                    <div key={it.key} className="flex gap-3" data-testid={`summary-item-${it.product_id}`}>
                      <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-50 flex-shrink-0">
                        <img src={it.product_image} alt={it.product_name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 text-xs line-clamp-2">{it.product_name}</p>
                        <div className="flex gap-1 flex-wrap mt-0.5">
                          {it.selected_color && <span className="text-[10px] text-slate-500">{it.selected_color}</span>}
                          {it.selected_size && <span className="text-[10px] text-slate-500">• {it.selected_size}</span>}
                        </div>
                        <p className="text-[10px] text-slate-400">Qty: {it.quantity} × Rs. {it.unit_price.toLocaleString()}</p>
                      </div>
                      <p className="text-xs font-bold text-sky-600">Rs. {(it.unit_price * it.quantity).toLocaleString()}</p>
                    </div>
                  ))}
                </div>

                <div className="space-y-2 text-sm border-t border-slate-100 pt-3">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal</span>
                    <span>Rs. {total.toLocaleString()}</span>
                  </div>
                  {savings > 0 && (
                    <div className="flex justify-between text-green-600 font-semibold">
                      <span>You Save</span>
                      <span>Rs. {savings.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-600">
                    <span>Delivery</span>
                    <span className="text-green-600 font-semibold">FREE</span>
                  </div>
                  <div className="border-t border-slate-100 pt-2 flex justify-between font-black text-slate-900 text-base">
                    <span>Total (COD)</span>
                    <span className="text-sky-600">Rs. {total.toLocaleString()}</span>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  {[
                    { icon: CheckCircle, text: "Cash on Delivery", color: "text-green-600" },
                    { icon: Truck, text: "Delivery in 1-2 Days", color: "text-sky-600" },
                    { icon: ShieldCheck, text: "7-Day Check Warranty", color: "text-amber-600" },
                  ].map(({ icon: Icon, text, color }, i) => (
                    <div key={i} className={`flex items-center gap-2 text-xs font-semibold ${color}`}>
                      <Icon className="w-3.5 h-3.5" />
                      {text}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
