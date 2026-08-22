"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

const SLIDE_MS = 4500;
const RING_RADIUS = 8;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export function HeroGallery({
  images,
  alt,
}: {
  images: string[];
  alt: string;
}) {
  const slides = images.length > 0 ? images : [];
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (slides.length < 2 || paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      return;
    const id = setInterval(
      () => setActive((current) => (current + 1) % slides.length),
      SLIDE_MS,
    );
    return () => clearInterval(id);
  }, [slides.length, paused, active]);

  if (slides.length === 0) return null;

  return (
    <div
      className="relative min-h-[420px] min-w-0 overflow-hidden lg:min-h-full"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {slides.map((src, index) => (
        <Image
          key={src}
          src={src}
          alt={index === active ? alt : ""}
          fill
          priority={index === 0}
          loading={index === 0 ? undefined : "eager"}
          className={`object-cover transition-opacity duration-700 ease-out ${
            index === active ? "opacity-100" : "opacity-0"
          }`}
          sizes="(max-width: 1024px) 100vw, 55vw"
          unoptimized={src.startsWith("http")}
        />
      ))}
      <p className="absolute bottom-5 left-5 bg-paper px-4 py-2 text-xs font-bold text-ink shadow-soft">
        Soft on feet. Big on colour.
      </p>
      {slides.length > 1 && (
        <div className="absolute bottom-5 right-5 flex items-center gap-3">
          {slides.map((src, index) => (
            <button
              key={src}
              type="button"
              onClick={() => setActive(index)}
              aria-label={`Show hero image ${index + 1} of ${slides.length}`}
              aria-current={index === active}
              className="relative grid size-4 place-items-center"
            >
              <span
                className={`block rounded-full transition-[background-color,transform] ${
                  index === active
                    ? "size-2 scale-125 bg-paper"
                    : "size-2 bg-paper/50 hover:bg-paper/80"
                }`}
              />
              {index === active && (
                <svg
                  key={`ring-${active}-${paused}`}
                  className="absolute inset-0 -rotate-90"
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                >
                  <circle
                    cx="10"
                    cy="10"
                    r={RING_RADIUS}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    className="text-paper/30"
                  />
                  <circle
                    cx="10"
                    cy="10"
                    r={RING_RADIUS}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeDasharray={RING_CIRCUMFERENCE}
                    strokeDashoffset={RING_CIRCUMFERENCE}
                    className={`text-paper ${paused ? "" : "hero-dot-progress"}`}
                    style={{ "--hero-dot-duration": `${SLIDE_MS}ms` } as React.CSSProperties}
                  />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
