"use client";

import { ArrowDown, ArrowUp, ChevronRight, Plus, X } from "lucide-react";
import Image from "next/image";
import { createContext, useContext, useId, useState } from "react";
import type { z } from "zod";
import type { FieldMeta } from "@/lib/content/schema";
import { Button } from "../ui/button";
import { cn } from "../ui/cn";
import { Input } from "../ui/input";
import { Switch } from "../ui/switch";

/**
 * A form for any content document, laid out from its zod schema (src/lib/content/schema.ts): objects
 * become groups, lists become items you can add, move and remove, enums become selects or toggles. A
 * field added to the schema shows up here with no form code. Lists open one item at a time, so a long
 * document stays quick to render.
 */

type Path = (string | number)[];
type Schema = z.ZodType;
type Ctx = { set: (path: Path, value: unknown) => void; issues: Record<string, string> };

const EditorContext = createContext<Ctx>({ set: () => {}, issues: {} });

export const toPointer = (path: Path) => path.map((p) => "/" + String(p).replaceAll("~", "~0").replaceAll("/", "~1")).join("");

/** Immutable set: copies only the objects along `path`. `undefined` removes an object key. */
export function setIn(root: unknown, path: Path, value: unknown): unknown {
  if (!path.length) return value;
  const [key, ...rest] = path;
  const node = (root ?? (typeof key === "number" ? [] : {})) as Record<string | number, unknown>;
  const copy = (Array.isArray(node) ? [...node] : { ...node }) as Record<string | number, unknown>;
  const next = setIn(node[key], rest, value);
  if (next === undefined && !Array.isArray(copy)) delete copy[key];
  else copy[key] = next;
  return copy;
}

/* ── Reading the schema ───────────────────────────────────────────────── */

type Def = { type: string; shape?: Record<string, Schema>; element?: Schema; options?: unknown[]; values?: Set<unknown> };
const def = (s: Schema) => s as unknown as Def & { unwrap?: () => Schema };

function unwrap(s: Schema): { schema: Schema; optional: boolean } {
  let schema = s;
  let optional = false;
  while (["optional", "nullable", "default"].includes(schema.type)) {
    if (schema.type !== "default") optional = true;
    schema = def(schema).unwrap!();
  }
  return { schema, optional };
}

const metaOf = (s: Schema) => ((s as unknown as { meta: () => FieldMeta | undefined }).meta() ?? {}) as FieldMeta;
const literals = (s: Schema) => (def(s).options as Schema[]).flatMap((o) => (o.type === "literal" ? [...(def(o).values ?? [])] : []));

const words = (key: string) => {
  const spaced = key.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
};
const singular = (label: string) => (/ies$/.test(label) ? label.replace(/ies$/, "y") : /s$/.test(label) ? label.slice(0, -1) : "");

/** What names a list item in its row, first match wins: a bullet reads by its text, not its id. */
const ITEM_KEYS = ["title", "name", "label", "heading", "role", "org", "quote", "text", "slug", "id"];
function itemLabel(value: unknown, i: number): string {
  const hit =
    typeof value === "string"
      ? value.trim()
      : value && typeof value === "object"
        ? ITEM_KEYS.map((k) => (value as Record<string, unknown>)[k]).find((v) => typeof v === "string" && v.trim())
        : undefined;
  if (typeof hit === "string" && hit) return hit.length > 70 ? `${hit.slice(0, 67)}…` : hit;
  return `Item ${i + 1}`;
}

/** A fresh value for a schema, for "Add": empty strings, the first option, no optional fields. */
export function emptyOf(s: Schema): unknown {
  const { schema, optional } = unwrap(s);
  if (optional && s.type === "optional") return undefined;
  const d = def(schema);
  switch (schema.type) {
    case "object":
      return Object.fromEntries(
        Object.entries(d.shape!)
          .map(([k, v]) => [k, emptyOf(v)] as const)
          .filter(([, v]) => v !== undefined),
      );
    case "array":
      return [];
    case "number":
      return 0;
    case "boolean":
      return false;
    case "enum":
      return d.options![0];
    case "union":
      return literals(schema)[0] ?? emptyOf(d.options![0] as Schema);
    case "literal":
      return [...(d.values ?? [])][0];
    default:
      return "";
  }
}

