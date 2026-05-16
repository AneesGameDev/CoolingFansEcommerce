import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { ArrowLeft, ShoppingBag, Star, CheckCircle, Battery, Zap, Wind } from "lucide-react";
import Header from "../components/Header";
import StarRating from "../components/StarRating";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [reviewForm, setReviewForm] = useState({ reviewer_name: "", rating: 5, comment: "" });
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
      if (pRes.data.colors?.length > 0) setSelectedColor(pRes.data.colors[0]);
      if (pRes.data.sizes?.length > 0) setSelectedSize(pRes.data.sizes[0]);
    }).catch(() => navigate("/")).finally(() => setLoading(false));
  }, [id, navigate]);

  const discountPct = product ? Math.round(((product.price - product.discounted_price) / product.price) * 100) : 0;
  const avgRating = reviews.length > 0 ? (reviews.reduce((a, r) => a + r.rating, 0) / reviews.length).toFixed(1) : "5.0";

  const handleOrderNow = () => {
    navigate("/checkout", { state: { product, selectedColor, selectedSize, quantity } });
  };

  const submitReview = async (e) => {
    e.preventDefault();
    if (!reviewForm.reviewer_name || !reviewForm.comment) return;
    setSubmittingReview(true);
    try {
      const res = await axios.post(`${API}/reviews`, { ...reviewForm, product_id: id });
      setReviews(prev => [res.data, ...prev]);
      setReviewForm({ reviewer_name: "", rating: 5, comment: "" });
      setReviewSuccess(true);
      setTimeout(() => setReviewSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingReview(false);
    }
  };

  const colorMap = {
    "White": "#F8FAFC", "Black": "#1E293B", "Pink": "#FBA4C0", "Blue": "#60A5FA",
    "Sky Blue": "#38BDF8", "Gold": "#F59E0B", "Silver": "#CBD5E1", "Gray": "#94A3B8",
    "Yellow": "#FDE047", "Green": "#4ADE80", "Red": "#F87171"
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

  return (
    <div className="min-h-screen bg-[#F0F9FF]">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-slate-500 hover:text-sky-500 mb-6 transition-colors group"
          data-testid="back-btn"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Products
        </button>

        {/* Product Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Images */}
          <div>
            <div className="relative bg-white rounded-2xl overflow-hidden border border-sky-100 aspect-square mb-3 shadow-sm" data-testid="product-image-main">
              <img
                src={product.images?.[selectedImage] || "https://images.unsplash.com/photo-1618941716939-553df3c6c278?w=600"}
                alt={product.name}
                className="w-full h-full object-cover"
                onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1618941716939-553df3c6c278?w=600"; }}
              />
              {discountPct > 0 && (
                <div className="absolute top-3 left-3 bg-amber-500 text-white font-black text-sm px-3 py-1.5 rounded-full">
                  -{discountPct}% OFF
                </div>
              )}
            </div>
            {/* Thumbnails */}
            {product.images?.length > 1 && (
              <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                {product.images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(i)}
                    className={`flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${selectedImage === i ? "border-sky-500 shadow-md" : "border-slate-200"}`}
                    data-testid={`thumbnail-${i}`}
                  >
                    <img src={img} alt={`View ${i + 1}`} className="w-full h-full object-cover" onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1618941716939-553df3c6c278?w=100"; }} />
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

            {/* Rating */}
            <div className="flex items-center gap-2 mb-4">
              <StarRating rating={Math.round(parseFloat(avgRating))} size="md" />
              <span className="text-sm font-semibold text-slate-700">{avgRating}</span>
              <span className="text-sm text-slate-400">({reviews.length} reviews)</span>
            </div>

            {/* Price */}
            <div className="bg-white rounded-2xl p-4 border border-sky-100 mb-4">
              <div className="flex items-end gap-3">
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
            {product.colors?.length > 0 && (
              <div className="mb-4" data-testid="color-selector">
                <p className="text-sm font-semibold text-slate-700 mb-2">
                  Color: <span className="text-sky-600">{selectedColor}</span>
                </p>
                <div className="flex gap-2 flex-wrap">
                  {product.colors.map(color => (
                    <button
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      className={`color-swatch ${selectedColor === color ? "selected" : ""}`}
                      style={{ backgroundColor: colorMap[color] || "#CBD5E1", border: `2px solid ${selectedColor === color ? "#0EA5E9" : "#E2E8F0"}` }}
                      title={color}
                      data-testid={`color-${color.toLowerCase().replace(" ", "-")}`}
                    />
                  ))}
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
                  {product.sizes.map(size => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`px-4 py-2 rounded-xl border-2 text-sm font-semibold transition-all ${selectedSize === size ? "border-sky-500 bg-sky-50 text-sky-700" : "border-slate-200 text-slate-700 hover:border-sky-300"}`}
                      data-testid={`size-${size.toLowerCase().replace(" ", "-")}`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity */}
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

            {/* Order Button */}
            <button
              onClick={handleOrderNow}
              className="w-full bg-sky-500 hover:bg-sky-600 text-white font-bold py-4 rounded-2xl text-lg transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl mb-3"
              data-testid="order-now-btn"
            >
              <ShoppingBag className="w-5 h-5" />
              Order Now — Rs. {(product.discounted_price * quantity).toLocaleString()}
            </button>

            <div className="flex items-center justify-center gap-2 text-sm text-green-600 font-semibold">
              <CheckCircle className="w-4 h-4" />
              Cash on Delivery Available
            </div>

            {/* Features */}
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

            {/* Battery */}
            {product.battery_life && (
              <div className="mt-3 flex items-center gap-2 bg-green-50 rounded-xl p-3 border border-green-100">
                <Battery className="w-4 h-4 text-green-500" />
                <span className="text-sm font-semibold text-green-700">Battery Life: {product.battery_life}</span>
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        <div className="bg-white rounded-2xl p-6 border border-sky-100 mb-8" data-testid="product-description">
          <h2 className="text-xl font-black text-slate-900 mb-3" style={{ fontFamily: 'Outfit, sans-serif' }}>Description</h2>
          <p className="text-slate-600 leading-relaxed">{product.description}</p>
        </div>

        {/* Reviews Section */}
        <div id="reviews" data-testid="reviews-section">
          <h2 className="text-2xl font-black text-slate-900 mb-6" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Customer Reviews ({reviews.length})
          </h2>

          {/* Review Summary */}
          {reviews.length > 0 && (
            <div className="bg-white rounded-2xl p-5 border border-sky-100 mb-6 flex flex-col sm:flex-row items-center gap-6">
              <div className="text-center">
                <div className="text-5xl font-black text-slate-900">{avgRating}</div>
                <StarRating rating={Math.round(parseFloat(avgRating))} size="md" />
                <p className="text-sm text-slate-500 mt-1">Based on {reviews.length} reviews</p>
              </div>
              <div className="flex-1 w-full">
                {[5, 4, 3, 2, 1].map(star => {
                  const count = reviews.filter(r => r.rating === star).length;
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

          {/* Review Cards */}
          <div className="space-y-4 mb-8">
            {reviews.map(review => (
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
                <p className="text-slate-600 text-sm leading-relaxed">{review.comment}</p>
                {review.images?.length > 0 && (
                  <div className="flex gap-2 mt-3">
                    {review.images.map((img, i) => (
                      <img key={i} src={img} alt="Review" className="w-16 h-16 rounded-xl object-cover border border-sky-100" />
                    ))}
                  </div>
                )}
                <p className="text-xs text-slate-400 mt-2">{new Date(review.created_at).toLocaleDateString()}</p>
              </div>
            ))}
            {reviews.length === 0 && (
              <div className="text-center py-8 text-slate-500">
                <Star className="w-10 h-10 mx-auto text-slate-200 mb-2" />
                <p>No reviews yet. Be the first to review!</p>
              </div>
            )}
          </div>

          {/* Write Review Form */}
          <div className="bg-white rounded-2xl p-6 border border-sky-100" data-testid="review-form">
            <h3 className="text-xl font-black text-slate-900 mb-4" style={{ fontFamily: 'Outfit, sans-serif' }}>Write a Review</h3>
            {reviewSuccess && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-4 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Review submitted successfully! Thank you.
              </div>
            )}
            <form onSubmit={submitReview} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Your Name *</label>
                <input
                  type="text"
                  value={reviewForm.reviewer_name}
                  onChange={e => setReviewForm(p => ({ ...p, reviewer_name: e.target.value }))}
                  placeholder="Enter your name"
                  required
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 bg-slate-50"
                  data-testid="review-name-input"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Your Rating *</label>
                <StarRating rating={reviewForm.rating} size="lg" interactive onRate={(r) => setReviewForm(p => ({ ...p, rating: r }))} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Your Review *</label>
                <textarea
                  value={reviewForm.comment}
                  onChange={e => setReviewForm(p => ({ ...p, comment: e.target.value }))}
                  placeholder="Share your experience with this product..."
                  required
                  rows={3}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 bg-slate-50 resize-none"
                  data-testid="review-comment-input"
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
          </div>
        </div>
      </div>
    </div>
  );
}
