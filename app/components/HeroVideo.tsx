"use client";

import { useRef, useState } from "react";

// Decorative looping background video with a visible pause control (WCAG 2.2.2).
export function HeroVideo() {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(true);

  const toggle = () => {
    const video = ref.current;
    if (!video) return;
    if (video.paused) {
      void video.play();
      setPlaying(true);
    } else {
      video.pause();
      setPlaying(false);
    }
  };

  return (
    <>
      <video
        ref={ref}
        className="hero-video"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        poster="/assets/facility.jpg"
        aria-hidden="true"
      >
        <source src="/assets/hero.mp4" type="video/mp4" />
      </video>
      <button type="button" className="hero-video-toggle" onClick={toggle} aria-pressed={!playing}>
        {playing ? "Pause background video" : "Play background video"}
      </button>
    </>
  );
}
