"use client";
import { useEffect, useRef } from "react";
import { gsap } from "gsap";

export default function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cursor = cursorRef.current;
    if (!cursor) return;

    gsap.set(cursor, { xPercent: -50, yPercent: -50 });

    const move = (e: MouseEvent): void => {
      gsap.to(cursor, {
        x: e.clientX,
        y: e.clientY,
        duration: 0.3,
        ease: "power2.out",
        overwrite: "auto",
      });
    };

    window.addEventListener("mousemove", move);

    // Hover states
    const links = document.querySelectorAll("a, button, [data-hover]");
    const cursorInner = cursor.querySelector("div");

    links.forEach((el) => {
      const handleLinkEnter = (): void => {
        gsap.to(cursorInner, {
          width: "20px",
          height: "20px",
          duration: 0.2,
          ease: "power3.out",
        });
      };

      const handleLinkLeave = (): void => {
        gsap.to(cursorInner, {
          width: "32px",
          height: "32px",
          duration: 0.3,
          ease: "power3.out",
        });
      };

      const handleMouseDown = (): void => {
        gsap.to(cursorInner, { width: "14px", height: "14px", duration: 0.1 });
      };

      const handleMouseUp = (): void => {
        gsap.to(cursorInner, { width: "20px", height: "20px", duration: 0.2 });
      };

      el.addEventListener("mouseenter", handleLinkEnter);
      el.addEventListener("mouseleave", handleLinkLeave);
      el.addEventListener("mousedown", handleMouseDown);
      el.addEventListener("mouseup", handleMouseUp);
    });

    return () => {
      window.removeEventListener("mousemove", move);
      // Clean up event listeners on links
      links.forEach((el) => {
        el.removeEventListener("mouseenter", () => {});
        el.removeEventListener("mouseleave", () => {});
        el.removeEventListener("mousedown", () => {});
        el.removeEventListener("mouseup", () => {});
      });
    };
  }, []);

  return (
    <div
      ref={cursorRef}
      className="fixed top-0 left-0 pointer-events-none z-[9999]"
      style={{ mixBlendMode: "difference" }}
    >
      <div className="relative w-8 h-8 border-[1px] border-white rounded-full flex items-center justify-center">
        <div className="w-1.5 h-1.5 bg-white rounded-full" />
      </div>
    </div>
  );
}
