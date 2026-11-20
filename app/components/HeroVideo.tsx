"use client";

import { useEffect, useRef } from "react";

// Decorative looping background video, loaded only after the page has finished loading and only where it is
// worth the 4 MB: wide screens, no reduced-motion, no data-saver. The optimized hero image shows until then.
export function HeroVideo() {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    const allowed =
      window.matchMedia("(min-width: 900px)").matches &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
      !conn?.saveData &&
      !/2g/.test(conn?.effectiveType ?? "");
    if (!allowed) return;

    // Wait until the page is fully loaded, then start on the first interaction or after a few idle seconds,
    // so the video never competes with (or becomes) the page's first paint.
    let timer: number | undefined;
    let started = false;
    const events = ["pointerdown", "keydown", "scroll", "touchstart"] as const;
    const play = () => {
      if (started) return;
      started = true;
      events.forEach((e) => window.removeEventListener(e, play));
      window.clearTimeout(timer);
      video.src = "/assets/hero.mp4";
      video.addEventListener("playing", () => video.classList.add("is-playing"), { once: true });
      video.play().catch(() => {});
    };
    const arm = () => {
      events.forEach((e) => window.addEventListener(e, play, { passive: true, once: true }));
      timer = window.setTimeout(play, 6000);
    };
    if (document.readyState === "complete") arm();
    else window.addEventListener("load", arm, { once: true });
    return () => {
      window.removeEventListener("load", arm);
      events.forEach((e) => window.removeEventListener(e, play));
      window.clearTimeout(timer);
    };
  }, []);

  return <video ref={ref} className="hero-video" muted loop playsInline preload="none" aria-hidden="true" />;
}