const hasIssueUnder = (issues: Record<string, string>, path: Path) => {
  const p = toPointer(path);
  return Object.keys(issues).some((k) => k === p || k.startsWith(p + "/"));
};

/* ── Root ─────────────────────────────────────────────────────────────── */

export function Editor({
  schema,
  value,
  onChange,
  issues,
}: {
  schema: Schema;
  value: unknown;
  /** Called with an update, so several changes before a re-render all land. */
  onChange: (update: (previous: unknown) => unknown) => void;
  issues: Record<string, string>;
}) {
  const set = (path: Path, next: unknown) => onChange((previous) => setIn(previous, path, next));
  const shape = def(unwrap(schema).schema).shape!;
  const keys = Object.keys(shape);
  const root = (value ?? {}) as Record<string, unknown>;

  return (
    <EditorContext value={{ set, issues }}>
      {keys.length === 1 && unwrap(shape[keys[0]]).schema.type === "array" ? (
        // A document that is one list (the projects): show the list itself.
        <Node schema={shape[keys[0]]} value={root[keys[0]]} path={[keys[0]]} name={keys[0]} bare />
      ) : (
        <div className="flex flex-col gap-3">
          {keys.map((k, i) => (
            <Section key={k} schema={shape[k]} value={root[k]} path={[k]} name={k} startOpen={i === 0} />
          ))}
        </div>
      )}
    </EditorContext>
  );
}

/** A top-level part of a document, as a card that opens and closes. */
function Section({ schema, value, path, name, startOpen }: { schema: Schema; value: unknown; path: Path; name: string; startOpen: boolean }) {
  const [open, setOpen] = useState(startOpen);
  const { issues } = useContext(EditorContext);
  const meta = metaOf(unwrap(schema).schema);
  const id = useId();
  return (
    <section className="rounded-xl border border-border bg-card">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
      >
        <ChevronRight className={cn("size-4 shrink-0 text-muted-foreground transition-transform duration-150", open && "rotate-90")} />
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-foreground">{meta.title ?? words(name)}</span>
          {meta.description && <span className="mt-0.5 block text-[0.8125rem] leading-snug text-muted-foreground">{meta.description}</span>}
        </span>
        {hasIssueUnder(issues, path) && <IssueDot />}
      </button>
      {open && (
        <div id={id} className="border-t border-border px-4 pt-4 pb-5">
          <Node schema={schema} value={value} path={path} name={name} bare />
        </div>
      )}
    </section>
  );
}

const IssueDot = () => <span aria-label="Has problems" className="size-2 shrink-0 rounded-full bg-destructive" />;

/* ── Fields ───────────────────────────────────────────────────────────── */

/** One field of any kind. `bare` drops the label, for a section that already shows it. */
function Node({ schema: raw, value, path, name, bare = false }: { schema: Schema; value: unknown; path: Path; name: string; bare?: boolean }) {
  const { set, issues } = useContext(EditorContext);
  const { schema, optional } = unwrap(raw);
  const meta = metaOf(schema);
  const label = meta.title ?? words(name);
  const issue = issues[toPointer(path)];

  if (optional && value === undefined) {
    return (
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        {meta.description && <Hint>{meta.description}</Hint>}
        <Button variant="outline" size="sm" className="self-start" onClick={() => set(path, emptyOf(schema))}>
          <Plus />
          Add {label.toLowerCase()}
        </Button>
      </div>
    );
  }
  const remove = optional ? () => set(path, undefined) : undefined;

  switch (schema.type) {
    case "object":
      return <ObjectField schema={schema} value={value} path={path} label={label} meta={meta} bare={bare} onRemove={remove} />;
    case "array":
      return <ArrayField schema={schema} value={value} path={path} label={label} meta={meta} bare={bare} onRemove={remove} />;
    default:
      return <Leaf schema={schema} value={value} path={path} label={label} meta={meta} issue={issue} onRemove={remove} bare={bare} />;
  }
}

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="text-[0.8125rem] leading-snug text-muted-foreground">{children}</p>;
}

