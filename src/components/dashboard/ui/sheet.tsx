"use client";

import { X } from "lucide-react";
import { Dialog as SheetPrimitive } from "radix-ui";
import { createContext, useContext, useRef } from "react";
import { cn } from "./cn";

/**
 * A panel over the page: it rises from the bottom on a phone, where its top can be dragged down to
 * close it, and slides in from the right on a desktop.
 */

export const Sheet = SheetPrimitive.Root;

type Grab = React.HTMLAttributes<HTMLDivElement>;
const GrabContext = createContext<Grab>({});

const DESKTOP = "(min-width: 64rem)";
/** How far the panel must be dragged before letting go closes it. */
const CLOSE_AFTER = 90;

export function SheetContent({ className, children, ...props }: React.ComponentProps<typeof SheetPrimitive.Content>) {
  const panel = useRef<HTMLDivElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const drag = useRef<number | null>(null);

  const release = (dy: number) => {
    drag.current = null;
    const el = panel.current;
    if (!el) return;
    delete el.dataset.dragging;
    if (dy > CLOSE_AFTER) close.current?.click();
    else el.style.translate = "";
  };

  const grab: Grab = {
    onPointerDown(e) {
      if (e.pointerType === "mouse" || window.matchMedia(DESKTOP).matches) return;
      drag.current = e.clientY;
      e.currentTarget.setPointerCapture(e.pointerId);
      if (panel.current) panel.current.dataset.dragging = "";
    },
    onPointerMove(e) {
      if (drag.current === null || !panel.current) return;
      panel.current.style.translate = `0 ${Math.max(0, e.clientY - drag.current)}px`;
    },
    onPointerUp(e) {
      if (drag.current !== null) release(e.clientY - drag.current);
    },
    onPointerCancel() {
      if (drag.current !== null) release(0);
    },
  };

  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Overlay className="fixed inset-0 z-50 bg-[#010326]/75 data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in" />
      <SheetPrimitive.Content
        ref={panel}
        className={cn(
          "fixed z-50 flex flex-col bg-popover text-foreground outline-none",
          "inset-x-0 bottom-0 max-h-[92dvh] rounded-t-2xl border-t border-border pb-[env(safe-area-inset-bottom)] shadow-[0_-16px_48px_rgb(0_0_0/0.45)] data-[state=closed]:animate-sheet-down data-[state=open]:animate-sheet-up [&:not([data-dragging])]:transition-[translate] [&:not([data-dragging])]:duration-200",
          "md:inset-y-0 md:right-0 md:left-auto md:max-h-none md:w-[30rem] md:rounded-none md:rounded-l-2xl md:border-t-0 md:border-l md:pb-0 md:shadow-[-16px_0_48px_rgb(0_0_0/0.45)] md:data-[state=closed]:animate-sheet-right md:data-[state=open]:animate-sheet-left",
          className,
        )}
        {...props}
      >
        <GrabContext.Provider value={grab}>
          <div {...grab} aria-hidden className="flex h-5 shrink-0 touch-none justify-center pt-2.5 md:hidden">
            <span className="h-1 w-10 rounded-full bg-foreground/25" />
          </div>
          {children}
        </GrabContext.Provider>
        <SheetPrimitive.Close
          ref={close}
          className="absolute top-3 right-3 grid size-9 place-items-center rounded-full text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground md:top-4 md:right-4"
        >
          <X className="size-5" />
          <span className="sr-only">Close</span>
        </SheetPrimitive.Close>
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  );
}

/** The panel's title area; on a phone, dragging it down closes the panel. */
export function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  const grab = useContext(GrabContext);
  return <div {...grab} className={cn("flex shrink-0 touch-none flex-col gap-1 px-5 pt-2 pr-14 pb-4 md:px-6 md:pt-6", className)} {...props} />;
}

export function SheetTitle({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return <SheetPrimitive.Title className={cn("text-lg leading-tight font-semibold break-words text-foreground", className)} {...props} />;
}

export function SheetDescription({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return <SheetPrimitive.Description className={cn("text-sm leading-snug break-words text-muted-foreground", className)} {...props} />;
}

export function SheetBody({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto overscroll-contain px-5 pb-6 md:px-6", className)} {...props} />;
}
