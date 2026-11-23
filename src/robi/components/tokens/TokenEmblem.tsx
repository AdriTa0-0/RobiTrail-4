import React, { useEffect, useRef, useState } from "react";

interface TokenEmblemProps {
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

const SIZE_MAP = {
  xs: 16,
  sm: 20,
  md: 28,
  lg: 44,
} as const;

export const TokenEmblem: React.FC<TokenEmblemProps> = ({ size = "sm", className = "" }) => {
  const px = SIZE_MAP[size];
  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 36 36"
      fill="none"
      aria-hidden="true"
      className={`shrink-0 inline-block ${className}`}
    >
      <defs>
        <linearGradient
          id="rt-token-rim"
          x1="4"
          y1="4"
          x2="32"
          y2="32"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#F59E0B" />
          <stop offset="55%" stopColor="#E11D48" />
          <stop offset="100%" stopColor="#9F1239" />
        </linearGradient>
        <linearGradient
          id="rt-token-core"
          x1="8"
          y1="6"
          x2="28"
          y2="30"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#FFFBEB" />
          <stop offset="100%" stopColor="#FDE68A" />
        </linearGradient>
      </defs>
      <circle cx="18" cy="18" r="16" fill="url(#rt-token-rim)" />
      <circle
        cx="18"
        cy="18"
        r="12.5"
        fill="url(#rt-token-core)"
        stroke="#B45309"
        strokeWidth="1.2"
      />
      <path
        d="M18 10.2L24.5 18L18 25.8L11.5 18L18 10.2Z"
        fill="#E11D48"
        stroke="#9F1239"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
      <circle cx="18" cy="18" r="2.2" fill="#FFFBEB" />
    </svg>
  );
};

interface AnimatedTokenCountProps {
  value: number;
  className?: string;
}

export const AnimatedTokenCount: React.FC<AnimatedTokenCountProps> = ({
  value,
  className = "",
}) => {
  const [displayed, setDisplayed] = useState(value);
  const prevRef = useRef(value);

  useEffect(() => {
    const startVal = prevRef.current;
    const endVal = value;
    if (startVal === endVal) {
      setDisplayed(endVal);
      return undefined;
    }

    let frameId = 0;
    const durationMs = 260;
    const startTs = performance.now();

    const step = (now: number) => {
      const elapsed = Math.min(1, (now - startTs) / durationMs);
      const eased = 1 - Math.pow(1 - elapsed, 3);
      const next = Math.round(startVal + (endVal - startVal) * eased);
      setDisplayed(next);
      if (elapsed < 1) {
        frameId = window.requestAnimationFrame(step);
      } else {
        prevRef.current = endVal;
      }
    };

    frameId = window.requestAnimationFrame(step);
    return () => {
      window.cancelAnimationFrame(frameId);
      prevRef.current = endVal;
    };
  }, [value]);

  return <span className={`font-mono-num ${className}`}>{displayed}</span>;
};
