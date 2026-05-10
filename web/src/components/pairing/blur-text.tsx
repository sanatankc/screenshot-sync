import { useRef } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { cn } from "@/lib/utils";

type BlurTextProps = {
  text: string;
  className?: string;
  delay?: number;
};

export function BlurText({ text, className, delay = 0.35 }: BlurTextProps) {
  const ref = useRef<HTMLParagraphElement | null>(null);
  const hasAnimatedRef = useRef(false);

  useGSAP(
    () => {
      if (!ref.current || hasAnimatedRef.current) {
        return;
      }

      gsap.fromTo(
        ref.current,
        { opacity: 0, filter: "blur(18px)", y: 16 },
        {
          opacity: 1,
          filter: "blur(0px)",
          y: 0,
          duration: 1,
          delay,
          ease: "power3.out",
          onComplete: () => {
            hasAnimatedRef.current = true;
          },
        },
      );
    },
    { scope: ref, dependencies: [] },
  );

  return (
    <p ref={ref} className={cn("opacity-0", className)}>
      {text}
    </p>
  );
}
