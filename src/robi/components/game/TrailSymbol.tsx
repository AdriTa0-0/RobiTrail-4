import React from "react";
import type { TrailIconType } from "../../data/trails/trails";

interface TrailSymbolProps {
  type: TrailIconType;
  className?: string;
  active?: boolean;
}

export const TrailSymbol: React.FC<TrailSymbolProps> = ({
  type,
  className = "w-6 h-6",
  active = false,
}) => {
  const stroke = "currentColor";
  const pulseClass = active ? "transition-transform duration-300 scale-110" : "";

  switch (type) {
    case "message-route":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className={`${className} ${pulseClass}`}
          stroke={stroke}
          strokeWidth="1.8"
        >
          <rect x="2.5" y="5" width="5" height="10" rx="1" />
          <rect x="16.5" y="9" width="5" height="10" rx="1" />
          <path d="M7.5 9c3 0 3.5 5 9 5" strokeDasharray="2 2" />
          <circle cx="12" cy="11.5" r="1.6" fill={stroke} />
        </svg>
      );
    case "signal-tower":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className={`${className} ${pulseClass}`}
          stroke={stroke}
          strokeWidth="1.8"
        >
          <path d="M12 6v14M8.5 20l3.5-10 3.5 10M9.5 15h5" strokeLinecap="round" />
          <circle cx="12" cy="6" r="1.5" fill={stroke} />
          <path d="M8.5 4.2a5 5 0 0 0 0 4.5M15.5 4.2a5 5 0 0 1 0 4.5" strokeLinecap="round" />
          <path
            d="M6 2.5a8.5 8.5 0 0 0 0 8M18 2.5a8.5 8.5 0 0 1 0 8"
            strokeLinecap="round"
            opacity="0.6"
          />
        </svg>
      );
    case "phone-rescue":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className={`${className} ${pulseClass}`}
          stroke={stroke}
          strokeWidth="1.8"
        >
          <rect x="6" y="2.5" width="12" height="19" rx="2.5" />
          <path d="M10 18.5h4" strokeLinecap="round" />
          <path d="M9.5 11.5v2M12 9.5v4M14.5 7.5v6" strokeLinecap="round" />
        </svg>
      );
    case "data-meter":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className={`${className} ${pulseClass}`}
          stroke={stroke}
          strokeWidth="1.8"
        >
          <path d="M4 16a8 8 0 1 1 16 0" strokeLinecap="round" />
          <path d="M12 16l4-5.5" strokeLinecap="round" />
          <circle cx="12" cy="16" r="1.5" fill={stroke} />
          <path d="M7 19h10" strokeLinecap="round" />
        </svg>
      );
    case "community-nodes":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className={`${className} ${pulseClass}`}
          stroke={stroke}
          strokeWidth="1.8"
        >
          <circle cx="12" cy="6" r="2.5" />
          <circle cx="5.5" cy="17.5" r="2.5" />
          <circle cx="18.5" cy="17.5" r="2.5" />
          <path d="M10.5 8.2L7 15.2M13.5 8.2l3.5 7M8 17.5h8" />
        </svg>
      );
    case "speed-vs-data":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className={`${className} ${pulseClass}`}
          stroke={stroke}
          strokeWidth="1.8"
        >
          <path d="M4 7h16M4 12h10M4 17h13" strokeLinecap="round" />
          <path d="M18 10l2.5 2.5L18 15" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "busy-sector":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className={`${className} ${pulseClass}`}
          stroke={stroke}
          strokeWidth="1.8"
        >
          <path d="M12 3v4M12 7l-6 4v9h12v-9l-6-4z" strokeLinejoin="round" />
          <path d="M9 14h2M13 14h2M9 17h6" strokeLinecap="round" />
        </svg>
      );
    case "channel-choice":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className={`${className} ${pulseClass}`}
          stroke={stroke}
          strokeWidth="1.8"
        >
          <rect x="3" y="4" width="11" height="8" rx="2" />
          <path d="M6 12l-1.5 3 3.5-1.5" strokeLinejoin="round" />
          <circle cx="17.5" cy="16.5" r="3.5" />
          <path d="M17.5 14.8v1.7l1.2 1" strokeLinecap="round" />
        </svg>
      );
    case "fault-trace":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className={`${className} ${pulseClass}`}
          stroke={stroke}
          strokeWidth="1.8"
        >
          <circle cx="5" cy="12" r="2.2" />
          <circle cx="19" cy="12" r="2.2" />
          <path d="M7.2 12h3l1.8-4 2 8 1.5-4h1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "obstacle-wave":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className={`${className} ${pulseClass}`}
          stroke={stroke}
          strokeWidth="1.8"
        >
          <path d="M11 4h3v16h-3z" />
          <path
            d="M4 9c1.5 1.8 1.5 4.2 0 6M7 7.5c2.2 2.8 2.2 6.2 0 9M17.5 10c1 1.2 1 2.8 0 4"
            strokeLinecap="round"
          />
        </svg>
      );
    case "budget-slider":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className={`${className} ${pulseClass}`}
          stroke={stroke}
          strokeWidth="1.8"
        >
          <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
          <circle cx="9" cy="7" r="2" fill="white" />
          <circle cx="15" cy="12" r="2" fill="white" />
          <circle cx="10" cy="17" r="2" fill="white" />
        </svg>
      );
    case "community-mesh":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className={`${className} ${pulseClass}`}
          stroke={stroke}
          strokeWidth="1.8"
        >
          <rect x="3" y="4" width="6" height="5" rx="1" />
          <rect x="15" y="4" width="6" height="5" rx="1" />
          <rect x="9" y="15" width="6" height="5" rx="1" />
          <path d="M9 6.5h6M6 9v3.5l3 3.5M18 9v3.5L15 16" />
        </svg>
      );
    case "packet-stages":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className={`${className} ${pulseClass}`}
          stroke={stroke}
          strokeWidth="1.8"
        >
          <path d="M3 12c1.5-4 3-4 4.5 0s3 4 4.5 0 3-4 4.5 0 3 4 4.5 0" strokeLinecap="round" />
          <circle cx="7.5" cy="12" r="1.2" fill={stroke} />
          <circle cx="16.5" cy="12" r="1.2" fill={stroke} />
        </svg>
      );
    case "digital-clock":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className={`${className} ${pulseClass}`}
          stroke={stroke}
          strokeWidth="1.8"
        >
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 7.5V12l3.2 2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "capstone-grid":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className={`${className} ${pulseClass}`}
          stroke={stroke}
          strokeWidth="1.8"
        >
          <polygon points="12,3 20,7.5 20,16.5 12,21 4,16.5 4,7.5" strokeLinejoin="round" />
          <circle cx="12" cy="12" r="2.2" fill={stroke} />
          <path d="M12 3v6.8M20 16.5l-6-3.4M4 16.5l6-3.4" />
        </svg>
      );
  }
};
