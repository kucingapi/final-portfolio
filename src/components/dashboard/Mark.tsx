import Image from "next/image";
import { cn } from "./ui/cn";

/** The site's N with the logo's full stop, as on the app icon. */
export function Mark({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn("inline-flex items-end gap-1", className)}>
      <Image src="/figma/brand/logo.svg" alt="" width={39} height={42} className="h-6 w-auto" />
      <span className="mb-0.5 size-1.5 rounded-full bg-primary" />
    </span>
  );
}
