import { useState } from "react";
import { Dialog, DialogContent } from "./ui/dialog";
import { X } from "lucide-react";

export default function ImageLightbox({ images, alt = "Image" }) {
  const [active, setActive] = useState(null);

  if (!images?.length) return null;

  return (
    <>
      <div className="flex gap-2 flex-wrap" data-testid="review-images-grid">
        {images.map((img, i) => (
          <button
            key={i}
            onClick={(e) => { e.stopPropagation(); setActive(i); }}
            className="w-16 h-16 rounded-xl overflow-hidden border border-sky-100 hover:ring-2 hover:ring-sky-400 transition-all active:scale-95"
            data-testid={`review-image-thumb-${i}`}
          >
            <img src={img} alt={`${alt} ${i + 1}`} className="w-full h-full object-cover" />
          </button>
        ))}
      </div>

      <Dialog open={active !== null} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-w-3xl p-0 bg-transparent border-0 shadow-none" data-testid="lightbox-dialog">
          {active !== null && (
            <div className="relative bg-black rounded-2xl overflow-hidden">
              <img src={images[active]} alt={alt} className="w-full max-h-[80vh] object-contain" />
              <button
                onClick={() => setActive(null)}
                className="absolute top-3 right-3 bg-white/90 hover:bg-white rounded-full w-9 h-9 flex items-center justify-center shadow-lg"
                data-testid="lightbox-close"
              >
                <X className="w-5 h-5" />
              </button>
              {images.length > 1 && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 bg-black/60 backdrop-blur px-3 py-1.5 rounded-full">
                  {images.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setActive(i)}
                      className={`w-2 h-2 rounded-full ${i === active ? "bg-white" : "bg-white/40"}`}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
