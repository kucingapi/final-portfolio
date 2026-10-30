import Image from "next/image";
import type { Service } from "@/content/site";

const px = (n: number) => `calc(var(--s) * ${n})`;
const box = (x: number, y: number, w: number, h: number) => ({ left: px(x), top: px(y), width: px(w), height: px(h) });

/* Illustrations for the service cards (Figma 281:3618 / 281:3633 / 281:3703). Card-local px on a 387 card. */

function Design() {
  return (
    <>
      <div className="absolute" style={box(127, 129, 213.6, 151.6)}>
        <Image src="/figma/contact/design-pencil.svg" alt="" width={214} height={152} unoptimized className="block size-full max-w-none" />
      </div>
      {[
        { x: 75.94, y: 193.82, w: 101.2, h: 128.3, bar: 129.04 },
        { x: 46.83, y: 188.81, w: 137.23, h: 183.78, bar: 195.19 },
        { x: 40.65, y: 227.09, w: 111.83, h: 144.67, bar: 148.56 },
      ].map((b) => (
        <div key={b.y} className="absolute flex items-center justify-center" style={box(b.x, b.y, b.w, b.h)}>
          <div className="flex-none rotate-57 rounded-[calc(var(--s)*34)] bg-midnight-400" style={{ width: px(b.bar), height: px(36.87) }} />
        </div>
      ))}
    </>
  );
}

const WEB_ROWS: { y: number; bars: { w: number; c: string; x?: number }[] }[] = [
  { y: 159, bars: [{ w: 78, c: "bg-midnight-200" }, { w: 46, c: "bg-midnight-400" }] },
  { y: 175, bars: [{ w: 48, c: "bg-midnight-200" }, { w: 81, c: "bg-midnight-200" }, { w: 53, c: "bg-midnight-400" }] },
  { y: 191, bars: [{ w: 71, c: "bg-midnight-200" }, { w: 54, c: "bg-midnight-950" }, { w: 56, c: "bg-midnight-200" }] },
  { y: 207, bars: [{ w: 77, c: "bg-midnight-200" }] },
  { y: 223, bars: [{ w: 48, c: "bg-midnight-50" }, { w: 81, c: "bg-midnight-200" }, { w: 53, c: "bg-midnight-500" }] },
  { y: 239, bars: [{ w: 78, c: "bg-midnight-950" }, { w: 46, c: "bg-midnight-200" }, { w: 77, c: "bg-midnight-200" }] },
  { y: 255, bars: [{ w: 48, c: "bg-midnight-200" }, { w: 81, c: "bg-midnight-200" }, { w: 53, c: "bg-midnight-200" }] },
];

function Web() {
  return (
    <>
      <div className="absolute rounded-[calc(var(--s)*23)] border-[calc(var(--s)*5)] border-midnight-950 bg-midnight-900" style={box(59.5, 135, 254, 156)} />
      <div className="absolute" style={box(47.4, 291, 288.6, 76)}>
        <Image src="/figma/contact/web-keyboard.svg" alt="" width={289} height={76} unoptimized className="block size-full max-w-none" />
      </div>
      <div className="absolute flex flex-col gap-[calc(var(--s)*2)]" style={{ left: px(75.5), top: px(299) }}>
        {[0, 1, 2].map((i) => (
          <Image key={i} src="/figma/contact/web-keys-row.svg" alt="" width={223} height={9} unoptimized className="block h-9 w-[calc(var(--s)*222.5)] max-w-none" />
        ))}
        <Image src="/figma/contact/web-keys-row-last.svg" alt="" width={222} height={9} unoptimized className="block h-9 w-222 max-w-none" />
      </div>
      <div className="absolute" style={box(147.6, 345, 79.1, 12.5)}>
        <Image src="/figma/contact/web-trackpad.svg" alt="" width={80} height={13} unoptimized className="block size-full max-w-none" />
      </div>
      {WEB_ROWS.map((row) => (
        <div key={row.y} data-code-row className="absolute flex gap-9" style={{ left: px(77), top: px(row.y) }}>
          {row.bars.map((bar, i) => (
            <span key={i} className={`h-12 rounded-full ${bar.c}`} style={{ width: px(bar.w) }} />
          ))}
        </div>
      ))}
    </>
  );
}

function Mobile() {
  return (
    <>
      <div className="absolute rounded-[calc(var(--s)*17)] border-[calc(var(--s)*6)] border-midnight-950 bg-midnight-900" style={box(146, 135, 102, 197)} />
      <div className="absolute" style={box(168, 322, 57, 1)}>
        <Image src="/figma/contact/mobile-line.svg" alt="" width={57} height={2} unoptimized className="absolute -top-px block w-full max-w-none" />
      </div>
      <span className="absolute size-6 rounded-full bg-midnight-950" style={{ left: px(194), top: px(143) }} />
      <span className="absolute size-67 rounded-xs bg-midnight-500" style={{ left: px(163), top: px(152) }} />
      <div className="absolute flex flex-col gap-3" style={{ left: px(163), top: px(231) }}>
        {[39, 67, 51, 62, 39, 39, 67, 51, 62].map((w, i) => (
          <span key={i} data-code-row className="h-7 rounded-[calc(var(--s)*7)] bg-midnight-600" style={{ width: px(w) }} />
        ))}
      </div>
    </>
  );
}

export function ServiceArt({ service }: { service: Service }) {
  if (service === "Design") return <Design />;
  if (service === "Web") return <Web />;
  if (service === "Mobile") return <Mobile />;
  return null;
}
