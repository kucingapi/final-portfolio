"use client";

import { Check, ChevronDown } from "lucide-react";
import { useState } from "react";
import { FREE_NOTE, FREE_PICKS, PICKS, isFree, money, priceLabel, validModelId, type ModelInfo } from "@/lib/dashboard/assistant-models";
import { Button } from "./ui/button";
import { cn } from "./ui/cn";
import { Input } from "./ui/input";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "./ui/sheet";

/**
 * Picks an OpenRouter model: the suggested ones, the free ones, or any other by search or by pasting its
 * id, each with its live price and what one use of it costs (`use`: a draft by default).
 */

/** What one use is ("a draft") and how many tokens it takes, for the cost shown beside each model. */
export type Usage = { label: string; input: number; output: number };
export const DRAFT: Usage = { label: "a draft", input: 16_000, output: 1_000 };

export const costOf = (m: ModelInfo, use: Usage) => (use.input * m.input + use.output * m.output) / 1_000_000;
/** "≈$0.04 a draft", or "free". */
export const costLabel = (m: ModelInfo, use: Usage) => (isFree(m) ? "free" : `≈${money(costOf(m, use))} ${use.label}`);

export type Picker = { model: string; onModel: (id: string) => void; models?: ModelInfo[]; modelsError?: string | null };

export function ModelSheet({
  open,
  onOpenChange,
  picker,
  use = DRAFT,
  title = "Model",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  picker: Picker;
  use?: Usage;
  title?: string;
}) {
  const [query, setQuery] = useState("");
  const [allFree, setAllFree] = useState(false);
  const choose = (id: string) => {
    picker.onModel(id);
    onOpenChange(false);
  };
  const models = picker.models ?? [];
  const byId = new Map(models.map((m) => [m.id, m]));
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const found = words.length ? models.filter((m) => words.every((w) => `${m.id} ${m.name}`.toLowerCase().includes(w))).slice(0, 60) : [];
  // A typed id that isn't in the list (or with no list at all) can still be used.
  const typed = query.trim();
  const custom = validModelId(typed) && !byId.has(typed) ? typed : null;

  const free = models.filter(isFree);
  // Each free pick is the first live model its pattern matches; without a list, only the router (a fixed id).
  const freePicks = FREE_PICKS.flatMap((p) => {
    const m = free.find((x) => p.match.test(x.id));
    if (m) return [{ ...p, id: m.id, info: m as ModelInfo | undefined }];
    return !models.length && p.match.test("openrouter/free") ? [{ ...p, id: "openrouter/free", info: undefined }] : [];
  });
  const otherFree = free.filter((m) => !freePicks.some((p) => p.id === m.id));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>
            Any model on OpenRouter. Prices are per million tokens in / out; {use.label} is about {Math.round(use.input / 1000)}k in and{" "}
            {use.output >= 1000 ? `${use.output / 1000}k` : use.output} out.
          </SheetDescription>
        </SheetHeader>
        <SheetBody>
          <Group title="Suggested">
            {PICKS.map((p) => {
              const info = byId.get(p.id);
              return (
                <Card
                  key={p.id}
                  label={p.label}
                  tag={p.tag}
                  why={p.why}
                  price={info ? `${priceLabel(info)} · ${costLabel(info, use)}` : models.length ? "Not on OpenRouter under this id right now" : p.id}
                  selected={picker.model === p.id}
                  onClick={() => choose(p.id)}
                />
              );
            })}
            <p className="text-xs leading-snug text-muted-foreground">Picked on 14 Nov 2026 from LMArena&apos;s creative-writing ranking, weighed against price.</p>
          </Group>

          <Group title="Free">
            {freePicks.map((p) => (
              <Card
                key={p.id}
                label={p.label}
                tag={p.tag}
                why={p.why}
                price={p.info ? `Free · ${p.id}` : p.id}
                selected={picker.model === p.id}
                onClick={() => choose(p.id)}
              />
            ))}
            {models.length > 0 && !freePicks.length && <p className="text-[0.8125rem] text-muted-foreground">None of the suggested free models is served right now.</p>}
            <p className="text-xs leading-snug text-muted-foreground">{FREE_NOTE}</p>
            {otherFree.length > 0 && (
              <>
                <Button variant="link" className="self-start" onClick={() => setAllFree(!allFree)} aria-expanded={allFree}>
                  {allFree ? "Hide" : "Show"} all {free.length} free models
                  <ChevronDown className={cn("transition-transform", allFree && "rotate-180")} />
                </Button>
                {allFree && <List models={otherFree} use={use} selected={picker.model} onChoose={choose} />}
              </>
            )}
          </Group>

          <Group title="All models">
            <label htmlFor="model-search" className="sr-only">
              Search models
            </label>
            <Input id="model-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search, or paste an id like openai/gpt-6.1-sol" />
            {picker.modelsError && <p className="text-[0.8125rem] text-muted-foreground">{picker.modelsError}</p>}
            {custom && (
              <Button variant="secondary" className="self-start" onClick={() => choose(custom)}>
                Use {custom}
              </Button>
            )}
            {found.length > 0 && <List models={found} use={use} selected={picker.model} onChoose={choose} />}
            {words.length > 0 && !found.length && !custom && models.length ? <p className="text-[0.8125rem] text-muted-foreground">No model matches.</p> : null}
          </Group>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</h3>
      {children}
    </section>
  );
}

function Card({ label, tag, why, price, selected, onClick }: { label: string; tag: string; why: string; price: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className="flex w-full flex-col gap-1 rounded-xl border border-border bg-card p-3.5 text-left transition-colors duration-150 hover:bg-accent aria-pressed:border-primary"
    >
      <span className="flex items-center gap-2">
        <span className="text-[0.9375rem] font-semibold text-foreground">{label}</span>
        <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[0.6875rem] font-semibold text-primary">{tag}</span>
        {selected && <Check className="ml-auto size-4 text-primary" />}
      </span>
      <span className="text-[0.8125rem] leading-snug text-muted-foreground">{why}</span>
      <span className="truncate text-xs text-foreground/80 tabular-nums">{price}</span>
    </button>
  );
}

function List({ models, use, selected, onChoose }: { models: ModelInfo[]; use: Usage; selected: string; onChoose: (id: string) => void }) {
  return (
    <ul className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
      {models.map((m) => (
        <li key={m.id} className="border-b border-border last:border-b-0">
          <button type="button" onClick={() => onChoose(m.id)} className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors duration-150 hover:bg-accent">
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-foreground">{m.name}</span>
              <span className="block truncate text-xs text-muted-foreground">{m.id}</span>
            </span>
            <span className="shrink-0 text-right text-xs text-muted-foreground tabular-nums">
              {isFree(m) ? "free" : priceLabel(m)}
              {!isFree(m) && <span className="block">{costLabel(m, use)}</span>}
            </span>
            {selected === m.id && <Check className="size-4 shrink-0 text-primary" />}
          </button>
        </li>
      ))}
    </ul>
  );
}
