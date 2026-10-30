import Image from "next/image";
import type { CSSProperties, ElementType, ReactNode } from "react";

/**
 * Section title with the asymmetric highlight bar behind it (Figma "Frame 159").
 * Bar geometry is in `em` so it follows the title size: it starts slightly left of
 * the text, overhangs on the right and sits across the lower half of the glyphs.
 */
export function Heading({
  as: Tag = "h2",
  children,
  className = "",
  size = "text-h2",
  barTop = "0.875em",
  barHeight = "0.55em",
  barLeft = "-0.14em",
  barRight = "-0.3em",
}: {
  as?: ElementType;
  children: ReactNode;
  className?: string;
  size?: string;
  barTop?: string;
  barHeight?: string;
  barLeft?: string;
  barRight?: string;
}) {
  return (
    <div data-heading className={`relative inline-block w-fit ${size} ${className}`}>
      <span
        data-highlight
        aria-hidden
        className="highlight-bar absolute"
        style={{ top: barTop, height: barHeight, left: barLeft, right: barRight } as CSSProperties}
      />
      <Tag data-title className="relative font-semibold whitespace-nowrap text-midnight-50">
        {children}
      </Tag>
    </div>
  );
}

/**
 * A decorative Figma vector placed on the 1440 canvas. `box` is the Figma node box;
 * `bleed` is the exported image's overhang around it (Figma's `inset-[…]` on the img),
 * as CSS `inset` percentages.
 */
export function Deco({
  src,
  className = "",
  bleed,
  width,
  height,
  ...rest
}: {
  src: string;
  className?: string;
  bleed?: string;
  width: number;
  height: number;
  [data: `data-${string}`]: string | undefined;
}) {
  return (
    <div aria-hidden className={`pointer-events-none absolute ${className}`} {...rest}>
      <div className="absolute" style={{ inset: bleed ?? "0" }}>
        <Image src={src} alt="" width={width} height={height} unoptimized className="block size-full max-w-none" />
      </div>
    </div>
  );
}

/** Pill label (Figma "WF Chip"). */
export function Chip({
  children,
  tone = "light",
  className = "",
  ...rest
}: {
  children: ReactNode;
  tone?: "light" | "teal" | "olive";
  className?: string;
  [data: `data-${string}`]: string | undefined;
}) {
  const tones = {
    light: "bg-white text-base-900 font-bold",
    teal: "bg-chip-teal text-white border-2 border-white",
    olive: "bg-chip-olive text-white border-2 border-white",
  };
  return (
    <span
      className={`inline-flex h-40 items-center rounded-full px-16 font-inter text-chip tracking-[-0.01em] whitespace-nowrap ${tones[tone]} ${className}`}
      {...rest}
    >
      {children}
    </span>
  );
}

/** Square arrow button used for "More Detail" and the contact steps. */
export function ArrowIcon({ className = "" }: { className?: string }) {
  return <Image src="/figma/icons/arrow-right.svg" alt="" width={72} height={72} unoptimized className={className} />;
}

export function Section({
  children,
  className = "",
  canvasClassName = "",
  id,
  label,
  nodeId,
}: {
  children: ReactNode;
  className?: string;
  canvasClassName?: string;
  id?: string;
  label?: string;
  nodeId?: string;
}) {
  return (
    <section id={id} aria-label={label} data-node-id={nodeId} className={`relative overflow-clip ${className}`}>
      <div data-canvas className={`relative mx-auto w-1440 max-md:w-full ${canvasClassName}`}>
        {children}
      </div>
    </section>
  );
}
