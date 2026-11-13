"use client";

import { useEffect, useRef } from "react";

const REVEAL_SELECTOR =
  ".section-heading,.about-grid,.amenities h2,.price-card,.amenity-grid>div,.promise-grid article,.directions-grid,.blog-card,.footer-top";

// Scroll progress bar and reveal-on-scroll. Content stays visible without JavaScript.
export function MotionEffects() {
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const progress = progressRef.current;
    let scheduled = false;

    const update = () => {
      scheduled = false;
      if (!progress) return;
      const range = document.documentElement.scrollHeight - window.innerHeight;
      const ratio = range > 0 ? Math.min(1, Math.max(0, window.scrollY / range)) : 0;
      progress.style.transform = `scaleX(${ratio})`;
    };
    const onScroll = () => {
      if (!scheduled) {
        scheduled = true;
        requestAnimationFrame(update);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    update();

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const nodes = Array.from(
      document.querySelectorAll<HTMLElement>(REVEAL_SELECTOR),
    );
    let observer: IntersectionObserver | undefined;

    const showAll = () => {
      nodes.forEach((node) => node.classList.add("is-visible"));
      observer?.disconnect();
    };

    if (!reduced.matches && "IntersectionObserver" in window) {
      observer = new IntersectionObserver(
        (entries) =>
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-visible");
              observer?.unobserve(entry.target);
            }
          }),
        { threshold: 0.08, rootMargin: "0px 0px -24px 0px" },
      );
      nodes.forEach((node) => {
        const siblings = node.parentElement
          ? Array.from(node.parentElement.children)
          : [];
        const index = Math.max(0, siblings.indexOf(node));
        node.style.setProperty("--reveal-delay", `${Math.min(index, 2) * 75}ms`);
        node.classList.add("reveal-ready");
        observer?.observe(node);
      });
      reduced.addEventListener("change", (event) => {
        if (event.matches) showAll();
      });
    }

    return () => {
      window.removeEventListener("scroll", onScroll);
      observer?.disconnect();
      nodes.forEach((node) => {
        node.classList.remove("reveal-ready", "is-visible");
        node.style.removeProperty("--reveal-delay");
      });
    };
  }, []);

  return <div ref={progressRef} className="scroll-progress" aria-hidden="true" />;
}
