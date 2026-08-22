"use client";

/**
 * Shared Jarvis brand mark, in two variants:
 * - "mark": small square "J" badge used in the navbar / compact contexts.
 * - "wordmark": full "JARVIS" lettering with an animated accent bar and
 *   "ADMIN" subtitle, used on the login screen. When `animate` is true the
 *   letters drop in and the bar slides via GSAP (falls back to a plain
 *   render if GSAP hasn't loaded yet).
 */
import { useEffect, useRef } from "react";

const LETTERS = ["J", "A", "R", "V", "I", "S"];

const MARK_SIZE_CLASSES = {
  sm: "h-7 w-7 rounded-lg",
  lg: "h-16 w-16 rounded-2xl md:h-20 md:w-20",
};

const MARK_TEXT_SIZE_CLASSES = {
  sm: "text-xs",
  lg: "text-2xl md:text-3xl",
};

export function JarvisMark({
  size = "sm",
  className = "",
}: {
  /** "sm" is the navbar badge; "lg" is the same mark scaled up for the login hero. */
  size?: "sm" | "lg";
  className?: string;
}) {
  return (
    <div
      className={`flex ${MARK_SIZE_CLASSES[size]} flex-shrink-0 items-center justify-center bg-gradient-to-br from-blue-600 to-blue-700 shadow-md ${className}`}
    >
      <span className={`${MARK_TEXT_SIZE_CLASSES[size]} font-bold leading-none text-white`}>
        J
      </span>
    </div>
  );
}

const LOADER_SIZE_CLASSES = {
  sm: { letters: "gap-0.5 text-sm", bar: "h-[2px] w-9" },
  md: { letters: "gap-1 text-2xl", bar: "h-[3px] w-16" },
  lg: { letters: "gap-1.5 text-4xl md:text-5xl", bar: "h-1 w-24" },
};

/**
 * Branded loading indicator: the JARVIS letters ripple in a continuous wave
 * (unlike JarvisWordmark's one-shot GSAP entrance) while the accent bar
 * slides beneath, signaling an ongoing wait. Drop-in replacement for a
 * flowbite `<Spinner />` wherever a section/page is loading content.
 */
export function JarvisLoader({
  size = "md",
  className = "",
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizeClasses = LOADER_SIZE_CLASSES[size];

  return (
    <div
      role="status"
      aria-label="Loading"
      className={`flex flex-col items-center justify-center gap-3 ${className}`}
    >
      <span className={`inline-flex font-medium text-[#4c7ef3] ${sizeClasses.letters}`}>
        {LETTERS.map((letter, i) => (
          <span
            key={i}
            className="inline-block motion-safe:animate-[jarvisLetterWave_1.6s_ease-in-out_infinite]"
            style={{ animationDelay: `${i * 0.1}s` }}
          >
            {letter}
          </span>
        ))}
      </span>
      <span
        className={`rounded-full bg-[#2563eb] motion-safe:animate-[jarvisBar_2.2s_ease-in-out_infinite] ${sizeClasses.bar}`}
      />
    </div>
  );
}

/**
 * "stacked" is the big login-hero lockup: centered column, letters then a
 * full-width bar then "ADMIN" below.
 * "inline" is the compact navbar lockup: "JARVIS" (with its own underline)
 * sits on one line next to "ADMIN", sized to fit a slim top bar.
 */
export function JarvisWordmark({
  animate = false,
  showSubtitle = true,
  layout = "stacked",
  className = "",
}: {
  animate?: boolean;
  showSubtitle?: boolean;
  layout?: "stacked" | "inline";
  className?: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!animate) return;
    let cancelled = false;

    const run = (gsap: typeof import("gsap").gsap) => {
      if (cancelled || !rootRef.current) return;
      const letters = rootRef.current.querySelectorAll("[data-jarvis-letter]");
      const bar = rootRef.current.querySelector("[data-jarvis-bar]");
      const sub = rootRef.current.querySelector("[data-jarvis-sub]");
      gsap
        .timeline({ defaults: { ease: "power3.out" } })
        .from(letters, { y: 26, opacity: 0, duration: 0.5, stagger: 0.06 })
        .from(bar, { opacity: 0, duration: 0.4 }, "-=.2")
        .from(sub, { opacity: 0, y: 8, duration: 0.4 }, "-=.3");
    };

    import("gsap").then(({ gsap }) => run(gsap));
    return () => {
      cancelled = true;
    };
  }, [animate]);

  if (layout === "inline") {
    return (
      <div ref={rootRef} className={`inline-flex items-center gap-2 ${className}`}>
        <span className="inline-flex flex-col">
          <span className="inline-flex gap-0.5 text-lg font-extrabold tracking-wider text-[#4c7ef3] md:text-xl">
            {LETTERS.map((letter, i) => (
              <span key={i} data-jarvis-letter className="inline-block">
                {letter}
              </span>
            ))}
          </span>
          <span data-jarvis-bar className="mt-0.5 h-[3px] w-full rounded-full bg-[#2563eb]" />
        </span>
        {showSubtitle && (
          <span
            data-jarvis-sub
            className="text-xs font-semibold tracking-[0.2em] text-[#8a94a6]"
          >
            ADMIN
          </span>
        )}
      </div>
    );
  }

  return (
    <div ref={rootRef} className={`flex flex-col items-center gap-3 ${className}`}>
      <span className="inline-flex gap-2.5 text-3xl font-extrabold text-[#4c7ef3] md:text-4xl">
        {LETTERS.map((letter, i) => (
          <span key={i} data-jarvis-letter className="inline-block">
            {letter}
          </span>
        ))}
      </span>
      <div
        data-jarvis-bar
        className="h-1 w-[76px] rounded-full bg-[#2563eb] motion-safe:animate-[jarvisBar_2.2s_ease-in-out_infinite]"
      />
      {showSubtitle && (
        <div
          data-jarvis-sub
          className="mt-0.5 text-xs font-semibold tracking-[0.3em] text-[#8a94a6]"
        >
          ADMIN
        </div>
      )}
    </div>
  );
}
