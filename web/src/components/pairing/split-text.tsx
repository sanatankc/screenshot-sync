import { useMemo, useRef, type ElementType } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { cn } from "@/lib/utils";

type SplitTextProps = {
  text: string;
  className?: string;
  delay?: number;
  duration?: number;
  ease?: string;
  splitType?: "chars" | "words";
  from?: gsap.TweenVars;
  to?: gsap.TweenVars;
  tag?: ElementType;
};

export function SplitText({
  text,
  className,
  delay = 45,
  duration = 0.8,
  ease = "power3.out",
  splitType = "chars",
  from = { opacity: 0, y: 36, rotateX: -35 },
  to = { opacity: 1, y: 0, rotateX: 0 },
  tag = "p",
}: SplitTextProps) {
  const ref = useRef<HTMLElement | null>(null);
  const hasAnimatedRef = useRef(false);
  const segments = useMemo(() => {
    if (splitType === "words") {
      return text.split(/(\s+)/);
    }
    return Array.from(text);
  }, [splitType, text]);

  useGSAP(
    () => {
      if (!ref.current || hasAnimatedRef.current) {
        return;
      }

      const targets = ref.current.querySelectorAll("[data-split-segment]");
      gsap.set(targets, from);
      gsap.to(targets, {
        ...to,
        duration,
        ease,
        stagger: delay / 1000,
        onComplete: () => {
          hasAnimatedRef.current = true;
        },
      });
    },
    { scope: ref, dependencies: [] },
  );

  const Tag = tag as ElementType;

  return (
    <Tag ref={ref as never} className={cn("[perspective:1000px]", className)}>
      {segments.map((segment, index) => (
        <span
          key={`${segment}-${index}`}
          data-split-segment
          className={cn(
            "inline-block will-change-transform",
            segment.trim().length === 0 && "whitespace-pre",
          )}
        >
          {segment}
        </span>
      ))}
    </Tag>
  );
}
