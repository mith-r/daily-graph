"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Avatar } from "@/components/Avatar";
import { removePhotoAction, updatePhotoAction } from "@/app/actions/profile";
import type { AvatarConfig } from "@/lib/types";

// The square the saved photo is exported to. Tiny on the graph (~13–26px) and
// modest in the preview, so 256 covers both at a JPEG-compressed ~20–40 KB.
const OUT_SIZE = 256;
// On-screen size of the interactive crop circle. Bigger than the dot/preview so
// panning and zooming feel precise; the export scales this region up to OUT_SIZE.
const VIEW = 240;
const MIN_ZOOM = 1;
const MAX_ZOOM = 5;

type Vec = { x: number; y: number };
type Nat = { w: number; h: number };

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));

// Scale at which the smaller image dimension exactly fills the viewport — i.e.
// zoom = 1 already covers the circle, so there's never a gap to pan into.
const coverScale = (n: Nat) => VIEW / Math.min(n.w, n.h);

// Displayed image box at a given zoom (always ≥ VIEW on both axes).
const dispSize = (n: Nat, zoom: number) => {
  const s = coverScale(n) * zoom;
  return { w: n.w * s, h: n.h * s };
};

// Keep the image covering the viewport: its top-left can't go positive (gap on
// the left/top) or past VIEW − size (gap on the right/bottom).
const clampOffset = (o: Vec, d: { w: number; h: number }): Vec => ({
  x: clamp(o.x, VIEW - d.w, 0),
  y: clamp(o.y, VIEW - d.h, 0),
});

