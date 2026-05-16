import { useNavigate } from "react-router-dom";
import { ShoppingBag, Plus } from "lucide-react";
import StarRating from "./StarRating";
import { useCart } from "../contexts/CartContext";
import { toast } from "sonner";

export default function ProductCard({ product, index = 0 }) {
  const navigate = useNavigate();
  const { addItem } = useCart();
  const discountPct = Math.round(((product.price - product.discounted_price) / product.price) * 100);
  const mainImage = product.images?.[0] || "https://images.unsplash.com/photo-1618941716939-553df3c6c278?w=400";

  const handleQuickAdd = (e) => {
    e.stopPropagation();
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
      {/* Image */}
      <div className="relative aspect-square bg-slate-50 overflow-hidden">
        <img
          src={mainImage}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
          loading="lazy"
          onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1618941716939-553df3c6c278?w=400"; }}
        />
        {discountPct > 0 && (
          <div className="absolute top-2 left-2 bg-amber-500 text-white text-xs font-black px-2.5 py-1 rounded-full shadow-sm" data-testid={`discount-badge-${product.id}`}>
            -{discountPct}%
          </div>
        )}
        <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
          Sale
        </div>
        {product.total_sold > 50 && (
          <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            {product.total_sold}+ sold
          </div>
        )}
      </div>

      <div className="p-3 sm:p-4 flex flex-col flex-1">
        <h3 className="font-bold text-slate-900 text-sm sm:text-base line-clamp-2 mb-1" style={{ fontFamily: 'Outfit, sans-serif' }}>
          {product.name}
        </h3>

        <div className="flex items-center gap-1 mb-2">
          <StarRating rating={5} size="sm" />
          <span className="text-xs text-slate-400">(12+)</span>
        </div>

        <div className="mt-auto">
          <div className="flex items-end gap-2 mb-2">
            <span className="text-lg sm:text-xl font-black text-sky-600" data-testid={`price-${product.id}`}>
              Rs. {product.discounted_price.toLocaleString()}
            </span>
            <span className="text-xs sm:text-sm text-slate-400 line-through mb-0.5">
              Rs. {product.price.toLocaleString()}
            </span>
          </div>

          {product.battery_life && (
            <p className="text-xs text-slate-400 mb-2">Battery: {product.battery_life}</p>
          )}

          <div className="flex gap-1.5">
            <button
              className="flex-1 bg-sky-500 hover:bg-sky-600 text-white rounded-xl py-2 text-sm font-semibold transition-all active:scale-95 flex items-center justify-center gap-1.5"
              onClick={(e) => { e.stopPropagation(); navigate(`/product/${product.id}`); }}
              data-testid={`order-btn-${product.id}`}
            >
              <ShoppingBag className="w-4 h-4" />
              Order Now
            </button>
            <button
              className="bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-xl px-3 py-2 text-sm font-semibold transition-all active:scale-95 flex items-center justify-center"
              onClick={handleQuickAdd}
              aria-label="Add to cart"
              data-testid={`add-cart-btn-${product.id}`}
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
