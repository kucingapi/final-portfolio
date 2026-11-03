"use client";

import { useState } from "react";

export function CopyButton({ text, label = "Copy", className = "" }: { text: string; label?: string; className?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
      className={`shrink-0 rounded-xs border border-midnight-900 px-12 py-4 text-chip text-midnight-100 hover:bg-midnight-900 ${className}`}
    >
      {done ? "Copied" : label}
    </button>
  );
}

/** A read-only field to paste somewhere else, with its length against the form's limit. */
export function CopyField({ label, value, limit }: { label: string; value: string; limit?: number }) {
  const over = limit !== undefined && value.length > limit;
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-12 text-chip">
        <span className="text-midnight-200">{label}</span>
        <span className="flex items-center gap-12">
          <span className={over ? "font-semibold text-[#ff9b9b]" : "text-midnight-200"}>
            {value.length}
            {limit !== undefined && ` / ${limit}`}
            {over && " (too long)"}
          </span>
          <CopyButton text={value} />
        </span>
      </div>
      <p className="rounded-xs bg-base-900 px-16 py-12 text-body leading-[1.5] whitespace-pre-wrap text-midnight-50">{value}</p>
    </div>
  );
}

/** Chips for a list field (skills, tools, roles), copyable as one comma-separated line. */
export function CopyList({ label, items, limit }: { label: string; items: string[]; limit?: number }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-12 text-chip">
        <span className="text-midnight-200">{label}</span>
        <span className="flex items-center gap-12">
          <span className="text-midnight-200">
            {items.length}
            {limit !== undefined && ` / ${limit}`}
          </span>
          <CopyButton text={items.join(", ")} />
        </span>
      </div>
      <ul className="flex flex-wrap gap-8">
        {items.map((item) => (
          <li key={item} className="rounded-xs bg-base-900 px-12 py-4 text-chip text-midnight-50">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
