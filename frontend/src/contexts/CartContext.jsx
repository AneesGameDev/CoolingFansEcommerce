import { createContext, useContext, useState, useEffect, useCallback } from "react";

const CartContext = createContext(null);
const STORAGE_KEY = "ohomart_cart_v1";

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch {
      return [];
    }
  });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = useCallback((product, { color = null, size = null, quantity = 1, image = null } = {}) => {
    setItems((prev) => {
      const key = `${product.id}|${color || ""}|${size || ""}`;
      const idx = prev.findIndex((it) => it.key === key);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], quantity: copy[idx].quantity + quantity };
        return copy;
      }
      return [
        ...prev,
        {
          key,
          product_id: product.id,
          product_name: product.name,
          product_image: image || product.images?.[0] || "",
          unit_price: product.discounted_price,
          original_price: product.price,
          selected_color: color,
          selected_size: size,
          quantity,
        },
      ];
    });
    setOpen(true);
  }, []);

  const updateQty = useCallback((key, qty) => {
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, quantity: Math.max(1, qty) } : it)));
  }, []);

  const removeItem = useCallback((key) => {
    setItems((prev) => prev.filter((it) => it.key !== key));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const total = items.reduce((s, it) => s + it.unit_price * it.quantity, 0);
  const totalQty = items.reduce((s, it) => s + it.quantity, 0);
  const originalTotal = items.reduce((s, it) => s + it.original_price * it.quantity, 0);

  return (
    <CartContext.Provider
      value={{ items, total, totalQty, originalTotal, open, setOpen, addItem, updateQty, removeItem, clear }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
