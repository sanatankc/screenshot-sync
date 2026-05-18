import { motion } from "motion/react";
import { PUBLIC_APP_CONFIG } from "@/lib/public-app-config";

const TOP_LEFT_PATH = "M95 138.314V82C95 81.4477 95.4477 81 96 81H137.981";
const BOTTOM_LEFT_PATH = "M95 164.938V217.448C95 218.001 95.4477 218.448 96 218.448H137.981";
const TOP_RIGHT_HORIZONTAL_PATH = "M162.155 81H205C205.552 81 206 81.4477 206 82";
const BOTTOM_RIGHT_HORIZONTAL_PATH = "M162.155 218.448H205C205.552 218.448 206 218.001 206 217.448";
const TOP_RIGHT_VERTICAL_C_PATH = "M206 108.838V82";
const TOP_RIGHT_VERTICAL_FRAME_PATH = "M206 138.314V82";
const BOTTOM_RIGHT_VERTICAL_C_PATH = "M206 191.562V217.448";
const BOTTOM_RIGHT_VERTICAL_FRAME_PATH = "M206 164.938V217.448";

type AppLoaderProps = {
  label?: string;
};

export function AppLoader({ label = "Restoring your workspace…" }: AppLoaderProps) {
  return (
    <section className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-background text-foreground">
      <div className="relative flex items-center justify-center">
        <motion.svg
          className="size-24 text-foreground sm:size-28"
          viewBox="0 0 300 300"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          role="img"
          initial={{ opacity: 0.82, scale: 0.985 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        >
          <title>{label || PUBLIC_APP_CONFIG.appName}</title>
          <g
            stroke="currentColor"
            strokeWidth="14"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d={TOP_LEFT_PATH} />
            <path d={BOTTOM_LEFT_PATH} />
            <path d={TOP_RIGHT_HORIZONTAL_PATH} />
            <path d={BOTTOM_RIGHT_HORIZONTAL_PATH} />
            <motion.path
              d={TOP_RIGHT_VERTICAL_C_PATH}
              animate={{ d: [TOP_RIGHT_VERTICAL_C_PATH, TOP_RIGHT_VERTICAL_FRAME_PATH, TOP_RIGHT_VERTICAL_C_PATH] }}
              transition={{
                duration: 1.9,
                ease: [0.45, 0, 0.2, 1],
                repeat: Infinity,
                repeatType: "loop",
              }}
            />
            <motion.path
              d={BOTTOM_RIGHT_VERTICAL_C_PATH}
              animate={{ d: [BOTTOM_RIGHT_VERTICAL_C_PATH, BOTTOM_RIGHT_VERTICAL_FRAME_PATH, BOTTOM_RIGHT_VERTICAL_C_PATH] }}
              transition={{
                duration: 1.9,
                ease: [0.45, 0, 0.2, 1],
                repeat: Infinity,
                repeatType: "loop",
              }}
            />
          </g>
        </motion.svg>
      </div>
    </section>
  );
}
