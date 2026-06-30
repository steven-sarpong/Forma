"use client";

import { useRef, useState } from "react";
import { X, Upload, Camera } from "lucide-react";

const AVATAR_KEY = "forma_avatar";
const MAX_SIZE = 800;

export function getStoredAvatar(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(AVATAR_KEY);
}

export function clearStoredAvatar() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(AVATAR_KEY);
}

function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      const scale = Math.min(MAX_SIZE / img.width, MAX_SIZE / img.height, 1);
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.92));
    };
    img.onerror = reject;
    img.src = url;
  });
}

interface Props {
  value: string | null;
  onChange: (dataUrl: string) => void;
  initials?: string;
  size?: "sm" | "lg";
}

export default function AvatarUpload({ value, onChange, initials = "?", size = "lg" }: Props) {
  const uploadRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [modalOpen, setModalOpen] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImage(file);
      localStorage.setItem(AVATAR_KEY, dataUrl);
      onChange(dataUrl);
    } catch {
      // silently ignore
    }
    e.target.value = "";
    setModalOpen(false);
  }

  const dim = size === "lg" ? "w-24 h-24" : "w-10 h-10";
  const textSize = size === "lg" ? "text-3xl" : "text-sm";

  return (
    <>
      {/* Avatar button — no camera badge */}
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className={`relative ${dim} rounded-full shrink-0`}
        aria-label="Profilbild anzeigen"
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value}
            alt="Profilbild"
            className={`${dim} rounded-full object-cover border-2 border-brand-100`}
          />
        ) : (
          <div className={`${dim} rounded-full bg-brand-100 flex items-center justify-center border-2 border-brand-200`}>
            <span className={`${textSize} font-bold text-brand-600`}>
              {initials.slice(0, 1).toUpperCase()}
            </span>
          </div>
        )}
      </button>

      {/* Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/70"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="relative flex flex-col items-center gap-5 p-6 w-full max-w-xs"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close */}
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-0 right-0 w-9 h-9 rounded-full bg-white/20 text-white flex items-center justify-center"
              aria-label="Schließen"
            >
              <X size={18} />
            </button>

            {/* Large avatar preview */}
            {value ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={value}
                alt="Profilbild"
                className="w-48 h-48 rounded-full object-cover border-4 border-white/20 shadow-xl"
              />
            ) : (
              <div className="w-48 h-48 rounded-full bg-brand-100 flex items-center justify-center border-4 border-white/20 shadow-xl">
                <span className="text-6xl font-bold text-brand-600">
                  {initials.slice(0, 1).toUpperCase()}
                </span>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-3 w-full">
              <button
                type="button"
                onClick={() => cameraRef.current?.click()}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-white text-brand-900 font-semibold text-sm shadow-sm active:scale-[0.98] transition-transform"
              >
                <Camera size={16} />
                Foto aufnehmen
              </button>
              <button
                type="button"
                onClick={() => uploadRef.current?.click()}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-white/20 text-white font-semibold text-sm active:scale-[0.98] transition-transform"
              >
                <Upload size={16} />
                Aus Galerie wählen
              </button>
            </div>
          </div>

          {/* Hidden file inputs */}
          <input
            ref={uploadRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={handleFile}
            aria-hidden
          />
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="user"
            className="sr-only"
            onChange={handleFile}
            aria-hidden
          />
        </div>
      )}
    </>
  );
}
