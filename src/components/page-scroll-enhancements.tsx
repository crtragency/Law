"use client";

import { ArrowUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function PageScrollEnhancements() {
  const [showScrollTop, setShowScrollTop] = useState(false);
  const progressBarRef = useRef<HTMLSpanElement>(null);
  const scrollTopVisibilityRef = useRef(false);

  useEffect(() => {
    let animationFrame = 0;

    const updateScrollState = () => {
      cancelAnimationFrame(animationFrame);
      animationFrame = requestAnimationFrame(() => {
        const scrollRange = Math.max(
          document.documentElement.scrollHeight - window.innerHeight,
          1,
        );

        if (progressBarRef.current) {
          progressBarRef.current.style.transform = `scaleX(${Math.min(window.scrollY / scrollRange, 1)})`;
        }

        const shouldShowScrollTop = window.scrollY > 320;
        if (shouldShowScrollTop !== scrollTopVisibilityRef.current) {
          scrollTopVisibilityRef.current = shouldShowScrollTop;
          setShowScrollTop(shouldShowScrollTop);
        }
      });
    };

    updateScrollState();
    window.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);

    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, []);

  return (
    <>
      <div className="page-scroll-progress" aria-hidden="true">
        <span ref={progressBarRef} style={{ transform: "scaleX(0)" }} />
      </div>
      <button
        type="button"
        className={`scroll-to-top ${showScrollTop ? "scroll-to-top-visible" : ""}`}
        aria-label="العودة إلى أعلى الصفحة"
        title="العودة إلى أعلى الصفحة"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      >
        <ArrowUp aria-hidden="true" size={19} strokeWidth={2.1} />
      </button>
    </>
  );
}
