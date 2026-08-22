"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

export function HeroGallery({
  images,
  alt,
}: {
  images: string[];
  alt: string;
}) {
  const slides = images.length > 0 ? images : [];
  const [active, setActive] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (slides.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      return;
    timer.current = setInterval(
      () => setActive((current) => (current + 1) % slides.length),
      4500,
    );
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [slides.length]);

  if (slides.length === 0) return null;

  return (
    <div
      className="relative min-h-[420px] min-w-0 overflow-hidden lg:min-h-full"
      onMouseEnter={() => {
        if (timer.current) clearInterval(timer.current);
      }}
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
        <div className="absolute bottom-5 right-5 flex gap-1.5">
          {slides.map((src, index) => (
            <button
              key={src}
              type="button"
              onClick={() => setActive(index)}
              aria-label={`Show hero image ${index + 1} of ${slides.length}`}
              aria-current={index === active}
              className={`size-2 rounded-full transition-[background-color,transform] ${
                index === active
                  ? "scale-125 bg-paper"
                  : "bg-paper/50 hover:bg-paper/80"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