export function ProfilePhotoSetting({
  userId,
  photoVersion,
  previewAvatar,
}: {
  userId: string;
  // Present when the user already has an uploaded photo (its cache-bust version).
  photoVersion?: number;
  // The user's designed bitmoji — shown as the fallback preview when there's no
  // photo, so they can see what their dot falls back to.
  previewAvatar: AvatarConfig;
}) {
  // The currently-saved photo's src (the serving route, seeded from the saved
  // version). Null = no saved photo → bitmoji fallback. Set directly on save so
  // there's no flash waiting for the new version to round-trip.
  const [photoSrc, setPhotoSrc] = useState<string | null>(
    photoVersion != null ? `/api/avatar?id=${userId}&v=${photoVersion}` : null
  );

  // --- Crop editor state (active while adjusting a freshly chosen photo) ---
  const [editing, setEditing] = useState(false);
  const [src, setSrc] = useState<string | null>(null); // object URL being adjusted
  const [nat, setNat] = useState<Nat | null>(null); // natural image dimensions
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<Vec>({ x: 0, y: 0 }); // image top-left in viewport px

  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const fileInput = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgElRef = useRef<HTMLImageElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  // Mirror the live transform into refs so the wheel/pointer listeners (which
  // close over them) always read the latest values without stale closures.
  const natRef = useRef<Nat | null>(null);
  const zoomRef = useRef(1);
  const offsetRef = useRef<Vec>({ x: 0, y: 0 });
  const dragRef = useRef<{ px: number; py: number; o: Vec } | null>(null);

  const setZ = (z: number) => {
    zoomRef.current = z;
    setZoom(z);
  };
  const setOff = (o: Vec) => {
    offsetRef.current = o;
    setOffset(o);
  };

  const revokeUrl = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  };
  // Release the object URL if we unmount mid-edit.
  useEffect(() => revokeUrl, []);

  // Zoom while keeping whatever sits under the viewport center pinned there, so
  // zooming feels like it grows/shrinks around the middle of the crop.
  const applyZoom = (next: number) => {
    const n = natRef.current;
    if (!n) return;
    const z = clamp(next, MIN_ZOOM, MAX_ZOOM);
    const oldD = dispSize(n, zoomRef.current);
    const newD = dispSize(n, z);
    const o = offsetRef.current;
    const fx = (VIEW / 2 - o.x) / oldD.w; // image fraction under center, x
    const fy = (VIEW / 2 - o.y) / oldD.h;
    const no = clampOffset(
      { x: VIEW / 2 - fx * newD.w, y: VIEW / 2 - fy * newD.h },
      newD
    );
    setZ(z);
    setOff(no);
  };

  // Wheel-to-zoom. Registered non-passively so we can preventDefault and stop
  // the page from scrolling while the cursor is over the crop area.
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !editing) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      applyZoom(zoomRef.current * (e.deltaY < 0 ? 1.1 : 1 / 1.1));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
    // applyZoom reads the live transform from refs, so the listener stays correct
    // across renders — we only need to (re)bind it when the editor opens/closes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  const onPointerDown = (e: React.PointerEvent) => {
    containerRef.current?.setPointerCapture(e.pointerId);
    dragRef.current = { px: e.clientX, py: e.clientY, o: offsetRef.current };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    const n = natRef.current;
    if (!drag || !n) return;
    const d = dispSize(n, zoomRef.current);
    setOff(
      clampOffset(
        { x: drag.o.x + (e.clientX - drag.px), y: drag.o.y + (e.clientY - drag.py) },
        d
      )
    );
  };
  const onPointerUp = (e: React.PointerEvent) => {
    dragRef.current = null;
    try {
      containerRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      // pointer already released
    }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Let the same file be re-picked later (onChange won't fire otherwise).
    e.target.value = "";
    if (!file) return;
    setError(null);
    setSaved(false);
    revokeUrl();
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    const img = new Image();
    img.onload = () => {
      imgElRef.current = img;
      const n = { w: img.naturalWidth, h: img.naturalHeight };
      natRef.current = n;
      setNat(n);
      // Start at zoom 1, centered.
      const d = dispSize(n, 1);
      setZ(1);
      setOff(clampOffset({ x: (VIEW - d.w) / 2, y: (VIEW - d.h) / 2 }, d));
      setSrc(url);
      setEditing(true);
    };
    img.src = url;
  };

  // Render exactly what's framed in the viewport to a square canvas, mapping the
  // on-screen transform up to OUT_SIZE. The 256-px square is what gets saved; the
  // circular mask is purely how it reads on the graph.
  const renderCrop = (): string | null => {
    const n = natRef.current;
    const img = imgElRef.current;
    if (!n || !img) return null;
    const canvas = document.createElement("canvas");
    canvas.width = OUT_SIZE;
    canvas.height = OUT_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.imageSmoothingQuality = "high";
    const k = OUT_SIZE / VIEW;
    const d = dispSize(n, zoomRef.current);
    const o = offsetRef.current;
    ctx.drawImage(img, o.x * k, o.y * k, d.w * k, d.h * k);
    return canvas.toDataURL("image/jpeg", 0.85);
  };

  const cancelEdit = () => {
    setEditing(false);
    setSrc(null);
    revokeUrl();
  };

  const save = () => {
    const dataUrl = renderCrop();
    if (!dataUrl) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("photo", dataUrl);
      const res = await updatePhotoAction(undefined, fd);
      if (res?.error) {
        setError(res.error);
      } else {
        // Show the just-saved crop directly — identical to what was persisted,
        // so no round trip and no fallback flash.
        setPhotoSrc(dataUrl);
        setError(null);
        setSaved(true);
        cancelEdit();
      }
    });
  };

  const remove = () => {
    startTransition(async () => {
      const res = await removePhotoAction();
      if (res?.error) {
        setError(res.error);
      } else {
        setPhotoSrc(null);
        setSaved(false);
        setError(null);
        cancelEdit();
      }
    });
  };

  const hasSavedPhoto = photoSrc != null;
  const disp = editing && nat ? dispSize(nat, zoom) : null;

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Profile picture</h2>
        <p className="mt-1 text-sm text-white/60">
          Upload a photo to show in place of your designed face on the graph.
        </p>
      </div>

      <div className="flex flex-col items-center gap-4">
        {editing && disp ? (
          // --- Interactive crop: drag to reposition, slider/scroll to zoom ---
          <div className="flex flex-col items-center gap-3">
            <div
              ref={containerRef}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              className="relative rounded-full overflow-hidden cursor-grab active:cursor-grabbing select-none"
              style={{
                width: VIEW,
                height: VIEW,
                touchAction: "none",
                boxShadow:
                  "0 0 0 3px rgba(255,255,255,0.85), 0 0 24px rgba(0,0,0,0.4)",
              }}
            >
              {src && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={src}
                  alt="Adjust your photo"
                  draggable={false}
                  style={{
                    position: "absolute",
                    left: offset.x,
                    top: offset.y,
                    width: disp.w,
                    height: disp.h,
                    maxWidth: "none",
                    pointerEvents: "none",
                    userSelect: "none",
                  }}
                />
              )}
            </div>

            <label className="flex items-center gap-2 text-xs text-white/50">
              <span aria-hidden>🔍</span>
              <input
                type="range"
                min={MIN_ZOOM}
                max={MAX_ZOOM}
                step={0.01}
                value={zoom}
                onChange={(e) => applyZoom(parseFloat(e.target.value))}
                aria-label="Zoom"
                className="w-44 accent-white"
              />
            </label>
            <p className="text-xs text-white/40">
              Drag to reposition · scroll or slide to zoom
            </p>
          </div>
        ) : (
          // --- Static preview: saved photo, else the bitmoji fallback ---
          <div
            className="rounded-full overflow-hidden"
            style={{
              width: 140,
              height: 140,
              boxShadow:
                "0 0 0 3px rgba(255,255,255,0.85), 0 0 24px rgba(0,0,0,0.4)",
            }}
          >
            {photoSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoSrc}
                alt="Profile photo"
                width={140}
                height={140}
                style={{ width: 140, height: 140, objectFit: "cover" }}
              />
            ) : (
              <Avatar config={previewAvatar} size={140} title="Avatar preview" />
            )}
          </div>
        )}

        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          onChange={handleFile}
          className="hidden"
        />

        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={pending}
            className="text-sm rounded-full border border-white/15 px-4 py-1.5 text-white/80 hover:text-white hover:border-white/40 transition disabled:opacity-40"
          >
            {hasSavedPhoto || editing ? "Choose another photo" : "Choose a photo"}
          </button>

          {editing && (
            <>
              <button
                type="button"
                onClick={save}
                disabled={pending}
                className="text-sm rounded-full bg-white text-neutral-900 font-medium px-4 py-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {pending ? "Saving…" : "Save photo"}
              </button>
              <button
                type="button"
                onClick={cancelEdit}
                disabled={pending}
                className="text-sm rounded-full border border-white/15 px-4 py-1.5 text-white/70 hover:text-white hover:border-white/40 transition disabled:opacity-40"
              >
                Cancel
              </button>
            </>
          )}

          {/* Remove the saved photo to fall back to the bitmoji. */}
          {hasSavedPhoto && !editing && (
            <button
              type="button"
              onClick={remove}
              disabled={pending}
              className="text-sm rounded-full border border-white/15 px-4 py-1.5 text-white/70 hover:text-white hover:border-white/40 transition disabled:opacity-40"
            >
              Remove photo
            </button>
          )}
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}
        {saved && !editing && (
          <p className="text-xs text-emerald-400">Saved.</p>
        )}
      </div>
    </section>
  );
}