function Heading({ label, meta, onRemove }: { label: string; meta: FieldMeta; onRemove?: () => void }) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-foreground">{label}</span>
        {onRemove && (
          <Button variant="link" size="sm" className="ml-auto text-xs" onClick={onRemove}>
            Remove
          </Button>
        )}
      </div>
      {meta.description && <Hint>{meta.description}</Hint>}
    </div>
  );
}

type GroupProps = { schema: Schema; value: unknown; path: Path; label: string; meta: FieldMeta; bare: boolean; onRemove?: () => void };

function ObjectField({ schema, value, path, label, meta, bare, onRemove }: GroupProps) {
  const shape = def(schema).shape!;
  const obj = (value ?? {}) as Record<string, unknown>;
  const fields = (
    <div className="flex flex-col gap-5">
      {Object.entries(shape).map(([k, s]) => (
        <Node key={k} schema={s} value={obj[k]} path={[...path, k]} name={k} />
      ))}
    </div>
  );
  if (bare) return fields;
  if (meta.advanced) return <Advanced label={label} meta={meta} path={path} onRemove={onRemove}>{fields}</Advanced>;
  return (
    <fieldset className="flex flex-col gap-4 border-l-2 border-border pl-4">
      <Heading label={label} meta={meta} onRemove={onRemove} />
      {fields}
    </fieldset>
  );
}

