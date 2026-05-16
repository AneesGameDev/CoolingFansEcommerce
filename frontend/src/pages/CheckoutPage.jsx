import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { ArrowLeft, MapPin, Phone, User, MessageCircle, ShoppingBag, CheckCircle, Truck } from "lucide-react";
import Header from "../components/Header";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PROVINCES = ["Punjab", "Sindh", "KPK", "Balochistan", "AJK", "Gilgit-Baltistan", "ICT Islamabad"];

export default function CheckoutPage() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const [form, setForm] = useState({
    customer_name: "",
    phone: "",
    whatsapp: "",
    email: "",
    address: "",
    city: "",
    province: "Punjab",
    notes: ""
  });

  useEffect(() => {
    if (!state?.product) navigate("/");
  }, [state, navigate]);

  if (!state?.product) return null;

  const { product, selectedColor, selectedSize, quantity = 1 } = state;
  const totalPrice = product.discounted_price * quantity;

  const validate = () => {
    const errs = {};
    if (!form.customer_name.trim()) errs.customer_name = "Name is required";
    if (!form.phone.trim()) errs.phone = "Phone number is required";
    else if (!/^(\+92|0)[0-9]{10}$/.test(form.phone.replace(/\s/g, ""))) errs.phone = "Enter valid Pakistani phone number";
    if (!form.whatsapp.trim()) errs.whatsapp = "WhatsApp number is required";
    if (!form.address.trim()) errs.address = "Address is required";
    if (!form.city.trim()) errs.city = "City is required";
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
        product_id: product.id,
        product_name: product.name,
        product_image: product.images?.[0] || "",
        quantity,
        selected_color: selectedColor || null,
        selected_size: selectedSize || null,
        unit_price: product.discounted_price,
        total_price: totalPrice
      };
      const res = await axios.post(`${API}/orders`, orderData);
      navigate("/order-success", { state: { order: res.data, product } });
    } catch (err) {
      alert("Failed to place order. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const set = (field) => (e) => {
    setForm(p => ({ ...p, [field]: e.target.value }));
    if (errors[field]) setErrors(p => ({ ...p, [field]: "" }));
  };

  const inputClass = (field) =>
    `w-full border ${errors[field] ? "border-red-400 bg-red-50" : "border-slate-200 bg-slate-50"} rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:bg-white transition-all`;

  return (
    <div className="min-h-screen bg-[#F0F9FF]">
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

        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mb-8" style={{ fontFamily: 'Outfit, sans-serif' }} data-testid="checkout-title">
          Complete Your Order
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="space-y-5" data-testid="checkout-form">
              {/* Order Details Card */}
              <div className="bg-white rounded-2xl p-5 border border-sky-100">
                <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  <User className="w-5 h-5 text-sky-500" />
                  Personal Information
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Full Name *</label>
                    <input
                      type="text"
                      value={form.customer_name}
                      onChange={set("customer_name")}
                      placeholder="Muhammad Ali"
                      className={inputClass("customer_name")}
                      data-testid="input-name"
                    />
                    {errors.customer_name && <p className="text-red-500 text-xs mt-1">{errors.customer_name}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Email (Optional)</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={set("email")}
                      placeholder="ali@example.com"
                      className={inputClass("email")}
                      data-testid="input-email"
                    />
                  </div>
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
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={set("phone")}
                      placeholder="03001234567"
                      className={inputClass("phone")}
                      data-testid="input-phone"
                    />
                    {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">WhatsApp Number *</label>
                    <input
                      type="tel"
                      value={form.whatsapp}
                      onChange={set("whatsapp")}
                      placeholder="03001234567"
                      className={inputClass("whatsapp")}
                      data-testid="input-whatsapp"
                    />
                    {errors.whatsapp && <p className="text-red-500 text-xs mt-1">{errors.whatsapp}</p>}
                  </div>
                </div>
                <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                  <MessageCircle className="w-3 h-3" />
                  We will send order confirmation to your WhatsApp
                </p>
              </div>

              {/* Delivery Address */}
              <div className="bg-white rounded-2xl p-5 border border-sky-100">
                <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  <MapPin className="w-5 h-5 text-sky-500" />
                  Delivery Address
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Full Address *</label>
                    <textarea
                      value={form.address}
                      onChange={set("address")}
                      placeholder="House/Flat No., Street, Area/Mohalla..."
                      rows={2}
                      className={`${inputClass("address")} resize-none`}
                      data-testid="input-address"
                    />
                    {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">City *</label>
                      <input
                        type="text"
                        value={form.city}
                        onChange={set("city")}
                        placeholder="Karachi"
                        className={inputClass("city")}
                        data-testid="input-city"
                      />
                      {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Province *</label>
                      <select
                        value={form.province}
                        onChange={set("province")}
                        className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 appearance-none"
                        data-testid="input-province"
                      >
                        {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Order Notes (Optional)</label>
                    <textarea
                      value={form.notes}
                      onChange={set("notes")}
                      placeholder="Any special instructions, landmark, or delivery notes..."
                      rows={2}
                      className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 resize-none"
                      data-testid="input-notes"
                    />
                  </div>
                </div>
              </div>

              {/* COD Badge */}
              <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <Truck className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="font-bold text-green-800 text-sm">Cash on Delivery</p>
                  <p className="text-xs text-green-600">Pay when you receive your order. 100% safe!</p>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-sky-500 hover:bg-sky-600 text-white font-bold py-4 rounded-2xl text-lg transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
                data-testid="place-order-btn"
              >
                <ShoppingBag className="w-5 h-5" />
                {submitting ? "Placing Order..." : `Place Order — Rs. ${totalPrice.toLocaleString()}`}
              </button>
            </form>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-sky-100 overflow-hidden sticky top-24" data-testid="order-summary">
              <div className="p-5 border-b border-sky-100">
                <h3 className="font-black text-slate-900" style={{ fontFamily: 'Outfit, sans-serif' }}>Order Summary</h3>
              </div>
              <div className="p-5">
                {/* Product Image */}
                <div className="flex gap-3 mb-5">
                  <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-50 flex-shrink-0">
                    <img
                      src={product.images?.[0]}
                      alt={product.name}
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1618941716939-553df3c6c278?w=200"; }}
                    />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 text-sm line-clamp-2">{product.name}</p>
                    {selectedColor && <p className="text-xs text-slate-500 mt-0.5">Color: {selectedColor}</p>}
                    {selectedSize && <p className="text-xs text-slate-500">Size: {selectedSize}</p>}
                    <p className="text-xs text-slate-500">Qty: {quantity}</p>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-slate-600">
                    <span>Price x {quantity}</span>
                    <span>Rs. {(product.discounted_price * quantity).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Original Price</span>
                    <span className="line-through text-slate-400">Rs. {(product.price * quantity).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-green-600 font-semibold">
                    <span>You Save</span>
                    <span>Rs. {((product.price - product.discounted_price) * quantity).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Delivery</span>
                    <span className="text-green-600 font-semibold">FREE</span>
                  </div>
                  <div className="border-t border-slate-100 pt-2 flex justify-between font-black text-slate-900 text-base">
                    <span>Total (COD)</span>
                    <span className="text-sky-600">Rs. {totalPrice.toLocaleString()}</span>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  {[
                    { icon: CheckCircle, text: "Cash on Delivery", color: "text-green-600" },
                    { icon: Truck, text: "Free Delivery", color: "text-sky-600" },
                    { icon: CheckCircle, text: "7-Day Return Policy", color: "text-amber-600" },
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
