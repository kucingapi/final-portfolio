import { cn } from "./cn";

export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return <div aria-hidden className={cn("animate-pulse rounded-md bg-foreground/[0.07]", className)} {...props} />;
}
