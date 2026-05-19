import { useState, useRef } from "react";
import axios from "axios";
import { Upload, Link2, ImagePlus, Film, X } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function getAdminConfig() {
  const token = localStorage.getItem("adminToken");
  return { headers: { Authorization: `Bearer ${token}` } };
}

/**
 * Compress an image client-side before upload (reduces MongoDB storage).
 * A 5 MB photo → ~150–300 KB. Max 1200 px wide, 82 % JPEG quality.
 * Non-image files (video, etc.) are returned unchanged.
 */
async function compressImage(file) {
  if (!file.type.startsWith("image/")) return file;
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
        (blob) =>
          resolve(
            new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" })
          ),
        "image/jpeg",
        0.82
      );
    };
    img.onerror = () => { URL.revokeObjectURL(objUrl); resolve(file); };
    img.src = objUrl;
  });
}

/**
 * Dual-input media uploader: Browse from PC/Mobile OR paste an HTTPS URL.
 *
 * Props:
 *   label      – field label string
 *   accept     – file input accept string, e.g. "image/*" or "video/*"
 *   multiple   – boolean, allow multiple file selection
 *   value      – array of URL strings (current media list)
 *   onChange   – (newArray: string[]) => void
 *   testId     – base data-testid prefix
 *   hint       – optional small hint text shown under the browse button
 */
export default function MediaUploader({ label, accept, multiple, value, onChange, testId, hint }) {
  const fileInputRef = useRef(null);
  const [urlInput, setUrlInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [tab, setTab] = useState("browse"); // "browse" | "url"

  const items = Array.isArray(value)
    ? value
    : value
    ? value.split("\n").map((s) => s.trim()).filter(Boolean)
    : [];

  const isVideo = accept && accept.includes("video");

  const handleFiles = async (files) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    const newUrls = [];
    for (const rawFile of Array.from(files)) {
      try {
        const file = await compressImage(rawFile);
        const fd = new FormData();
        fd.append("file", file);
        const res = await axios.post(`${API}/admin/upload-media`, fd, {
          headers: {
            ...getAdminConfig().headers,
            "Content-Type": "multipart/form-data",
          },
        });
        newUrls.push(res.data.url);
      } catch (e) {
        // eslint-disable-next-line no-alert
        alert(`Upload failed for ${rawFile.name}: ${e.response?.data?.detail || e.message}`);
      }
    }
    setUploading(false);
    if (newUrls.length > 0) onChange([...items, ...newUrls]);
  };

  const addUrl = () => {
    const u = urlInput.trim();
    if (!u) return;
    if (!u.startsWith("http")) {
      // eslint-disable-next-line no-alert
      alert("Please enter a valid HTTPS URL");
      return;
    }
    onChange([...items, u]);
    setUrlInput("");
  };

  const removeItem = (idx) => onChange(items.filter((_, i) => i !== idx));

  const resolvePreview = (url) =>
    url.startsWith("/api/media/") ? `${process.env.REACT_APP_BACKEND_URL}${url}` : url;

  return (
    <div data-testid={testId}>
      <label className="block text-sm font-semibold text-slate-300 mb-2">{label}</label>

      {/* Tab switcher */}
      <div className="flex gap-2 mb-3">
        <button
          type="button"
          onClick={() => setTab("browse")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            tab === "browse"
              ? "bg-sky-500 text-white"
              : "bg-slate-700 text-slate-300 hover:bg-slate-600"
          }`}
          data-testid={`${testId}-browse-tab`}
        >
          <Upload className="w-3.5 h-3.5" /> Browse File
        </button>
        <button
          type="button"
          onClick={() => setTab("url")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            tab === "url"
              ? "bg-sky-500 text-white"
              : "bg-slate-700 text-slate-300 hover:bg-slate-600"
          }`}
          data-testid={`${testId}-url-tab`}
        >
          <Link2 className="w-3.5 h-3.5" /> Paste URL
        </button>
      </div>

      {/* Browse tab */}
      {tab === "browse" && (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            multiple={multiple}
            className="hidden"
            data-testid={`${testId}-file-input`}
            onChange={(e) => handleFiles(e.target.files)}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full border-2 border-dashed border-slate-600 hover:border-sky-500 rounded-xl p-4 flex flex-col items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
            data-testid={`${testId}-browse-btn`}
          >
            {isVideo ? (
              <Film className="w-6 h-6 text-slate-400" />
            ) : (
              <ImagePlus className="w-6 h-6 text-slate-400" />
            )}
            <span className="text-slate-400 text-xs">
              {uploading
                ? "Uploading…"
                : `Click to select ${isVideo ? "video" : "image"} from PC / Mobile`}
            </span>
            {hint && <span className="text-slate-500 text-xs">{hint}</span>}
          </button>
        </div>
      )}

      {/* URL tab */}
      {tab === "url" && (
        <div className="flex gap-2">
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addUrl())}
            placeholder="https://example.com/image.jpg"
            className="flex-1 bg-slate-700 border border-slate-600 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            data-testid={`${testId}-url-input`}
          />
          <button
            type="button"
            onClick={addUrl}
            className="bg-sky-500 hover:bg-sky-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold"
            data-testid={`${testId}-url-add-btn`}
          >
            Add
          </button>
        </div>
      )}

      {/* Previews */}
      {items.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {items.map((url, i) => (
            <div
              // eslint-disable-next-line react/no-array-index-key
              key={`${url}-${i}`}
              className="relative group rounded-xl overflow-hidden bg-slate-900 border border-slate-700"
              data-testid={`${testId}-item-${i}`}
            >
              {isVideo ? (
                <div className="aspect-video flex flex-col items-center justify-center gap-1 p-2">
                  <Film className="w-6 h-6 text-slate-400" />
                  <span className="text-xs text-slate-400 truncate w-full text-center">
                    {url.split("/").pop()}
                  </span>
                </div>
              ) : (
                <img
                  src={resolvePreview(url)}
                  alt={`preview-${i}`}
                  className="aspect-square object-cover w-full"
                  onError={(e) => {
                    e.target.src =
                      "https://images.unsplash.com/photo-1618941716939-553df3c6c278?w=100";
                  }}
                />
              )}
              <button
                type="button"
                onClick={() => removeItem(i)}
                className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                data-testid={`${testId}-remove-${i}`}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