/** Design numbers and the like: folded away until asked for. */
function Advanced({ label, meta, path, onRemove, children }: { label: string; meta: FieldMeta; path: Path; onRemove?: () => void; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const { issues } = useContext(EditorContext);
  return (
    <div className="rounded-lg border border-dashed border-border">
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="flex w-full items-center gap-2 px-3 py-2.5 text-left">
        <ChevronRight className={cn("size-4 shrink-0 text-muted-foreground transition-transform duration-150", open && "rotate-90")} />
        <span className="flex-1 text-sm font-medium text-muted-foreground">{label}</span>
        {hasIssueUnder(issues, path) && <IssueDot />}
      </button>
      {open && (
        <div className="flex flex-col gap-4 border-t border-dashed border-border p-3">
          {(meta.description || onRemove) && <Heading label={label} meta={meta} onRemove={onRemove} />}
          {children}
        </div>
      )}
    </div>
  );
}

/* ── Lists ────────────────────────────────────────────────────────────── */

let keySeed = 0;
const newKey = () => `k${++keySeed}`;

/** Stable keys for list items, kept in step with adds, moves and removes made here. */
function useItemKeys(length: number) {
  const [keys, setKeys] = useState(() => Array.from({ length }, newKey));
  const synced = keys.length === length ? keys : Array.from({ length }, (_, i) => keys[i] ?? newKey());
  if (synced !== keys) setKeys(synced);
  return [synced, setKeys] as const;
}

function ArrayField({ schema, value, path, label, meta, bare, onRemove }: GroupProps) {
  const { set } = useContext(EditorContext);
  const element = def(schema).element!;
  const inner = unwrap(element).schema;
  const items = Array.isArray(value) ? value : [];
  const [keys, setKeys] = useItemKeys(items.length);
  const [openKey, setOpenKey] = useState<string | null>(null);

  const add = () => {
    set(path, [...items, emptyOf(element)]);
    const k = newKey();
    setKeys([...keys, k]);
    setOpenKey(k);
  };
  const move = (i: number, j: number) => {
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    const nextKeys = [...keys];
    [nextKeys[i], nextKeys[j]] = [nextKeys[j], nextKeys[i]];
    setKeys(nextKeys);
    set(path, next);
  };
  const remove = (i: number) => {
    setKeys(keys.filter((_, x) => x !== i));
    set(
      path,
      items.filter((_, x) => x !== i),
    );
  };
  const one = singular(label);

  // A list of choices (tags): toggles rather than rows.
  if (inner.type === "enum") {
    const options = def(inner).options as string[];
    return (
      <div className="flex flex-col gap-2">
        {!bare && <Heading label={label} meta={meta} onRemove={onRemove} />}
        <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
          {options.map((o) => {
            const on = items.includes(o);
            return (
              <button
                key={o}
                type="button"
                aria-pressed={on}
                onClick={() => set(path, on ? items.filter((x) => x !== o) : options.filter((x) => x === o || items.includes(x)))}
                className="h-8 rounded-full border border-border px-3 text-[0.8125rem] font-medium text-muted-foreground transition-colors duration-150 hover:bg-accent aria-pressed:border-transparent aria-pressed:bg-primary/18 aria-pressed:text-foreground"
              >
                {o}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const simple = inner.type !== "object";
  return (
    <div className="flex flex-col gap-2.5">
      {!bare && <Heading label={label} meta={meta} onRemove={onRemove} />}
      {items.length > 0 && (
        <ol className={cn("flex flex-col", simple ? "gap-2" : "gap-2")}>
          {items.map((item, i) =>
            simple ? (
              <li key={keys[i]} className="flex items-start gap-1.5">
                <div className="min-w-0 flex-1">
                  <Node schema={element} value={item} path={[...path, i]} name={`${one || label} ${i + 1}`} bare />
                </div>
                <ItemTools i={i} count={items.length} onMove={move} onRemove={remove} label={itemLabel(item, i)} />
              </li>
            ) : (
              <ObjectItem
                key={keys[i]}
                element={element}
                item={item}
                path={[...path, i]}
                i={i}
                count={items.length}
                open={openKey === keys[i]}
                onToggle={() => setOpenKey(openKey === keys[i] ? null : keys[i])}
                onMove={move}
                onRemove={remove}
              />
            ),
          )}
        </ol>
      )}
      <Button variant="outline" size="sm" className="self-start" onClick={add}>
        <Plus />
        {one ? `Add ${one.toLowerCase()}` : "Add"}
      </Button>
    </div>
  );
}

function ItemTools({
  i,
  count,
  label,
  onMove,
  onRemove,
}: {
  i: number;
  count: number;
  label: string;
  onMove: (i: number, j: number) => void;
  onRemove: (i: number) => void;
}) {
  return (
    <div className="flex shrink-0 items-center">
      <Button variant="ghost" size="icon-sm" aria-label={`Move “${label}” up`} disabled={i === 0} onClick={() => onMove(i, i - 1)}>
        <ArrowUp />
      </Button>
      <Button variant="ghost" size="icon-sm" aria-label={`Move “${label}” down`} disabled={i === count - 1} onClick={() => onMove(i, i + 1)}>
        <ArrowDown />
      </Button>
      <Button variant="ghost" size="icon-sm" aria-label={`Remove “${label}”`} onClick={() => onRemove(i)} className="hover:text-destructive">
        <X />
      </Button>
    </div>
  );
}

function ObjectItem({
  element,
  item,
  path,
  i,
  count,
  open,
  onToggle,
  onMove,
  onRemove,
}: {
  element: Schema;
  item: unknown;
  path: Path;
  i: number;
  count: number;
  open: boolean;
  onToggle: () => void;
  onMove: (i: number, j: number) => void;
  onRemove: (i: number) => void;
}) {
  const { issues } = useContext(EditorContext);
  const label = itemLabel(item, i);
  const id = useId();
  return (
    <li className={cn("rounded-lg border border-border bg-background", open && "border-input")}>
      <div className="flex items-center gap-1 pr-1">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={onToggle}
          className="flex min-h-11 min-w-0 flex-1 items-center gap-2.5 px-3 py-2 text-left"
        >
          <ChevronRight className={cn("size-4 shrink-0 text-muted-foreground transition-transform duration-150", open && "rotate-90")} />
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{label}</span>
          {hasIssueUnder(issues, path) && <IssueDot />}
        </button>
        <ItemTools i={i} count={count} onMove={onMove} onRemove={onRemove} label={label} />
      </div>
      {open && (
        <div id={id} className="border-t border-border px-3 pt-4 pb-4">
          <Node schema={element} value={item} path={path} name={label} bare />
        </div>
      )}
    </li>
  );
}

/* ── Single values ────────────────────────────────────────────────────── */

const isPicture = (src: unknown): src is string => typeof src === "string" && /^(\/[^/]|https?:\/\/)/.test(src);

function Leaf({
  schema,
  value,
  path,
  label,
  meta,
  issue,
  onRemove,
  bare = false,
}: {
  schema: Schema;
  value: unknown;
  path: Path;
  label: string;
  meta: FieldMeta;
  issue?: string;
  onRemove?: () => void;
  /** A list item: the list already says what it is, so the label is for screen readers only. */
  bare?: boolean;
}) {
  const { set } = useContext(EditorContext);
  const id = useId();
  const hint = issue ?? (bare ? undefined : meta.description);
  const described = hint ? `${id}-hint` : undefined;
  let control: React.ReactNode;

  if (schema.type === "boolean") {
    control = <Switch id={id} checked={Boolean(value)} onCheckedChange={(on) => set(path, on)} aria-describedby={described} />;
  } else if (schema.type === "enum" || (schema.type === "union" && literals(schema).length)) {
    const options = schema.type === "enum" ? (def(schema).options as (string | number)[]) : (literals(schema) as (string | number)[]);
    control = (
      <select
        id={id}
        value={String(value)}
        aria-invalid={Boolean(issue)}
        aria-describedby={described}
        onChange={(e) => set(path, options.find((o) => String(o) === e.target.value))}
        className="h-11 w-full rounded-lg border border-input bg-muted px-3 text-base text-foreground focus:border-primary aria-invalid:border-destructive md:w-auto md:min-w-40 md:text-sm"
      >
        {options.map((o) => (
          <option key={String(o)} value={String(o)}>
            {meta.labels?.[String(o)] ?? String(o)}
          </option>
        ))}
      </select>
    );
  } else if (schema.type === "number") {
    control = (
      <Input
        id={id}
        type="number"
        inputMode="decimal"
        step="any"
        value={typeof value === "number" ? value : ""}
        aria-invalid={Boolean(issue)}
        aria-describedby={described}
        onChange={(e) => set(path, Number.isNaN(e.target.valueAsNumber) ? 0 : e.target.valueAsNumber)}
        className="md:max-w-40"
      />
    );
  } else if (meta.widget === "textarea") {
    control = (
      <textarea
        id={id}
        value={typeof value === "string" ? value : ""}
        rows={3}
        aria-invalid={Boolean(issue)}
        aria-describedby={described}
        onChange={(e) => set(path, e.target.value)}
        className="field-sizing-content min-h-24 w-full rounded-lg border border-input bg-muted px-3.5 py-2.5 text-base leading-relaxed text-foreground transition-colors duration-150 focus:border-primary aria-invalid:border-destructive md:text-sm"
      />
    );
  } else {
    control = (
      <div className="flex items-center gap-2.5">
        {meta.widget === "image" && (
          <span className="relative size-11 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
            {isPicture(value) && <Image src={value} alt="" fill unoptimized sizes="44px" className="object-cover" />}
          </span>
        )}
        <Input
          id={id}
          value={typeof value === "string" ? value : ""}
          aria-invalid={Boolean(issue)}
          aria-describedby={described}
          onChange={(e) => set(path, e.target.value)}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className={cn("flex items-center gap-2", bare && !onRemove && "sr-only")}>
        <label htmlFor={id} className={cn("text-sm font-medium text-foreground", bare && "sr-only")}>
          {label}
        </label>
        {onRemove && (
          <Button variant="link" size="sm" className="ml-auto text-xs" onClick={onRemove}>
            Remove
          </Button>
        )}
      </div>
      {control}
      {hint && (
        <p id={described} className={cn("text-[0.8125rem] leading-snug", issue ? "text-destructive" : "text-muted-foreground")}>
          {hint}
        </p>
      )}
    </div>
  );
}
