import { useNavigate } from "react-router-dom";
import { ShoppingBag, Plus, Flame, TrendingUp } from "lucide-react";
import StarRating from "./StarRating";
import { useCart } from "../contexts/CartContext";
import { toast } from "sonner";

const BACKEND = process.env.REACT_APP_BACKEND_URL || "";

// Resolve uploaded media URLs that start with /api/media/ to absolute backend URL
function resolveImg(url) {
  if (!url) return null;
  if (url.startsWith("/api/media/")) return `${BACKEND}${url}`;
  return url;
}

const FALLBACK = "https://images.unsplash.com/photo-1618941716939-553df3c6c278?w=400";

export default function ProductCard({ product, index = 0 }) {
  const navigate = useNavigate();
  const { addItem } = useCart();
  const discountPct = Math.round(((product.price - product.discounted_price) / product.price) * 100);
  const mainImage = resolveImg(product.images?.[0]) || FALLBACK;
  const soldOut = (product.stock ?? 1) <= 0;

  const handleQuickAdd = (e) => {
    e.stopPropagation();
    if (soldOut) { toast.error("Out of stock"); return; }
    addItem(product, { quantity: 1 });
    toast.success(`${product.name} added to cart`);
  };

  return (
    <div
      className="bg-white rounded-2xl border border-sky-100 overflow-hidden product-card-hover cursor-pointer flex flex-col h-full"
      style={{ animationDelay: `${index * 60}ms` }}
      onClick={() => navigate(`/product/${product.id}`)}
      data-testid={`product-card-${product.id}`}
    >
      {/* Image area */}
      <div className="relative aspect-square bg-slate-50 overflow-hidden">
        <img
          src={mainImage}
          alt={product.name}
          className={`w-full h-full object-cover transition-transform duration-500 hover:scale-105 ${soldOut ? "grayscale opacity-70" : ""}`}
          loading="lazy"
          onError={(e) => { e.target.src = FALLBACK; }}
        />

        {/* Discount badge */}
        {discountPct > 0 && !soldOut && (
          <div className="absolute top-2 left-2 bg-amber-500 text-white text-xs font-black px-2.5 py-1 rounded-full shadow" data-testid={`discount-badge-${product.id}`}>
            -{discountPct}%
          </div>
        )}

        {/* Sale ribbon */}
        {!soldOut && (
          <div className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
            Sale
          </div>
        )}

        {/* Sold Out overlay */}
        {soldOut && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-red-600 text-white font-black text-sm px-4 py-1.5 rounded-full -rotate-12 shadow-lg border-2 border-white" data-testid={`sold-out-badge-${product.id}`}>
              SOLD OUT
            </div>
          </div>
        )}

        {/* Sold count — always show if > 0, prominent bottom bar */}
        {!soldOut && product.total_sold > 0 && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-2.5 pt-4 pb-1.5 flex items-center gap-1.5"
            data-testid={`sold-badge-${product.id}`}>
            <Flame className="w-3 h-3 text-amber-400 flex-shrink-0" />
            <span className="text-white text-[11px] font-bold">
              {product.total_sold >= 1000
                ? `${(product.total_sold / 1000).toFixed(1)}k`
                : product.total_sold}+ sold
            </span>
            {product.total_sold >= 100 && (
              <span className="ml-auto text-amber-300 text-[10px] font-bold flex items-center gap-0.5">
                <TrendingUp className="w-2.5 h-2.5" /> Hot
              </span>
            )}
          </div>
        )}
      </div>

      {/* Info area */}
      <div className="p-3 sm:p-4 flex flex-col flex-1">
        <h3 className="font-bold text-slate-900 text-sm sm:text-base line-clamp-2 mb-1.5" style={{ fontFamily: 'Outfit, sans-serif' }}>
          {product.name}
        </h3>

        <div className="flex items-center gap-1 mb-2">
          <StarRating rating={5} size="sm" />
          <span className="text-xs text-slate-400">(12+)</span>
        </div>

        <div className="mt-auto">
          <div className="flex items-end gap-2 mb-2.5">
            <span className="text-lg sm:text-xl font-black text-sky-600" data-testid={`price-${product.id}`}>
              Rs.&nbsp;{product.discounted_price.toLocaleString()}
            </span>
            <span className="text-xs sm:text-sm text-slate-400 line-through mb-0.5">
              Rs.&nbsp;{product.price.toLocaleString()}
            </span>
          </div>

          {product.battery_life && (
            <p className="text-xs text-slate-400 mb-2">Battery: {product.battery_life}</p>
          )}

          {soldOut ? (
            <button
              disabled
              className="w-full bg-slate-200 text-slate-500 rounded-xl py-2.5 text-sm font-semibold cursor-not-allowed"
              data-testid={`soldout-btn-${product.id}`}
              onClick={(e) => e.stopPropagation()}
            >
              Currently Sold Out
            </button>
          ) : (
            <div className="flex gap-2">
              {/* Order Now */}
              <button
                className="flex-1 bg-sky-500 hover:bg-sky-600 active:scale-95 text-white rounded-xl py-2.5 text-sm font-semibold transition-all flex items-center justify-center gap-1.5 shadow-sm shadow-sky-200"
                onClick={(e) => { e.stopPropagation(); navigate(`/product/${product.id}`); }}
                data-testid={`order-btn-${product.id}`}
              >
                <ShoppingBag className="w-4 h-4" />
                Order Now
              </button>

              {/* Add to cart — larger, visually distinct */}
              <button
                className="bg-amber-400 hover:bg-amber-500 active:scale-95 text-white rounded-xl w-11 h-11 flex items-center justify-center transition-all shadow-sm shadow-amber-200 flex-shrink-0 relative group"
                onClick={handleQuickAdd}
                aria-label="Add to cart"
                data-testid={`add-cart-btn-${product.id}`}
                title="Add to cart"
              >
                <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-200" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
