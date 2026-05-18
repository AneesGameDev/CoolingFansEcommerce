import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import {
  LayoutDashboard, Package, ShoppingCart, Star, LogOut, Wind,
  Plus, Edit2, Trash2, Check, X, ChevronDown, Eye, EyeOff, TrendingUp,
  Users, DollarSign, RefreshCw, AlertCircle, CheckCircle, Truck, XCircle, Settings, MessageSquare,
  Upload, Link2, ImagePlus, Film
} from "lucide-react";
import StarRating from "../components/StarRating";
import { useSiteSettings } from "../contexts/SiteSettingsContext";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const getConfig = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem("adminToken")}` }
});

const CATEGORIES = ["neck-fan", "baby-fan", "desk-fan", "handheld-fan", "car-fan", "travel-fan", "tower-fan", "kids-fan"];
const STATUS_OPTIONS = ["pending", "confirmed", "shipped", "delivered", "cancelled"];
const STATUS_COLORS = {
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  confirmed: "bg-sky-100 text-sky-700 border-sky-200",
  shipped: "bg-blue-100 text-blue-700 border-blue-200",
  delivered: "bg-green-100 text-green-700 border-green-200",
  cancelled: "bg-red-100 text-red-700 border-red-200"
};
const STATUS_ICONS = { pending: AlertCircle, confirmed: CheckCircle, shipped: Truck, delivered: Check, cancelled: XCircle };

const EMPTY_PRODUCT = {
  name: "", description: "", price: "", discounted_price: "", category: "neck-fan",
  images: [], video_url: "", colors: "", color_variants: [], sizes: "", features: "", battery_life: "", stock: 100, is_active: true
};

const EMPTY_REVIEW = {
  product_id: "", reviewer_name: "", rating: 5, comment: "", images: [], verified_purchase: false, is_approved: true, created_at: ""
};

const MAX_REVIEW_IMG_BYTES = 1.5 * 1024 * 1024;

// ---- MediaUploader: dual-input component (Browse from PC + HTTPS URL) ----
function MediaUploader({ label, accept, multiple, value, onChange, testId, hint }) {
  const fileInputRef = useRef(null);
  const [urlInput, setUrlInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [tab, setTab] = useState("browse"); // "browse" | "url"

  // value is array of URL strings
  const items = Array.isArray(value) ? value : (value ? value.split("\n").map(s => s.trim()).filter(Boolean) : []);

  const handleFiles = async (files) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    const newUrls = [];
    for (const rawFile of Array.from(files)) {
      try {
        // Compress images before sending to MongoDB (keeps storage small on free tier)
        const file = await compressImage(rawFile);
        const fd = new FormData();
        fd.append("file", file);
        const res = await axios.post(`${API}/admin/upload-media`, fd, {
          headers: { ...getConfig().headers, "Content-Type": "multipart/form-data" }
        });
        newUrls.push(res.data.url);
      } catch (e) {
        alert(`Upload failed for ${rawFile.name}: ${e.response?.data?.detail || e.message}`);
      }
    }
    setUploading(false);
    if (newUrls.length > 0) onChange([...items, ...newUrls]);
  };

  const addUrl = () => {
    const u = urlInput.trim();
    if (!u) return;
    if (!u.startsWith("http")) { alert("Please enter a valid HTTPS URL"); return; }
    onChange([...items, u]);
    setUrlInput("");
  };

  const removeItem = (idx) => onChange(items.filter((_, i) => i !== idx));

  const isVideo = accept && accept.includes("video");

  return (
    <div data-testid={testId}>
      <label className="block text-sm font-semibold text-slate-300 mb-2">{label}</label>
      <div className="flex gap-2 mb-3">
        <button type="button" onClick={() => setTab("browse")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${tab === "browse" ? "bg-sky-500 text-white" : "bg-slate-700 text-slate-300 hover:bg-slate-600"}`}>
          <Upload className="w-3.5 h-3.5" /> Browse File
        </button>
        <button type="button" onClick={() => setTab("url")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${tab === "url" ? "bg-sky-500 text-white" : "bg-slate-700 text-slate-300 hover:bg-slate-600"}`}>
          <Link2 className="w-3.5 h-3.5" /> Paste URL
        </button>
      </div>

      {tab === "browse" && (
        <div>
          <input ref={fileInputRef} type="file" accept={accept} multiple={multiple} className="hidden"
            onChange={e => handleFiles(e.target.files)} />
          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}
            className="w-full border-2 border-dashed border-slate-600 hover:border-sky-500 rounded-xl p-4 flex flex-col items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
            data-testid={`${testId}-browse-btn`}>
            {isVideo ? <Film className="w-6 h-6 text-slate-400" /> : <ImagePlus className="w-6 h-6 text-slate-400" />}
            <span className="text-slate-400 text-xs">{uploading ? "Uploading..." : `Click to select ${isVideo ? "video" : "image"} from PC / Mobile`}</span>
            {hint && <span className="text-slate-500 text-xs">{hint}</span>}
          </button>
        </div>
      )}

      {tab === "url" && (
        <div className="flex gap-2">
          <input type="url" value={urlInput} onChange={e => setUrlInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addUrl())}
            placeholder="https://example.com/image.jpg"
            className="flex-1 bg-slate-700 border border-slate-600 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            data-testid={`${testId}-url-input`} />
          <button type="button" onClick={addUrl}
            className="bg-sky-500 hover:bg-sky-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold">
            Add
          </button>
        </div>
      )}

      {items.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {items.map((url, i) => (
            <div key={i} className="relative group rounded-xl overflow-hidden bg-slate-900 border border-slate-700"
              data-testid={`${testId}-item-${i}`}>
              {isVideo
                ? <div className="aspect-video flex flex-col items-center justify-center gap-1 p-2"><Film className="w-6 h-6 text-slate-400" /><span className="text-xs text-slate-400 truncate w-full text-center">{url.split("/").pop()}</span></div>
                : <img src={url.startsWith("/api/media/") ? `${process.env.REACT_APP_BACKEND_URL}${url}` : url}
                    alt={`img-${i}`}
                    className="aspect-square object-cover w-full"
                    onError={e => { e.target.src = "https://images.unsplash.com/photo-1618941716939-553df3c6c278?w=100"; }} />
              }
              <button type="button" onClick={() => removeItem(i)}
                className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs">
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Compress image client-side before upload — reduces MongoDB storage significantly
// A 5 MB photo becomes ~150-300 KB. Max 1200px wide, 80% JPEG quality.
async function compressImage(file) {
  if (!file.type.startsWith("image/")) return file; // skip videos / non-images
  return new Promise((resolve) => {
    const img = new Image();
    const objUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objUrl);
      const MAX = 1200;
      const ratio = Math.min(MAX / img.width, MAX / img.height, 1);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * ratio);
      canvas.height = Math.round(img.height * ratio);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => resolve(new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" })),
        "image/jpeg",
        0.82
      );
    };
    img.onerror = () => { URL.revokeObjectURL(objUrl); resolve(file); };
    img.src = objUrl;
  });
}

const SITE_SETTINGS_GROUPS = [
  { title: "Brand", keys: ["brand_name", "brand_tagline", "whatsapp_number"] },
  { title: "Hero Section", keys: ["hero_badge", "hero_title_main", "hero_title_accent", "hero_subtitle", "hero_cta_primary", "hero_cta_secondary"] },
  { title: "Summer Sale Banner", keys: ["sale_banner_primary", "sale_banner_secondary", "sale_banner_tertiary"] },
  { title: "Products Section", keys: ["products_section_title", "products_section_subtitle"] },
  { title: "Why Buy Section", keys: ["why_buy_title", "why_buy_subtitle"] },
  { title: "Stats Strip", keys: ["stats_customers_value", "stats_customers_label", "stats_orders_value", "stats_orders_label", "stats_rating_value", "stats_rating_label", "stats_cities_value", "stats_cities_label"] },
  { title: "Founder Note", keys: ["founder_quote", "founder_name", "founder_role"] },
  { title: "Guarantee Banner", keys: ["guarantee_title", "guarantee_text"] },
  { title: "WhatsApp CTA", keys: ["whatsapp_cta_title", "whatsapp_cta_subtitle"] },
  { title: "Footer", keys: ["footer_tagline"] },
];

const TEXTAREA_KEYS = new Set(["hero_subtitle", "why_buy_subtitle", "products_section_subtitle", "founder_quote", "guarantee_text", "whatsapp_cta_subtitle", "footer_tagline"]);

export default function AdminDashboard() {
  const navigate = useNavigate();
  const siteSettings = useSiteSettings();
  const [tab, setTab] = useState("dashboard");
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [orderFilter, setOrderFilter] = useState("all");

  // Product form state
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState(EMPTY_PRODUCT);
  const [savingProduct, setSavingProduct] = useState(false);

  // Review form state
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [editingReview, setEditingReview] = useState(null);
  const [reviewForm, setReviewForm] = useState(EMPTY_REVIEW);
  const [savingReview, setSavingReview] = useState(false);

  // Site settings state
  const [settingsForm, setSettingsForm] = useState({});
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSavedAt, setSettingsSavedAt] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (!token) { navigate("/admin"); return; }
    loadAll();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [sRes, oRes, pRes, rRes] = await Promise.all([
        axios.get(`${API}/admin/stats`, getConfig()),
        axios.get(`${API}/admin/orders`, getConfig()),
        axios.get(`${API}/admin/products`, getConfig()),
        axios.get(`${API}/admin/reviews`, getConfig()),
      ]);
      setStats(sRes.data);
      setOrders(oRes.data);
      setProducts(pRes.data);
      setReviews(rRes.data);
    } catch {
      localStorage.removeItem("adminToken");
      navigate("/admin");
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminEmail");
    localStorage.removeItem("adminName");
    navigate("/admin");
  };

  const updateOrderStatus = async (orderId, status) => {
    try {
      const res = await axios.put(`${API}/admin/orders/${orderId}`, { status }, getConfig());
      setOrders(prev => prev.map(o => o.id === orderId ? res.data : o));
    } catch (e) { alert("Failed to update order"); }
  };

  const deleteOrder = async (orderId) => {
    if (!window.confirm("Delete this order?")) return;
    try {
      await axios.delete(`${API}/admin/orders/${orderId}`, getConfig());
      setOrders(prev => prev.filter(o => o.id !== orderId));
    } catch { alert("Failed to delete order"); }
  };

  const openProductForm = (product = null) => {
    if (product) {
      setEditingProduct(product);
      setProductForm({
        ...product,
        images: product.images || [],
        colors: product.colors?.join(", ") || "",
        color_variants: product.color_variants || [],
        sizes: product.sizes?.join(", ") || "",
        features: product.features?.join(", ") || "",
        video_url: product.video_url || "",
        price: product.price.toString(),
        discounted_price: product.discounted_price.toString(),
        stock: product.stock || 100
      });
    } else {
      setEditingProduct(null);
      setProductForm(EMPTY_PRODUCT);
    }
    setShowProductForm(true);
  };

  const addColorVariant = () => {
    setProductForm(p => ({ ...p, color_variants: [...(p.color_variants || []), { name: "", hex: "", image_url: "" }] }));
  };
  const updateColorVariant = (i, field, val) => {
    setProductForm(p => ({
      ...p,
      color_variants: p.color_variants.map((cv, idx) => idx === i ? { ...cv, [field]: val } : cv)
    }));
  };
  const removeColorVariant = (i) => {
    setProductForm(p => ({ ...p, color_variants: p.color_variants.filter((_, idx) => idx !== i) }));
  };

  const saveProduct = async (e) => {
    e.preventDefault();
    setSavingProduct(true);
    try {
      const imageList = Array.isArray(productForm.images)
        ? productForm.images.filter(Boolean)
        : productForm.images.split("\n").map(s => s.trim()).filter(Boolean);
      const variants = (productForm.color_variants || []).filter(cv => cv.name?.trim());
      // Auto-merge variant image_urls into images list (so they're available as main images)
      for (const cv of variants) {
        if (cv.image_url && !imageList.includes(cv.image_url)) imageList.push(cv.image_url);
      }
      const colorsArr = productForm.colors.split(",").map(s => s.trim()).filter(Boolean);
      // Auto-merge variant names into colors list
      for (const cv of variants) {
        if (cv.name && !colorsArr.includes(cv.name)) colorsArr.push(cv.name);
      }
      const payload = {
        ...productForm,
        price: parseFloat(productForm.price),
        discounted_price: parseFloat(productForm.discounted_price),
        images: imageList,
        colors: colorsArr,
        color_variants: variants,
        sizes: productForm.sizes.split(",").map(s => s.trim()).filter(Boolean),
        features: productForm.features.split(",").map(s => s.trim()).filter(Boolean),
        video_url: productForm.video_url || null,
        stock: parseInt(productForm.stock)
      };
      if (editingProduct) {
        const res = await axios.put(`${API}/products/${editingProduct.id}`, payload, getConfig());
        setProducts(prev => prev.map(p => p.id === editingProduct.id ? res.data : p));
      } else {
        const res = await axios.post(`${API}/products`, payload, getConfig());
        setProducts(prev => [res.data, ...prev]);
      }
      setShowProductForm(false);
    } catch (e) { alert("Failed to save product: " + (e.response?.data?.detail || e.message)); }
    finally { setSavingProduct(false); }
  };

  const deleteProduct = async (id) => {
    if (!window.confirm("Delete this product?")) return;
    try {
      await axios.delete(`${API}/products/${id}`, getConfig());
      setProducts(prev => prev.filter(p => p.id !== id));
    } catch { alert("Failed to delete product"); }
  };

  const openReviewForm = (review = null) => {
    if (review) {
      setEditingReview(review);
      // Convert ISO created_at to datetime-local format
      let createdLocal = "";
      if (review.created_at) {
        try {
          const d = new Date(review.created_at);
          if (!isNaN(d)) {
            const pad = (n) => String(n).padStart(2, "0");
            createdLocal = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
          }
        } catch {}
      }
      setReviewForm({ ...review, images: review.images || [], created_at: createdLocal });
    } else {
      setEditingReview(null);
      setReviewForm(EMPTY_REVIEW);
    }
    setShowReviewForm(true);
  };

  const handleReviewImageUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if ((reviewForm.images?.length || 0) + files.length > 3) {
      alert("Max 3 review images allowed");
      return;
    }
    for (const file of files) {
      if (!file.type.startsWith("image/")) continue;
      if (file.size > MAX_REVIEW_IMG_BYTES) { alert(`${file.name} too large (max 1.5MB)`); continue; }
      const reader = new FileReader();
      reader.onload = (ev) => {
        setReviewForm(p => p.images.length >= 3 ? p : { ...p, images: [...p.images, ev.target.result] });
      };
      reader.readAsDataURL(file);
    }
    e.target.value = "";
  };

  const saveReview = async (e) => {
    e.preventDefault();
    setSavingReview(true);
    try {
      // Convert datetime-local to ISO if provided
      let createdIso = reviewForm.created_at;
      if (createdIso && !createdIso.endsWith("Z") && !createdIso.includes("+")) {
        // datetime-local format e.g. "2024-05-12T14:30"
        const d = new Date(createdIso);
        if (!isNaN(d)) createdIso = d.toISOString();
      }
      const payload = { ...reviewForm, images: reviewForm.images || [], created_at: createdIso || null };
      if (editingReview) {
        const res = await axios.put(`${API}/admin/reviews/${editingReview.id}`, payload, getConfig());
        setReviews(prev => prev.map(r => r.id === editingReview.id ? res.data : r));
      } else {
        const res = await axios.post(`${API}/admin/reviews`, payload, getConfig());
        setReviews(prev => [res.data, ...prev]);
      }
      setShowReviewForm(false);
    } catch (e) { alert("Failed to save review: " + (e.response?.data?.detail || e.message)); }
    finally { setSavingReview(false); }
  };

  const deleteReview = async (id) => {
    if (!window.confirm("Delete this review?")) return;
    try {
      await axios.delete(`${API}/admin/reviews/${id}`, getConfig());
      setReviews(prev => prev.filter(r => r.id !== id));
    } catch { alert("Failed to delete review"); }
  };

  const toggleReview = async (id) => {
    try {
      const res = await axios.put(`${API}/admin/reviews/${id}/toggle`, {}, getConfig());
      setReviews(prev => prev.map(r => r.id === id ? res.data : r));
    } catch { alert("Failed to toggle review"); }
  };

  // ---- Site Settings ----
  useEffect(() => {
    // Populate settings form whenever siteSettings refreshes
    const allowedKeys = SITE_SETTINGS_GROUPS.flatMap(g => g.keys);
    const next = {};
    for (const k of allowedKeys) next[k] = siteSettings[k] ?? "";
    setSettingsForm(next);
  }, [siteSettings]);

  // ---- Admin Users management ----
  const [adminUsers, setAdminUsers] = useState([]);
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [newAdminForm, setNewAdminForm] = useState({ email: "", name: "", password: "" });

  const loadAdminUsers = useCallback(async () => {
    try {
      const r = await axios.get(`${API}/admin/admins`, getConfig());
      setAdminUsers(r.data || []);
    } catch (e) {
      console.error("Failed to load admin users:", e?.message || e);
    }
  }, []);

  useEffect(() => {
    if (tab === "admins") loadAdminUsers();
  }, [tab, loadAdminUsers]);

  const handleCreateAdmin = async () => {
    if (!newAdminForm.email || !newAdminForm.password) { alert("Email and password are required"); return; }
    if (newAdminForm.password.length < 8) { alert("Password must be at least 8 characters"); return; }
    try {
      await axios.post(`${API}/admin/admins`, newAdminForm, getConfig());
      setShowAddAdmin(false);
      setNewAdminForm({ email: "", name: "", password: "" });
      loadAdminUsers();
    } catch (e) { alert("Failed: " + (e.response?.data?.detail || e.message)); }
  };

  const handleToggleAdmin = async (email, is_active) => {
    try {
      await axios.patch(`${API}/admin/admins/${encodeURIComponent(email)}`, { is_active: !is_active }, getConfig());
      loadAdminUsers();
    } catch (e) { alert("Failed: " + (e.response?.data?.detail || e.message)); }
  };

  const handleChangeAdminPassword = async (email) => {
    const pw = window.prompt(`New password for ${email} (min 8 chars):`);
    if (!pw) return;
    if (pw.length < 8) { alert("Password must be at least 8 characters"); return; }
    try {
      await axios.patch(`${API}/admin/admins/${encodeURIComponent(email)}`, { password: pw }, getConfig());
      alert("Password updated");
    } catch (e) { alert("Failed: " + (e.response?.data?.detail || e.message)); }
  };

  const handleDeleteAdmin = async (email) => {
    if (!window.confirm(`Delete admin ${email}?`)) return;
    try {
      await axios.delete(`${API}/admin/admins/${encodeURIComponent(email)}`, getConfig());
      loadAdminUsers();
    } catch (e) { alert("Failed: " + (e.response?.data?.detail || e.message)); }
  };

  const saveSettings = async () => {
    setSavingSettings(true);
    try {
      await axios.put(`${API}/admin/site-settings`, { settings: settingsForm }, getConfig());
      siteSettings.refresh?.();
      setSettingsSavedAt(new Date());
      setTimeout(() => setSettingsSavedAt(null), 4000);
    } catch (e) { alert("Failed to save settings: " + (e.response?.data?.detail || e.message)); }
    finally { setSavingSettings(false); }
  };

  // ---- Testimonials editor ----
  const [testimonials, setTestimonials] = useState([]);
  const [savingTestimonials, setSavingTestimonials] = useState(false);
  const [testimonialsSavedAt, setTestimonialsSavedAt] = useState(null);

  useEffect(() => {
    setTestimonials(siteSettings.featured_testimonials || []);
  }, [siteSettings.featured_testimonials]);

  const addTestimonial = () => {
    setTestimonials((p) => [...p, { name: "", city: "", rating: 5, quote: "", avatar: "", date: "" }]);
  };
  const updateTestimonial = (i, field, val) => {
    setTestimonials((p) => p.map((t, idx) => idx === i ? { ...t, [field]: field === "rating" ? Number(val) : val } : t));
  };
  const removeTestimonial = (i) => {
    setTestimonials((p) => p.filter((_, idx) => idx !== i));
  };
  const saveTestimonials = async () => {
    setSavingTestimonials(true);
    try {
      const valid = testimonials.filter((t) => t.name?.trim() && t.quote?.trim());
      await axios.put(`${API}/admin/testimonials`, { testimonials: valid }, getConfig());
      siteSettings.refresh?.();
      setTestimonialsSavedAt(new Date());
      setTimeout(() => setTestimonialsSavedAt(null), 4000);
    } catch (e) { alert("Failed to save testimonials: " + (e.response?.data?.detail || e.message)); }
    finally { setSavingTestimonials(false); }
  };

  const filteredOrders = orderFilter === "all" ? orders : orders.filter(o => o.status === orderFilter);
  const adminName = localStorage.getItem("adminName") || "Admin";

  const TABS = [
    { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { key: "orders", label: `Orders (${orders.length})`, icon: ShoppingCart },
    { key: "products", label: `Products (${products.length})`, icon: Package },
    { key: "reviews", label: `Reviews (${reviews.length})`, icon: Star },
    { key: "admins", label: "Admin Users", icon: Users },
    { key: "site", label: "Site Content", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* Admin Header */}
      <header className="bg-slate-800 border-b border-slate-700 px-4 py-3 flex items-center justify-between sticky top-0 z-40" data-testid="admin-header">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-sky-500 rounded-lg flex items-center justify-center">
              <Wind className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-bold text-sm hidden sm:block" style={{ fontFamily: 'Outfit, sans-serif' }}>OHo Mart</span>
          </Link>
          <span className="text-slate-500 text-sm hidden sm:block">/ Admin Panel</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={loadAll} className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-700 transition-colors" title="Refresh">
            <RefreshCw className="w-4 h-4" />
          </button>
          <span className="text-slate-300 text-sm hidden sm:block">Hi, {adminName}</span>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 bg-slate-700 hover:bg-red-600 text-slate-300 hover:text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
            data-testid="admin-logout-btn"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:block">Logout</span>
          </button>
        </div>
      </header>

      {/* Tab Nav */}
      <div className="bg-slate-800 border-b border-slate-700 px-4 overflow-x-auto scrollbar-hide">
        <div className="flex gap-1 min-w-max">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-all whitespace-nowrap border-b-2 ${tab === key ? "border-sky-500 text-sky-400" : "border-transparent text-slate-400 hover:text-slate-200"}`}
              data-testid={`admin-tab-${key}`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <main className="flex-1 p-4 sm:p-6 overflow-auto">
        {/* ---- DASHBOARD ---- */}
        {tab === "dashboard" && (
          <div data-testid="dashboard-tab">
            <h2 className="text-xl font-black text-white mb-6" style={{ fontFamily: 'Outfit, sans-serif' }}>Dashboard Overview</h2>
            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {[
                  { label: "Total Orders", value: stats.total_orders, icon: ShoppingCart, color: "text-sky-400", bg: "bg-sky-500/10" },
                  { label: "Pending Orders", value: stats.pending_orders, icon: AlertCircle, color: "text-amber-400", bg: "bg-amber-500/10" },
                  { label: "Total Revenue", value: `Rs. ${(stats.total_revenue || 0).toLocaleString()}`, icon: DollarSign, color: "text-green-400", bg: "bg-green-500/10" },
                  { label: "Products", value: stats.total_products, icon: Package, color: "text-purple-400", bg: "bg-purple-500/10" },
                ].map(({ label, value, icon: Icon, color, bg }) => (
                  <div key={label} className="bg-slate-800 rounded-2xl p-4 border border-slate-700">
                    <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center mb-3`}>
                      <Icon className={`w-5 h-5 ${color}`} />
                    </div>
                    <p className="text-2xl font-black text-white">{value}</p>
                    <p className="text-slate-400 text-sm mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Recent Orders */}
            <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
              <div className="p-4 border-b border-slate-700 flex items-center justify-between">
                <h3 className="font-bold text-white">Recent Orders</h3>
                <button onClick={() => setTab("orders")} className="text-sky-400 text-sm hover:text-sky-300">View All</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-700/50">
                    <tr>
                      {["Order #", "Customer", "Product", "Total", "Status"].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-slate-400 font-semibold whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {orders.slice(0, 5).map(o => {
                      const StatusIcon = STATUS_ICONS[o.status] || AlertCircle;
                      return (
                        <tr key={o.id} className="border-t border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                          <td className="px-4 py-3 text-sky-400 font-mono text-xs">{o.order_number}</td>
                          <td className="px-4 py-3 text-slate-200">{o.customer_name}</td>
                          <td className="px-4 py-3 text-slate-300 max-w-[150px] truncate">{o.product_name}</td>
                          <td className="px-4 py-3 text-white font-semibold">Rs. {o.total_price?.toLocaleString()}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full border ${STATUS_COLORS[o.status] || "bg-slate-100 text-slate-600 border-slate-200"}`}>
                              <StatusIcon className="w-3 h-3" />
                              {o.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {orders.length === 0 && <div className="text-center py-8 text-slate-500">No orders yet</div>}
              </div>
            </div>
          </div>
        )}

        {/* ---- ORDERS ---- */}
        {tab === "orders" && (
          <div data-testid="orders-tab">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <h2 className="text-xl font-black text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>All Orders</h2>
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                {["all", ...STATUS_OPTIONS].map(s => (
                  <button
                    key={s}
                    onClick={() => setOrderFilter(s)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${orderFilter === s ? "bg-sky-500 text-white" : "bg-slate-700 text-slate-400 hover:text-white"}`}
                    data-testid={`filter-${s}`}
                  >
                    {s === "all" ? `All (${orders.length})` : `${s} (${orders.filter(o => o.status === s).length})`}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              {filteredOrders.map(order => {
                const StatusIcon = STATUS_ICONS[order.status] || AlertCircle;
                const isExpanded = expandedOrder === order.id;
                return (
                  <div key={order.id} className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden" data-testid={`order-row-${order.id}`}>
                    <div
                      className="flex flex-wrap items-center gap-3 p-4 cursor-pointer hover:bg-slate-700/30 transition-colors"
                      onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                    >
                      <span className="text-sky-400 font-mono text-xs font-bold w-36">{order.order_number}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-semibold text-sm truncate">{order.customer_name}</p>
                        <p className="text-slate-400 text-xs truncate">
                          {order.items?.length > 0
                            ? order.items.map(i => `${i.product_name} (x${i.quantity})`).join(", ")
                            : order.product_name}
                        </p>
                      </div>
                      <span className="text-white font-bold text-sm">Rs. {order.total_price?.toLocaleString()}</span>
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${STATUS_COLORS[order.status] || ""}`}>
                        <StatusIcon className="w-3 h-3" />
                        {order.status}
                      </span>
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform flex-shrink-0 ${isExpanded ? "rotate-180" : ""}`} />
                    </div>

                    {isExpanded && (
                      <div className="border-t border-slate-700 p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5 text-sm">
                          <p className="text-slate-400">Phone: <span className="text-white">{order.phone}</span></p>
                          <p className="text-slate-400">WhatsApp: <span className="text-white">{order.whatsapp}</span></p>
                          <p className="text-slate-400">Address: <span className="text-white">{order.address}</span></p>
                          <p className="text-slate-400">City: <span className="text-white">{order.city}{order.province ? `, ${order.province}` : ""}</span></p>
                          {order.user_email && <p className="text-slate-400">User: <span className="text-sky-400">{order.user_email}</span></p>}
                          {order.notes && <p className="text-slate-400">Notes: <span className="text-white">{order.notes}</span></p>}
                          <p className="text-slate-400">Date: <span className="text-white">{new Date(order.created_at).toLocaleString()}</span></p>
                          <div className="mt-2 pt-2 border-t border-slate-700">
                            <p className="text-slate-400 mb-1 text-xs font-bold uppercase">Items:</p>
                            {(order.items || [{
                              product_name: order.product_name, quantity: order.quantity,
                              selected_color: order.selected_color, selected_size: order.selected_size, line_total: order.total_price
                            }]).map((it, i) => (
                              <div key={i} className="text-xs text-slate-300 ml-2">
                                • {it.product_name} (x{it.quantity})
                                {it.selected_color ? ` • ${it.selected_color}` : ""}
                                {it.selected_size ? ` • ${it.selected_size}` : ""}
                                {it.line_total ? ` — Rs. ${it.line_total.toLocaleString()}` : ""}
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="flex flex-col gap-3">
                          <div>
                            <p className="text-slate-400 text-xs mb-2">Change Status:</p>
                            <div className="flex flex-wrap gap-2">
                              {STATUS_OPTIONS.map(s => (
                                <button
                                  key={s}
                                  onClick={() => updateOrderStatus(order.id, s)}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${order.status === s ? "bg-sky-500 text-white" : "bg-slate-700 text-slate-300 hover:bg-slate-600"}`}
                                  data-testid={`status-btn-${s}`}
                                >
                                  {s}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <a
                              href={`https://wa.me/${order.whatsapp?.replace(/[^0-9]/g, '')}?text=Hi%20${encodeURIComponent(order.customer_name)}!%20Your%20OHo Mart%20order%20${order.order_number}%20is%20confirmed.`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-xs font-bold transition-all"
                              data-testid={`wa-order-btn-${order.id}`}
                            >
                              <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z" />
                              </svg>
                              WhatsApp
                            </a>
                            <button
                              onClick={() => deleteOrder(order.id)}
                              className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-xs font-bold transition-all"
                              data-testid={`delete-order-btn-${order.id}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {filteredOrders.length === 0 && (
                <div className="text-center py-12 text-slate-500">
                  <ShoppingCart className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p>No orders found</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ---- PRODUCTS ---- */}
        {tab === "products" && (
          <div data-testid="products-tab">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>Products</h2>
              <button
                onClick={() => openProductForm()}
                className="flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white px-4 py-2 rounded-xl font-semibold text-sm transition-all"
                data-testid="add-product-btn"
              >
                <Plus className="w-4 h-4" />
                Add Product
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map(p => {
                const disc = Math.round(((p.price - p.discounted_price) / p.price) * 100);
                return (
                  <div key={p.id} className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden" data-testid={`admin-product-${p.id}`}>
                    <div className="relative aspect-video bg-slate-700">
                      <img
                        src={p.images?.[0]}
                        alt={p.name}
                        className="w-full h-full object-cover"
                        onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1618941716939-553df3c6c278?w=300"; }}
                      />
                      <div className="absolute top-2 left-2 bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">-{disc}%</div>
                      <div className={`absolute top-2 right-2 text-xs font-bold px-2 py-0.5 rounded-full ${p.is_active ? "bg-green-500 text-white" : "bg-red-500 text-white"}`}>
                        {p.is_active ? "Active" : "Inactive"}
                      </div>
                    </div>
                    <div className="p-4">
                      <p className="text-white font-bold text-sm line-clamp-1 mb-1">{p.name}</p>
                      <p className="text-sky-400 font-black text-sm">Rs. {p.discounted_price.toLocaleString()} <span className="text-slate-500 line-through font-normal">Rs. {p.price.toLocaleString()}</span></p>
                      <p className="text-slate-400 text-xs mt-1">
                        Stock: <span className={p.stock <= 0 ? "text-red-400 font-bold" : "text-white"}>{p.stock <= 0 ? "SOLD OUT" : p.stock}</span> | Sold: {p.total_sold || 0}
                      </p>
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => openProductForm(p)}
                          className="flex-1 flex items-center justify-center gap-1.5 bg-slate-700 hover:bg-sky-600 text-slate-300 hover:text-white py-2 rounded-lg text-xs font-bold transition-all"
                          data-testid={`edit-product-${p.id}`}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          Edit
                        </button>
                        <button
                          onClick={() => deleteProduct(p.id)}
                          className="flex-1 flex items-center justify-center gap-1.5 bg-slate-700 hover:bg-red-600 text-slate-300 hover:text-white py-2 rounded-lg text-xs font-bold transition-all"
                          data-testid={`delete-product-${p.id}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ---- REVIEWS ---- */}
        {tab === "reviews" && (
          <div data-testid="reviews-tab">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>Reviews</h2>
              <button
                onClick={() => openReviewForm()}
                className="flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white px-4 py-2 rounded-xl font-semibold text-sm transition-all"
                data-testid="add-review-btn"
              >
                <Plus className="w-4 h-4" />
                Add Review
              </button>
            </div>

            <div className="space-y-3">
              {reviews.map(r => {
                const prod = products.find(p => p.id === r.product_id);
                return (
                  <div key={r.id} className="bg-slate-800 rounded-2xl border border-slate-700 p-4" data-testid={`admin-review-${r.id}`}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-white font-bold text-sm">{r.reviewer_name}</p>
                          {r.verified_purchase && (
                            <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">Verified</span>
                          )}
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${r.is_approved ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                            {r.is_approved ? "Approved" : "Hidden"}
                          </span>
                        </div>
                        <StarRating rating={r.rating} size="sm" />
                        <p className="text-slate-300 text-sm mt-1.5">{r.comment}</p>
                        {prod && <p className="text-sky-400 text-xs mt-1">Product: {prod.name}</p>}
                        <p className="text-slate-500 text-xs mt-1">{new Date(r.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() => toggleReview(r.id)}
                          className={`p-2 rounded-lg text-xs font-bold transition-all ${r.is_approved ? "bg-amber-600 hover:bg-amber-700 text-white" : "bg-green-600 hover:bg-green-700 text-white"}`}
                          title={r.is_approved ? "Hide" : "Approve"}
                          data-testid={`toggle-review-${r.id}`}
                        >
                          {r.is_approved ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => openReviewForm(r)}
                          className="p-2 bg-slate-700 hover:bg-sky-600 text-slate-300 hover:text-white rounded-lg transition-all"
                          title="Edit"
                          data-testid={`edit-review-${r.id}`}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteReview(r.id)}
                          className="p-2 bg-slate-700 hover:bg-red-600 text-slate-300 hover:text-white rounded-lg transition-all"
                          title="Delete"
                          data-testid={`delete-review-${r.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {reviews.length === 0 && (
                <div className="text-center py-12 text-slate-500">
                  <Star className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p>No reviews yet</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ---- ADMIN USERS ---- */}
        {tab === "admins" && (
          <div data-testid="admins-tab">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-black text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>Admin Users</h2>
                <p className="text-slate-400 text-sm mt-1">Manage who can access this admin panel. Each email + password pair can log into /admin.</p>
              </div>
              <button
                onClick={() => setShowAddAdmin(true)}
                className="flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white px-4 py-2 rounded-xl font-semibold text-sm transition-all"
                data-testid="add-admin-btn"
              >
                <Plus className="w-4 h-4" />
                Add Admin
              </button>
            </div>

            <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-700/50">
                    <tr>
                      {["Name", "Email", "Status", "Created", "Actions"].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-slate-400 font-semibold whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {adminUsers.map(u => (
                      <tr key={u.email} className="border-t border-slate-700/50 hover:bg-slate-700/30 transition-colors" data-testid={`admin-user-row-${u.email}`}>
                        <td className="px-4 py-3 text-white font-medium">{u.name || "—"}</td>
                        <td className="px-4 py-3 text-sky-400 font-mono text-xs">{u.email}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full ${u.is_active ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                            {u.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-xs">{u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2 flex-wrap">
                            <button
                              onClick={() => handleChangeAdminPassword(u.email)}
                              className="text-xs bg-slate-700 hover:bg-sky-600 text-slate-300 hover:text-white px-2.5 py-1.5 rounded-lg font-medium transition-all"
                              data-testid={`change-pw-btn-${u.email}`}
                            >
                              Reset PW
                            </button>
                            <button
                              onClick={() => handleToggleAdmin(u.email, u.is_active)}
                              className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition-all ${u.is_active ? "bg-amber-600/30 hover:bg-amber-600 text-amber-300 hover:text-white" : "bg-green-600/30 hover:bg-green-600 text-green-300 hover:text-white"}`}
                              data-testid={`toggle-admin-btn-${u.email}`}
                            >
                              {u.is_active ? "Deactivate" : "Activate"}
                            </button>
                            <button
                              onClick={() => handleDeleteAdmin(u.email)}
                              className="text-xs bg-red-600/30 hover:bg-red-600 text-red-300 hover:text-white px-2.5 py-1.5 rounded-lg font-medium transition-all"
                              data-testid={`delete-admin-btn-${u.email}`}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {adminUsers.length === 0 && (
                  <div className="text-center py-12 text-slate-500">
                    <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
                    <p>No admin users found. Click "Add Admin" to add one.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Add Admin Modal */}
            {showAddAdmin && (
              <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" data-testid="add-admin-modal">
                <div className="bg-slate-800 rounded-2xl border border-slate-700 w-full max-w-md">
                  <div className="flex items-center justify-between p-5 border-b border-slate-700">
                    <h3 className="text-lg font-black text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>Add New Admin</h3>
                    <button onClick={() => { setShowAddAdmin(false); setNewAdminForm({ email: "", name: "", password: "" }); }} className="text-slate-400 hover:text-white">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="p-5 space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-300 mb-1">Email *</label>
                      <input
                        type="email"
                        value={newAdminForm.email}
                        onChange={e => setNewAdminForm(p => ({ ...p, email: e.target.value }))}
                        placeholder="admin@ohomart.pk"
                        className="w-full bg-slate-700 border border-slate-600 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                        data-testid="new-admin-email-input"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-300 mb-1">Name (optional)</label>
                      <input
                        type="text"
                        value={newAdminForm.name}
                        onChange={e => setNewAdminForm(p => ({ ...p, name: e.target.value }))}
                        placeholder="Admin Name"
                        className="w-full bg-slate-700 border border-slate-600 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                        data-testid="new-admin-name-input"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-300 mb-1">Password * (min 8 chars)</label>
                      <input
                        type="password"
                        value={newAdminForm.password}
                        onChange={e => setNewAdminForm(p => ({ ...p, password: e.target.value }))}
                        placeholder="••••••••"
                        className="w-full bg-slate-700 border border-slate-600 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                        data-testid="new-admin-password-input"
                      />
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={handleCreateAdmin}
                        className="flex-1 bg-sky-500 hover:bg-sky-600 text-white font-bold py-3 rounded-xl transition-all"
                        data-testid="create-admin-submit-btn"
                      >
                        Create Admin
                      </button>
                      <button
                        onClick={() => { setShowAddAdmin(false); setNewAdminForm({ email: "", name: "", password: "" }); }}
                        className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold py-3 rounded-xl transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ---- SITE CONTENT ---- */}
        {tab === "site" && (
          <div data-testid="site-content-tab">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
              <div>
                <h2 className="text-xl font-black text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>Site Content</h2>
                <p className="text-slate-400 text-sm mt-1">Edit every major text, deal banner, and brand copy on your store.</p>
              </div>
              <button
                onClick={saveSettings}
                disabled={savingSettings}
                className="flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all disabled:opacity-60"
                data-testid="save-site-settings-btn"
              >
                <Check className="w-4 h-4" />
                {savingSettings ? "Saving..." : "Save All Changes"}
              </button>
            </div>
            {settingsSavedAt && (
              <div className="bg-green-500/20 border border-green-500/40 text-green-300 rounded-xl px-4 py-2.5 mb-5 text-sm flex items-center gap-2" data-testid="settings-saved-toast">
                <CheckCircle className="w-4 h-4" /> Saved — changes are live on the website!
              </div>
            )}

            <div className="space-y-5">
              {SITE_SETTINGS_GROUPS.map((group) => (
                <div key={group.title} className="bg-slate-800 rounded-2xl border border-slate-700 p-5" data-testid={`settings-group-${group.title.replace(/\s+/g, '-').toLowerCase()}`}>
                  <h3 className="text-white font-black mb-4 text-sm uppercase tracking-wider flex items-center gap-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                    <MessageSquare className="w-4 h-4 text-sky-400" /> {group.title}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {group.keys.map((key) => (
                      <div key={key} className={TEXTAREA_KEYS.has(key) ? "md:col-span-2" : ""}>
                        <label className="block text-xs font-bold text-slate-300 mb-1 uppercase tracking-wider">{key.replace(/_/g, " ")}</label>
                        {TEXTAREA_KEYS.has(key) ? (
                          <textarea
                            value={settingsForm[key] ?? ""}
                            onChange={(e) => setSettingsForm((p) => ({ ...p, [key]: e.target.value }))}
                            rows={3}
                            className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
                            data-testid={`settings-input-${key}`}
                          />
                        ) : (
                          <input
                            type="text"
                            value={settingsForm[key] ?? ""}
                            onChange={(e) => setSettingsForm((p) => ({ ...p, [key]: e.target.value }))}
                            className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                            data-testid={`settings-input-${key}`}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={saveSettings}
                disabled={savingSettings}
                className="flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white px-6 py-3 rounded-xl font-bold transition-all disabled:opacity-60"
                data-testid="save-site-settings-btn-bottom"
              >
                <Check className="w-4 h-4" />
                {savingSettings ? "Saving..." : "Save All Changes"}
              </button>
            </div>

            {/* Testimonials Editor */}
            <div className="mt-8 bg-slate-800 rounded-2xl border border-slate-700 p-5" data-testid="testimonials-editor">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-white font-black text-base flex items-center gap-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400" /> Customer Testimonials (auto-sliding carousel)
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Add as many real customer testimonials as you want — they auto-loop on the homepage.</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={addTestimonial}
                    className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-xl font-bold text-sm transition-all"
                    data-testid="add-testimonial-btn"
                  >
                    <Plus className="w-4 h-4" /> Add Testimonial
                  </button>
                  <button
                    onClick={saveTestimonials}
                    disabled={savingTestimonials}
                    className="flex items-center gap-1.5 bg-sky-500 hover:bg-sky-600 text-white px-4 py-2 rounded-xl font-bold text-sm transition-all disabled:opacity-60"
                    data-testid="save-testimonials-btn"
                  >
                    <Check className="w-4 h-4" /> {savingTestimonials ? "Saving..." : "Save Testimonials"}
                  </button>
                </div>
              </div>
              {testimonialsSavedAt && (
                <div className="bg-green-500/20 border border-green-500/40 text-green-300 rounded-xl px-4 py-2.5 mb-4 text-sm flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" /> Saved — carousel updated on the homepage!
                </div>
              )}

              {testimonials.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm">No testimonials yet. Click "Add Testimonial" to add one.</div>
              ) : (
                <div className="space-y-3">
                  {testimonials.map((t, i) => (
                    <div key={i} className="bg-slate-900 rounded-2xl p-4 border border-slate-700" data-testid={`testimonial-row-${i}`}>
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
                        <div className="md:col-span-3">
                          <label className="text-[10px] text-slate-400 font-bold uppercase">Name *</label>
                          <input value={t.name} onChange={(e) => updateTestimonial(i, "name", e.target.value)}
                            placeholder="Ayesha K."
                            className="w-full mt-0.5 bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-1.5 text-sm" />
                        </div>
                        <div className="md:col-span-2">
                          <label className="text-[10px] text-slate-400 font-bold uppercase">City</label>
                          <input value={t.city} onChange={(e) => updateTestimonial(i, "city", e.target.value)}
                            placeholder="Karachi"
                            className="w-full mt-0.5 bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-1.5 text-sm" />
                        </div>
                        <div className="md:col-span-2">
                          <label className="text-[10px] text-slate-400 font-bold uppercase">Date</label>
                          <input type="date" value={t.date || ""} onChange={(e) => updateTestimonial(i, "date", e.target.value)}
                            className="w-full mt-0.5 bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-1.5 text-sm" />
                        </div>
                        <div className="md:col-span-1">
                          <label className="text-[10px] text-slate-400 font-bold uppercase">Stars</label>
                          <select value={t.rating || 5} onChange={(e) => updateTestimonial(i, "rating", e.target.value)}
                            className="w-full mt-0.5 bg-slate-800 border border-slate-700 text-white rounded-lg px-2 py-1.5 text-sm">
                            {[5,4,3,2,1].map(n => <option key={n} value={n}>{n}★</option>)}
                          </select>
                        </div>
                        <div className="md:col-span-3">
                          <label className="text-[10px] text-slate-400 font-bold uppercase">Avatar URL</label>
                          <input value={t.avatar || ""} onChange={(e) => updateTestimonial(i, "avatar", e.target.value)}
                            placeholder="https://..."
                            className="w-full mt-0.5 bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-1.5 text-xs font-mono" />
                        </div>
                        <div className="md:col-span-1 flex md:items-end md:h-full">
                          <button onClick={() => removeTestimonial(i)}
                            className="w-full md:w-auto bg-red-600/30 hover:bg-red-600 text-red-300 hover:text-white rounded-lg p-2 flex items-center justify-center"
                            data-testid={`remove-testimonial-${i}`}>
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="md:col-span-12">
                          <label className="text-[10px] text-slate-400 font-bold uppercase">Quote *</label>
                          <textarea value={t.quote} onChange={(e) => updateTestimonial(i, "quote", e.target.value)}
                            placeholder="What did the customer say?"
                            rows={2}
                            className="w-full mt-0.5 bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-1.5 text-sm resize-none" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Product Form Modal */}
      {showProductForm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 overflow-y-auto" data-testid="product-form-modal">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 w-full max-w-2xl my-4">
            <div className="flex items-center justify-between p-5 border-b border-slate-700">
              <h3 className="text-lg font-black text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>
                {editingProduct ? "Edit Product" : "Add New Product"}
              </h3>
              <button onClick={() => setShowProductForm(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={saveProduct} className="p-5 space-y-4 overflow-y-auto max-h-[70vh]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold text-slate-300 mb-1">Product Name *</label>
                  <input required value={productForm.name} onChange={e => setProductForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. Neck Fan Pro 360°"
                    className="w-full bg-slate-700 border border-slate-600 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                    data-testid="product-name-input" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold text-slate-300 mb-1">Description *</label>
                  <textarea required value={productForm.description} onChange={e => setProductForm(p => ({ ...p, description: e.target.value }))}
                    rows={3} placeholder="Product description..."
                    className="w-full bg-slate-700 border border-slate-600 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
                    data-testid="product-desc-input" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-1">Original Price (PKR) *</label>
                  <input required type="number" value={productForm.price} onChange={e => setProductForm(p => ({ ...p, price: e.target.value }))}
                    placeholder="4999"
                    className="w-full bg-slate-700 border border-slate-600 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                    data-testid="product-price-input" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-1">Discounted Price (PKR) *</label>
                  <input required type="number" value={productForm.discounted_price} onChange={e => setProductForm(p => ({ ...p, discounted_price: e.target.value }))}
                    placeholder="2499"
                    className="w-full bg-slate-700 border border-slate-600 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                    data-testid="product-disc-price-input" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-1">Category</label>
                  <select value={productForm.category} onChange={e => setProductForm(p => ({ ...p, category: e.target.value }))}
                    className="w-full bg-slate-700 border border-slate-600 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                    data-testid="product-category-input">
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-1">Stock</label>
                  <input type="number" value={productForm.stock} onChange={e => setProductForm(p => ({ ...p, stock: e.target.value }))}
                    placeholder="100"
                    className="w-full bg-slate-700 border border-slate-600 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
                </div>
                <div className="sm:col-span-2">
                  <MediaUploader
                    label="Product Images"
                    accept="image/*"
                    multiple={true}
                    value={productForm.images}
                    onChange={imgs => setProductForm(p => ({ ...p, images: imgs }))}
                    testId="product-images-uploader"
                    hint="PNG, JPG, WEBP — max 10 MB each"
                  />
                </div>
                <div className="sm:col-span-2">
                  <MediaUploader
                    label="Product Video (optional)"
                    accept="video/*"
                    multiple={false}
                    value={productForm.video_url ? [productForm.video_url] : []}
                    onChange={urls => setProductForm(p => ({ ...p, video_url: urls[urls.length - 1] || "" }))}
                    testId="product-video-uploader"
                    hint="MP4, MOV — max 50 MB. Or paste a YouTube embed URL."
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold text-slate-300 mb-1">Colors (comma separated)</label>
                  <input value={productForm.colors} onChange={e => setProductForm(p => ({ ...p, colors: e.target.value }))}
                    placeholder="White, Black, Pink, Blue"
                    className="w-full bg-slate-700 border border-slate-600 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                    data-testid="product-colors-input" />
                </div>
                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-semibold text-slate-300">Color Variants (with image URL)</label>
                    <button type="button" onClick={addColorVariant}
                      className="text-xs bg-sky-600 hover:bg-sky-700 text-white px-3 py-1 rounded-lg font-bold"
                      data-testid="add-color-variant-btn">+ Add Variant</button>
                  </div>
                  <p className="text-xs text-slate-400 mb-2">When a customer selects a color, the main image switches to its assigned image URL.</p>
                  {productForm.color_variants?.length > 0 && (
                    <div className="space-y-2">
                      {productForm.color_variants.map((cv, i) => (
                        <div key={i} className="grid grid-cols-12 gap-2 items-center bg-slate-900 p-2 rounded-xl" data-testid={`color-variant-row-${i}`}>
                          <input value={cv.name} onChange={e => updateColorVariant(i, "name", e.target.value)}
                            placeholder="Color name (e.g. Pink)" className="col-span-3 bg-slate-800 border border-slate-700 text-white rounded-lg px-2 py-1.5 text-xs" />
                          <input value={cv.hex || ""} onChange={e => updateColorVariant(i, "hex", e.target.value)}
                            placeholder="#FBA4C0" className="col-span-2 bg-slate-800 border border-slate-700 text-white rounded-lg px-2 py-1.5 text-xs font-mono" />
                          <div className="col-span-1 w-6 h-6 rounded-full border border-slate-600" style={{ backgroundColor: cv.hex || "#cbd5e1" }} />
                          <div className="col-span-5 flex gap-1">
                            <input value={cv.image_url || ""} onChange={e => updateColorVariant(i, "image_url", e.target.value)}
                              placeholder="https://... or upload below"
                              className="flex-1 bg-slate-800 border border-slate-700 text-white rounded-lg px-2 py-1.5 text-xs" />
                            <label className="cursor-pointer bg-sky-600/30 hover:bg-sky-600 text-sky-300 hover:text-white rounded-lg p-1.5 flex items-center" title="Browse image">
                              <ImagePlus className="w-3.5 h-3.5" />
                              <input type="file" accept="image/*" className="hidden" onChange={async e => {
                                const file = e.target.files?.[0]; if (!file) return;
                                const fd = new FormData(); fd.append("file", file);
                                try {
                                  const res = await axios.post(`${API}/admin/upload-media`, fd, { headers: { ...getConfig().headers, "Content-Type": "multipart/form-data" } });
                                  updateColorVariant(i, "image_url", res.data.url);
                                } catch (err) { alert("Upload failed: " + (err.response?.data?.detail || err.message)); }
                              }} />
                            </label>
                          </div>
                          <button type="button" onClick={() => removeColorVariant(i)}
                            className="col-span-1 bg-red-600/30 hover:bg-red-600 text-red-300 hover:text-white rounded-lg p-1.5 flex items-center justify-center"
                            aria-label="Remove">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-1">Sizes (comma separated)</label>
                  <input value={productForm.sizes} onChange={e => setProductForm(p => ({ ...p, sizes: e.target.value }))}
                    placeholder="Small, Medium, Large (leave empty if N/A)"
                    className="w-full bg-slate-700 border border-slate-600 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-1">Battery Life</label>
                  <input value={productForm.battery_life} onChange={e => setProductForm(p => ({ ...p, battery_life: e.target.value }))}
                    placeholder="8-10 hours"
                    className="w-full bg-slate-700 border border-slate-600 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-1">Features (comma separated)</label>
                  <input value={productForm.features} onChange={e => setProductForm(p => ({ ...p, features: e.target.value }))}
                    placeholder="Bladeless, 3 Speeds, USB-C"
                    className="w-full bg-slate-700 border border-slate-600 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
                </div>
                <div className="sm:col-span-2 flex items-center gap-3">
                  <input type="checkbox" id="is_active" checked={productForm.is_active} onChange={e => setProductForm(p => ({ ...p, is_active: e.target.checked }))}
                    className="w-4 h-4 rounded" data-testid="product-active-input" />
                  <label htmlFor="is_active" className="text-sm font-semibold text-slate-300">Active (visible on website)</label>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={savingProduct}
                  className="flex-1 bg-sky-500 hover:bg-sky-600 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-70"
                  data-testid="save-product-btn">
                  {savingProduct ? "Saving..." : editingProduct ? "Update Product" : "Add Product"}
                </button>
                <button type="button" onClick={() => setShowProductForm(false)}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold py-3 rounded-xl transition-all">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review Form Modal */}
      {showReviewForm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" data-testid="review-form-modal">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 w-full max-w-lg">
            <div className="flex items-center justify-between p-5 border-b border-slate-700">
              <h3 className="text-lg font-black text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>
                {editingReview ? "Edit Review" : "Add Review"}
              </h3>
              <button onClick={() => setShowReviewForm(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={saveReview} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-1">Product *</label>
                <select required value={reviewForm.product_id} onChange={e => setReviewForm(p => ({ ...p, product_id: e.target.value }))}
                  className="w-full bg-slate-700 border border-slate-600 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                  data-testid="review-product-select">
                  <option value="">Select Product</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-1">Reviewer Name *</label>
                <input required value={reviewForm.reviewer_name} onChange={e => setReviewForm(p => ({ ...p, reviewer_name: e.target.value }))}
                  placeholder="Muhammad Ali"
                  className="w-full bg-slate-700 border border-slate-600 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                  data-testid="review-reviewer-input" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Rating *</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(s => (
                    <button key={s} type="button" onClick={() => setReviewForm(p => ({ ...p, rating: s }))}
                      className={`w-9 h-9 rounded-full font-bold text-sm transition-all ${reviewForm.rating >= s ? "bg-amber-500 text-white" : "bg-slate-700 text-slate-400"}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-1">Comment *</label>
                <textarea required value={reviewForm.comment} onChange={e => setReviewForm(p => ({ ...p, comment: e.target.value }))}
                  rows={3} placeholder="Review comment..."
                  className="w-full bg-slate-700 border border-slate-600 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
                  data-testid="review-comment-input" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-1">Review Images (upload, max 3)</label>
                <div className="flex gap-2 flex-wrap mb-2">
                  {(reviewForm.images || []).map((img, i) => (
                    <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-600">
                      <img src={img} alt="" className="w-full h-full object-cover" />
                      <button type="button"
                        onClick={() => setReviewForm(p => ({ ...p, images: p.images.filter((_, idx) => idx !== i) }))}
                        className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {(reviewForm.images?.length || 0) < 3 && (
                    <label className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-600 flex items-center justify-center text-slate-400 hover:bg-slate-700 cursor-pointer transition-colors" data-testid="admin-review-image-upload">
                      <Plus className="w-4 h-4" />
                      <input type="file" accept="image/*" multiple className="hidden" onChange={handleReviewImageUpload} />
                    </label>
                  )}
                </div>
                <p className="text-xs text-slate-400">Upload up to 3 images (max 1.5MB each). Stored as base64.</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-1">Review Date & Time (optional override)</label>
                <input
                  type="datetime-local"
                  value={reviewForm.created_at || ""}
                  onChange={(e) => setReviewForm((p) => ({ ...p, created_at: e.target.value }))}
                  className="w-full bg-slate-700 border border-slate-600 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                  data-testid="admin-review-date"
                />
                <p className="text-xs text-slate-400 mt-1">Leave empty to use current time. Set a past date to backdate fake/seeded reviews.</p>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm text-slate-300">
                  <input type="checkbox" checked={reviewForm.verified_purchase} onChange={e => setReviewForm(p => ({ ...p, verified_purchase: e.target.checked }))} className="w-4 h-4" />
                  Verified Purchase
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-300">
                  <input type="checkbox" checked={reviewForm.is_approved} onChange={e => setReviewForm(p => ({ ...p, is_approved: e.target.checked }))} className="w-4 h-4" />
                  Approved
                </label>
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={savingReview}
                  className="flex-1 bg-sky-500 hover:bg-sky-600 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-70"
                  data-testid="save-review-btn">
                  {savingReview ? "Saving..." : editingReview ? "Update" : "Add Review"}
                </button>
                <button type="button" onClick={() => setShowReviewForm(false)}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold py-3 rounded-xl transition-all">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
