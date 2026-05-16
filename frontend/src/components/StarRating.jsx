import { Star } from "lucide-react";

export default function StarRating({ rating = 0, size = "sm", interactive = false, onRate }) {
  const sizeClass = size === "lg" ? "w-6 h-6" : size === "md" ? "w-5 h-5" : "w-4 h-4";

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${sizeClass} ${star <= rating ? "text-amber-400 fill-amber-400" : "text-slate-200 fill-slate-200"} ${interactive ? "cursor-pointer hover:text-amber-400 hover:fill-amber-400 transition-colors" : ""}`}
          onClick={interactive && onRate ? () => onRate(star) : undefined}
        />
      ))}
    </div>
  );
}
