import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { ArrowLeft, ShoppingBag, Star, CheckCircle, Battery, Zap, Wind, X, Camera, Play, ShoppingCart, ShieldCheck, Truck, RotateCcw } from "lucide-react";
import Header from "../components/Header";
import StarRating from "../components/StarRating";
import ImageLightbox from "../components/ImageLightbox";
import { useAuth } from "../contexts/AuthContext";
import { useCart } from "../contexts/CartContext";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const MAX_IMG_BYTES = 1.5 * 1024 * 1024; // 1.5MB cap per image

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, login } = useAuth();
  const { addItem } = useCart();
  const fileInputRef = useRef(null);

  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showVideo, setShowVideo] = useState(false);

  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: "", images: [] });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      axios.get(`${API}/products/${id}`),
      axios.get(`${API}/reviews/${id}`)
    ]).then(([pRes, rRes]) => {
      setProduct(pRes.data);
      setReviews(rRes.data);
      const variants = pRes.data.color_variants || [];
      if (variants.length > 0) setSelectedColor(variants[0].name);
      else if (pRes.data.colors?.length > 0) setSelectedColor(pRes.data.colors[0]);
      if (pRes.data.sizes?.length > 0) setSelectedSize(pRes.data.sizes[0]);
    }).catch(() => navigate("/")).finally(() => setLoading(false));
  }, [id, navigate]);

  // Color variant image switching
  useEffect(() => {
    if (!product || !selectedColor) return;
    const variant = (product.color_variants || []).find((v) => v.name === selectedColor);
    if (variant?.image_url) {
      const idx = (product.images || []).findIndex((u) => u === variant.image_url);
      if (idx >= 0) setSelectedImage(idx);
      // else we just keep selected; main image area falls back to product.images
    }
  }, [selectedColor, product]);

  const discountPct = product ? Math.round(((product.price - product.discounted_price) / product.price) * 100) : 0;
  const avgRating = reviews.length > 0 ? (reviews.reduce((a, r) => a + r.rating, 0) / reviews.length).toFixed(1) : "5.0";

  const colorMap = {
    "White": "#F8FAFC", "Black": "#1E293B", "Pink": "#FBA4C0", "Blue": "#60A5FA",
    "Sky Blue": "#38BDF8", "Gold": "#F59E0B", "Silver": "#CBD5E1", "Gray": "#94A3B8",
    "Yellow": "#FDE047", "Green": "#4ADE80", "Red": "#F87171"
  };

  const handleAddToCart = () => {
    if (!product) return;
    const variant = (product.color_variants || []).find((v) => v.name === selectedColor);
    const image = variant?.image_url || product.images?.[selectedImage] || product.images?.[0];
    addItem(product, { color: selectedColor || null, size: selectedSize || null, quantity, image });
    toast.success("Added to cart", { description: product.name });
  };

  const handleOrderNow = () => {
    if (!product) return;
    const variant = (product.color_variants || []).find((v) => v.name === selectedColor);
    const image = variant?.image_url || product.images?.[selectedImage] || product.images?.[0];
    addItem(product, { color: selectedColor || null, size: selectedSize || null, quantity, image });
    navigate("/checkout");
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (reviewForm.images.length + files.length > 3) {
      toast.error("Max 3 review images allowed");
      return;
    }
    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        toast.error("Only image files are allowed");
        continue;
      }
      if (file.size > MAX_IMG_BYTES) {
        toast.error(`${file.name} is too large (max 1.5MB)`);
        continue;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        setReviewForm((p) => p.images.length >= 3 ? p : { ...p, images: [...p.images, ev.target.result] });
      };
      reader.readAsDataURL(file);
    }
    e.target.value = "";
  };

  const removeReviewImage = (idx) => {
    setReviewForm((p) => ({ ...p, images: p.images.filter((_, i) => i !== idx) }));
  };

  const submitReview = async (e) => {
    e.preventDefault();
    if (!user) { login(); return; }
    if (!reviewForm.comment.trim()) {
      toast.error("Please write a comment");
      return;
    }
    setSubmittingReview(true);
    try {
      const res = await axios.post(
        `${API}/reviews`,
        { product_id: id, rating: reviewForm.rating, comment: reviewForm.comment, images: reviewForm.images },
        { withCredentials: true }
      );
      setReviews((prev) => [res.data, ...prev]);
      setReviewForm({ rating: 5, comment: "", images: [] });
      setReviewSuccess(true);
      toast.success("Review submitted!");
      setTimeout(() => setReviewSuccess(false), 3000);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to submit review");
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F0F9FF]">
        <Header />
        <div className="max-w-7xl mx-auto px-4 py-12 animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="aspect-square bg-slate-200 rounded-2xl" />
            <div className="space-y-4">
              <div className="h-8 bg-slate-200 rounded w-3/4" />
              <div className="h-6 bg-slate-200 rounded w-1/2" />
              <div className="h-12 bg-slate-200 rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) return null;

  const colorVariants = product.color_variants || [];
  const colorList = colorVariants.length > 0 ? colorVariants.map((v) => v.name) : (product.colors || []);

  return (
    <div className="min-h-screen bg-[#F0F9FF]">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-slate-500 hover:text-sky-500 mb-6 transition-colors group"
          data-testid="back-btn"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Products
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Images / Video */}
          <div>
            <div className="relative bg-white rounded-2xl overflow-hidden border border-sky-100 aspect-square mb-3 shadow-sm" data-testid="product-image-main">
              {showVideo && product.video_url ? (
                <div className="w-full h-full bg-black flex items-center justify-center">
                  <video src={product.video_url} controls autoPlay className="w-full h-full object-contain" data-testid="product-video" />
                  <button
                    onClick={() => setShowVideo(false)}
                    className="absolute top-3 right-3 w-9 h-9 bg-white/90 rounded-full flex items-center justify-center shadow-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <img
                  src={product.images?.[selectedImage] || "https://images.unsplash.com/photo-1618941716939-553df3c6c278?w=600"}
                  alt={product.name}
                  className="w-full h-full object-cover"
                  onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1618941716939-553df3c6c278?w=600"; }}
                />
              )}
              {discountPct > 0 && !showVideo && (
                <div className="absolute top-3 left-3 bg-amber-500 text-white font-black text-sm px-3 py-1.5 rounded-full">
                  -{discountPct}% OFF
                </div>
              )}
              {product.video_url && !showVideo && (
                <button
                  onClick={() => setShowVideo(true)}
                  className="absolute bottom-3 right-3 bg-white/95 hover:bg-white text-sky-700 font-bold px-4 py-2 rounded-full text-sm flex items-center gap-1.5 shadow-lg active:scale-95 transition-all"
                  data-testid="play-video-btn"
                >
                  <Play className="w-4 h-4 fill-current" /> Watch Video
                </button>
              )}
            </div>
            {product.images?.length > 1 && (
              <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                {product.images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => { setShowVideo(false); setSelectedImage(i); }}
                    className={`flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${selectedImage === i && !showVideo ? "border-sky-500 shadow-md" : "border-slate-200"}`}
                    data-testid={`thumbnail-${i}`}
                  >
                    <img src={img} alt={`View ${i + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="flex flex-col">
            <div className="bg-sky-50 text-sky-700 text-xs font-bold px-3 py-1 rounded-full w-fit mb-3 uppercase tracking-wider">
              {product.category?.replace("-", " ")}
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mb-3" style={{ fontFamily: 'Outfit, sans-serif' }} data-testid="product-name">
              {product.name}
            </h1>

            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <StarRating rating={Math.round(parseFloat(avgRating))} size="md" />
              <span className="text-sm font-semibold text-slate-700">{avgRating}</span>
              <span className="text-sm text-slate-400">({reviews.length} reviews)</span>
              {product.total_sold > 0 && (
                <span className="ml-2 text-xs bg-green-50 text-green-700 font-bold px-2 py-1 rounded-full border border-green-100" data-testid="product-sold-count">
                  🔥 {product.total_sold}+ sold
                </span>
              )}
            </div>

            <div className="bg-white rounded-2xl p-4 border border-sky-100 mb-4">
              <div className="flex items-end gap-3 flex-wrap">
                <span className="text-3xl font-black text-sky-600" data-testid="product-price">
                  Rs. {product.discounted_price.toLocaleString()}
                </span>
                <span className="text-lg text-slate-400 line-through mb-0.5">
                  Rs. {product.price.toLocaleString()}
                </span>
                <span className="bg-amber-100 text-amber-700 font-black text-sm px-2.5 py-1 rounded-full mb-0.5">
                  Save {discountPct}%
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">Inclusive of all taxes • Cash on Delivery</p>
            </div>

            {/* Color Selector */}
            {colorList.length > 0 && (
              <div className="mb-4" data-testid="color-selector">
                <p className="text-sm font-semibold text-slate-700 mb-2">
                  Color: <span className="text-sky-600">{selectedColor}</span>
                </p>
                <div className="flex gap-2 flex-wrap">
                  {colorList.map((color) => {
                    const variant = colorVariants.find((v) => v.name === color);
                    const bg = variant?.hex || colorMap[color] || "#CBD5E1";
                    return (
                      <button
                        key={color}
                        onClick={() => setSelectedColor(color)}
                        className={`w-9 h-9 rounded-full transition-all active:scale-95 ${selectedColor === color ? "ring-2 ring-sky-500 ring-offset-2 scale-110" : "ring-1 ring-slate-200"}`}
                        style={{ backgroundColor: bg }}
                        title={color}
                        data-testid={`color-${color.toLowerCase().replace(/\s+/g, "-")}`}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Size Selector */}
            {product.sizes?.length > 0 && (
              <div className="mb-4" data-testid="size-selector">
                <p className="text-sm font-semibold text-slate-700 mb-2">
                  Size: <span className="text-sky-600">{selectedSize}</span>
                </p>
                <div className="flex gap-2 flex-wrap">
                  {product.sizes.map((size) => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`px-4 py-2 rounded-xl border-2 text-sm font-semibold transition-all ${selectedSize === size ? "border-sky-500 bg-sky-50 text-sky-700" : "border-slate-200 text-slate-700 hover:border-sky-300"}`}
                      data-testid={`size-${size.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mb-5">
              <p className="text-sm font-semibold text-slate-700 mb-2">Quantity</p>
              <div className="flex items-center gap-3" data-testid="quantity-selector">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-9 h-9 rounded-full border-2 border-slate-200 flex items-center justify-center text-slate-600 hover:border-sky-400 hover:text-sky-500 font-bold transition-colors"
                  data-testid="qty-decrease"
                >-</button>
                <span className="text-lg font-bold text-slate-900 w-8 text-center" data-testid="qty-value">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-9 h-9 rounded-full border-2 border-slate-200 flex items-center justify-center text-slate-600 hover:border-sky-400 hover:text-sky-500 font-bold transition-colors"
                  data-testid="qty-increase"
                >+</button>
              </div>
            </div>

            <div className="flex gap-3 mb-3">
              <button
                onClick={handleAddToCart}
                className="flex-1 bg-amber-400 hover:bg-amber-500 text-slate-900 font-bold py-4 rounded-2xl text-base transition-all active:scale-95 flex items-center justify-center gap-2 shadow"
                data-testid="add-to-cart-btn"
              >
                <ShoppingCart className="w-5 h-5" />
                Add to Cart
              </button>
              <button
                onClick={handleOrderNow}
                className="flex-1 bg-sky-500 hover:bg-sky-600 text-white font-bold py-4 rounded-2xl text-base transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg"
                data-testid="order-now-btn"
              >
                <ShoppingBag className="w-5 h-5" />
                Order Now
              </button>
            </div>

            {/* Trust strip */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="bg-white border border-sky-100 rounded-xl p-2 text-center">
                <Truck className="w-4 h-4 mx-auto text-sky-500 mb-1" />
                <p className="text-[10px] font-bold text-slate-700">1-2 Day Delivery</p>
              </div>
              <div className="bg-white border border-sky-100 rounded-xl p-2 text-center">
                <ShieldCheck className="w-4 h-4 mx-auto text-green-500 mb-1" />
                <p className="text-[10px] font-bold text-slate-700">7-Day Warranty</p>
              </div>
              <div className="bg-white border border-sky-100 rounded-xl p-2 text-center">
                <RotateCcw className="w-4 h-4 mx-auto text-amber-500 mb-1" />
                <p className="text-[10px] font-bold text-slate-700">Easy Returns</p>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 text-sm text-green-600 font-semibold">
              <CheckCircle className="w-4 h-4" />
              Cash on Delivery Available
            </div>

            {product.features?.length > 0 && (
              <div className="mt-5 bg-white rounded-2xl p-4 border border-sky-100">
                <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-sky-500" />
                  Key Features
                </h3>
                <div className="grid grid-cols-1 gap-2">
                  {product.features.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-slate-600">
                      <div className="w-1.5 h-1.5 rounded-full bg-sky-400 flex-shrink-0" />
                      {f}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {product.battery_life && (
              <div className="mt-3 flex items-center gap-2 bg-green-50 rounded-xl p-3 border border-green-100">
                <Battery className="w-4 h-4 text-green-500" />
                <span className="text-sm font-semibold text-green-700">Battery Life: {product.battery_life}</span>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-sky-100 mb-8" data-testid="product-description">
          <h2 className="text-xl font-black text-slate-900 mb-3" style={{ fontFamily: 'Outfit, sans-serif' }}>Description</h2>
          <p className="text-slate-600 leading-relaxed">{product.description}</p>
        </div>

        {/* Reviews Section */}
        <div id="reviews" data-testid="reviews-section">
          <h2 className="text-2xl font-black text-slate-900 mb-6" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Customer Reviews ({reviews.length})
          </h2>

          {reviews.length > 0 && (
            <div className="bg-white rounded-2xl p-5 border border-sky-100 mb-6 flex flex-col sm:flex-row items-center gap-6">
              <div className="text-center">
                <div className="text-5xl font-black text-slate-900">{avgRating}</div>
                <StarRating rating={Math.round(parseFloat(avgRating))} size="md" />
                <p className="text-sm text-slate-500 mt-1">Based on {reviews.length} reviews</p>
              </div>
              <div className="flex-1 w-full">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = reviews.filter((r) => r.rating === star).length;
                  const pct = reviews.length ? (count / reviews.length) * 100 : 0;
                  return (
                    <div key={star} className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-slate-600 w-3">{star}</span>
                      <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                      <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div className="h-2 bg-amber-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-slate-400 w-6">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="space-y-4 mb-8">
            {reviews.map((review) => (
              <div key={review.id} className="bg-white rounded-2xl p-5 border border-sky-100" data-testid={`review-${review.id}`}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-bold text-slate-900">{review.reviewer_name}</p>
                    {review.verified_purchase && (
                      <span className="text-xs text-green-600 font-semibold flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Verified Purchase
                      </span>
                    )}
                  </div>
                  <StarRating rating={review.rating} size="sm" />
                </div>
                <p className="text-slate-600 text-sm leading-relaxed mb-3">{review.comment}</p>
                {review.images?.length > 0 && <ImageLightbox images={review.images} alt={`Review by ${review.reviewer_name}`} />}
                <p className="text-xs text-slate-400 mt-2">{review.created_at && new Date(review.created_at).toLocaleDateString()}</p>
              </div>
            ))}
            {reviews.length === 0 && (
              <div className="text-center py-8 text-slate-500">
                <Star className="w-10 h-10 mx-auto text-slate-200 mb-2" />
                <p>No reviews yet. Be the first to review!</p>
              </div>
            )}
          </div>

          {/* Write Review Form — Login gated */}
          <div className="bg-white rounded-2xl p-6 border border-sky-100" data-testid="review-form">
            <h3 className="text-xl font-black text-slate-900 mb-4" style={{ fontFamily: 'Outfit, sans-serif' }}>Write a Review</h3>

            {!user ? (
              <div className="text-center py-6 px-4 bg-sky-50 rounded-2xl border border-sky-100" data-testid="review-login-required">
                <p className="text-slate-700 font-semibold mb-1">Sign in to share your review</p>
                <p className="text-sm text-slate-500 mb-4">Only verified Google-signed in users can leave reviews.</p>
                <button
                  onClick={login}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-6 py-3 rounded-full transition-all inline-flex items-center gap-2"
                  data-testid="review-login-btn"
                >
                  Sign in with Google
                </button>
              </div>
            ) : (
              <>
                {reviewSuccess && (
                  <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-4 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Review submitted successfully! Thank you.
                  </div>
                )}
                <form onSubmit={submitReview} className="space-y-4">
                  <div className="flex items-center gap-3 bg-sky-50 rounded-xl p-3 border border-sky-100">
                    {user.picture && <img src={user.picture} alt={user.name} className="w-9 h-9 rounded-full" />}
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Posting as {user.name || user.email}</p>
                      <p className="text-xs text-slate-500">Your name & email are linked to this review</p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Your Rating *</label>
                    <StarRating rating={reviewForm.rating} size="lg" interactive onRate={(r) => setReviewForm((p) => ({ ...p, rating: r }))} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Your Review *</label>
                    <textarea
                      value={reviewForm.comment}
                      onChange={(e) => setReviewForm((p) => ({ ...p, comment: e.target.value }))}
                      placeholder="Share your experience with this product..."
                      required
                      rows={3}
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 bg-slate-50 resize-none"
                      data-testid="review-comment-input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Add Photos (Optional, max 3)</label>
                    <div className="flex gap-2 flex-wrap">
                      {reviewForm.images.map((img, i) => (
                        <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden border border-sky-200">
                          <img src={img} alt="" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => removeReviewImage(i)}
                            className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      {reviewForm.images.length < 3 && (
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="w-16 h-16 rounded-xl border-2 border-dashed border-sky-300 flex items-center justify-center text-sky-500 hover:bg-sky-50 transition-colors"
                          data-testid="review-image-upload-btn"
                        >
                          <Camera className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      className="hidden"
                      data-testid="review-image-input"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submittingReview}
                    className="bg-sky-500 hover:bg-sky-600 text-white font-bold px-6 py-2.5 rounded-xl transition-all active:scale-95 disabled:opacity-60"
                    data-testid="submit-review-btn"
                  >
                    {submittingReview ? "Submitting..." : "Submit Review"}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
