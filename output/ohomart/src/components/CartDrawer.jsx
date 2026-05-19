import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "./ui/sheet";
import { Trash2, Plus, Minus, ShoppingBag, X } from "lucide-react";
import { useCart } from "../contexts/CartContext";

export default function CartDrawer() {
  const navigate = useNavigate();
  const { items, total, originalTotal, open, setOpen, updateQty, removeItem } = useCart();
  const savings = originalTotal - total;

  const handleCheckout = () => {
    if (items.length === 0) return;
    setOpen(false);
    navigate("/checkout");
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0" data-testid="cart-drawer">
        <SheetHeader className="px-5 py-4 border-b border-sky-100">
          <SheetTitle className="flex items-center gap-2 text-slate-900" style={{ fontFamily: "Outfit, sans-serif" }}>
            <ShoppingBag className="w-5 h-5 text-sky-500" />
            Your Cart ({items.length})
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3" data-testid="cart-items">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-20 h-20 bg-sky-50 rounded-full flex items-center justify-center mb-3">
                <ShoppingBag className="w-10 h-10 text-sky-300" />
              </div>
              <p className="text-slate-500 mb-2 font-semibold">Your cart is empty</p>
              <p className="text-xs text-slate-400">Add some cool fans to beat the heat!</p>
              <button
                onClick={() => setOpen(false)}
                className="mt-5 bg-sky-500 hover:bg-sky-600 text-white font-semibold px-6 py-2.5 rounded-full transition-all"
                data-testid="cart-continue-shopping"
              >
                Browse Products
              </button>
            </div>
          ) : (
            items.map((it) => (
              <div key={it.key} className="flex gap-3 bg-white border border-sky-100 rounded-2xl p-3" data-testid={`cart-item-${it.product_id}`}>
                <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-50 flex-shrink-0">
                  <img src={it.product_image} alt={it.product_name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900 text-sm line-clamp-2">{it.product_name}</p>
                  <div className="flex flex-wrap gap-1 my-1">
                    {it.selected_color && <span className="text-[10px] bg-sky-50 text-sky-700 px-1.5 py-0.5 rounded">{it.selected_color}</span>}
                    {it.selected_size && <span className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded">{it.selected_size}</span>}
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <div className="flex items-center gap-1.5 bg-slate-50 rounded-full p-0.5">
                      <button
                        onClick={() => updateQty(it.key, it.quantity - 1)}
                        className="w-6 h-6 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:border-sky-400"
                        data-testid={`cart-qty-dec-${it.product_id}`}
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-bold text-slate-900 w-5 text-center">{it.quantity}</span>
                      <button
                        onClick={() => updateQty(it.key, it.quantity + 1)}
                        className="w-6 h-6 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:border-sky-400"
                        data-testid={`cart-qty-inc-${it.product_id}`}
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <span className="font-black text-sky-600 text-sm">Rs. {(it.unit_price * it.quantity).toLocaleString()}</span>
                  </div>
                </div>
                <button
                  onClick={() => removeItem(it.key)}
                  className="text-slate-300 hover:text-red-500 transition-colors self-start"
                  data-testid={`cart-remove-${it.product_id}`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-sky-100 px-5 py-4 bg-white space-y-3">
            {savings > 0 && (
              <div className="flex justify-between text-xs text-green-600 font-semibold">
                <span>You save</span>
                <span>Rs. {savings.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between items-end">
              <span className="text-slate-700 font-semibold">Total (COD)</span>
              <span className="text-2xl font-black text-sky-600" data-testid="cart-total">Rs. {total.toLocaleString()}</span>
            </div>
            <button
              onClick={handleCheckout}
              className="w-full bg-sky-500 hover:bg-sky-600 text-white font-bold py-3.5 rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2 shadow-md"
              data-testid="cart-checkout-btn"
            >
              <ShoppingBag className="w-4 h-4" />
              Proceed to Checkout
            </button>
            <p className="text-[11px] text-center text-slate-400">Free delivery • Cash on Delivery • 7-Day Return</p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
