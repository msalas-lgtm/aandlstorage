// Decorative looping background video.
export function HeroVideo() {
  return (
    <video
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
  );
}
