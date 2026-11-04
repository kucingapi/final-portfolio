"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Button } from "./ui/button";
import { cn } from "./ui/cn";
import { toast } from "./ui/toaster";

export function CopyButton({ text, label = "Copy", className }: { text: string; label?: string; className?: string }) {
  const [done, setDone] = useState(false);
  return (
    <Button
      size="sm"
      variant="secondary"
      className={className}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          toast.success("Copied");
          setTimeout(() => setDone(false), 1500);
        } catch {
          toast.error("Couldn't copy. Select the text and copy it instead.");
        }
      }}
    >
      {done ? <Check /> : <Copy />}
      {label}
    </Button>
  );
}

/** A read-only field to paste somewhere else, with its length against the form's limit. */
export function CopyField({ label, value, limit }: { label: string; value: string; limit?: number }) {
  const over = limit !== undefined && value.length > limit;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className="flex items-center gap-3">
          <span className={cn("text-xs tabular-nums", over ? "font-semibold text-destructive" : "text-muted-foreground")}>
            {value.length}
            {limit !== undefined && ` / ${limit}`}
            {over && " · too long"}
          </span>
          <CopyButton text={value} />
        </span>
      </div>
      <p className="rounded-lg border border-border bg-muted px-3.5 py-3 text-sm leading-relaxed whitespace-pre-wrap text-foreground">{value}</p>
    </div>
  );
}

/** Chips for a list field (skills, tools, roles), copyable as one comma-separated line. */
export function CopyList({ label, items, limit }: { label: string; items: string[]; limit?: number }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground tabular-nums">
            {items.length}
            {limit !== undefined && ` / ${limit}`}
          </span>
          <CopyButton text={items.join(", ")} />
        </span>
      </div>
      <ul className="flex flex-wrap gap-2">
        {items.map((item) => (
          <li key={item} className="rounded-full border border-border bg-muted px-3 py-1 text-[0.8125rem] text-foreground">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
