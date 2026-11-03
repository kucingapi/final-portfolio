import { Label as LabelPrimitive } from "radix-ui";
import { cn } from "./cn";

/** 16px on phones, so iOS doesn't zoom in when a field gets focus. */
export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      data-slot="input"
      className={cn(
        "h-11 w-full min-w-0 rounded-lg border border-input bg-muted px-3.5 text-base text-foreground transition-colors duration-150 placeholder:text-muted-foreground/60 focus:border-primary disabled:opacity-50 aria-invalid:border-destructive md:text-sm",
        className,
      )}
      {...props}
    />
  );
}

export function Label({ className, ...props }: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return <LabelPrimitive.Root data-slot="label" className={cn("text-sm font-medium text-foreground select-none", className)} {...props} />;
}

/** A label, its control and an optional hint underneath. */
export function Field({ label, htmlFor, hint, children }: { label: string; htmlFor: string; hint?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && <p className="text-[0.8125rem] leading-snug text-muted-foreground">{hint}</p>}
    </div>
  );
}
