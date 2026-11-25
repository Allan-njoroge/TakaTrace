import { useId } from "react";
import { cn } from "../../lib/cn";

export type SealVariant = "verified" | "failed" | "neutral";

export interface SealProps {
  variant?: SealVariant;
  size?: number;
  /** Continuous slow rotation, used over the hero photo on Home. */
  spin?: boolean;
  /** One-time stamp-in animation, used for the verify result's orchestrated moment. */
  stamp?: boolean;
  className?: string;
}

const variantConfig: Record<SealVariant, { ring: string; text: string; label: string }> = {
  verified: { ring: "#17251F", text: "#17251F", label: "Verified on-chain • SDG 12.5 • TakaTrace •" },
  failed: { ring: "#B4382B", text: "#B4382B", label: "Record changed • Does not match • TakaTrace •" },
  neutral: { ring: "#5E6E67", text: "#5E6E67", label: "Not verified • TakaTrace •" },
};

/** The signature circular "Verified on-chain" badge (spec 4.6). */
export function Seal({ variant = "verified", size = 120, spin = false, stamp = false, className }: SealProps) {
  const pathId = useId();
  const radius = size / 2;
  const textRadius = radius - 10;

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      className={cn(spin && "seal-spin", stamp && "seal-stamp", className)}
      role="img"
      aria-label={variant === "verified" ? "Verified on-chain seal" : variant === "failed" ? "Record changed seal" : "Not yet verified seal"}
    >
      <circle cx={radius} cy={radius} r={radius - 2} fill="#FFFFFF" stroke={variantConfig[variant].ring} strokeWidth={1} />
      <path
        id={pathId}
        d={`M ${radius},${radius} m -${textRadius},0 a ${textRadius},${textRadius} 0 1,1 ${textRadius * 2},0 a ${textRadius},${textRadius} 0 1,1 -${textRadius * 2},0`}
        fill="none"
        aria-hidden="true"
      />
      <text fontSize={size * 0.075} letterSpacing="0.5" fill={variantConfig[variant].text} aria-hidden="true">
        <textPath href={`#${pathId}`}>{variantConfig[variant].label.repeat(2)}</textPath>
      </text>
      <circle cx={radius} cy={radius} r={radius * 0.32} fill="#2E5B4C" />
      <text
        x={radius}
        y={radius}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={size * 0.15}
        fontWeight={700}
        fill="#C8EE7E"
        aria-hidden="true"
      >
        TT
      </text>
    </svg>
  );
}
