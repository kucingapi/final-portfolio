import { Button } from "./ui/button";

/** A load that failed: what went wrong, and a way to try again. */
export function Problem({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/8 p-4">
      <p className="text-sm leading-relaxed text-foreground">Couldn&apos;t load this. {message}</p>
      <Button size="sm" variant="secondary" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}
