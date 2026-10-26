/** Soft teal diamond-facet line art behind auth screens (white + teal only). */
export function FacetBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgb(230_243_244/0.9),transparent_60%)]" />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-[radial-gradient(ellipse_at_bottom,rgb(244_250_250/1),transparent_70%)]" />
      <svg
        className="absolute -left-40 -top-24 h-[38rem] w-[38rem] text-teal-100 sm:-left-24"
        viewBox="0 0 200 200"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.5"
      >
        <path d="M100 10 170 70 100 190 30 70Z" />
        <path d="M30 70h140M65 70l35-60 35 60M65 70l35 120 35-120" />
        <path d="M47 40h106M47 40l18 30M153 40l-18 30" />
      </svg>
      <svg
        className="absolute -bottom-32 -right-40 h-[34rem] w-[34rem] rotate-12 text-teal-100 sm:-right-20"
        viewBox="0 0 200 200"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.5"
      >
        <path d="M100 10 170 70 100 190 30 70Z" />
        <path d="M30 70h140M65 70l35-60 35 60M65 70l35 120 35-120" />
      </svg>
      <div className="absolute left-[12%] top-[22%] size-1.5 animate-pulse rounded-full bg-teal-300" />
      <div className="absolute right-[18%] top-[14%] size-1 animate-pulse rounded-full bg-teal-400 [animation-delay:600ms]" />
      <div className="absolute bottom-[18%] left-[22%] size-1 animate-pulse rounded-full bg-teal-300 [animation-delay:1200ms]" />
    </div>
  );
}
