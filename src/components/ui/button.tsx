import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-brand-md text-sm font-semibold transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 cursor-pointer [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[0_8px_32px_-8px_rgba(37,99,255,0.55)] hover:brightness-110 active:scale-[0.98]",
        gradient:
          "bg-gradient-hero text-white shadow-[0_8px_32px_-8px_rgba(37,99,255,0.55)] hover:brightness-110 active:scale-[0.98]",
        destructive: "bg-destructive text-destructive-foreground hover:brightness-110",
        outline:
          "border border-border bg-transparent text-foreground hover:border-brand-teal/45 hover:bg-accent",
        secondary:
          "border border-border bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "text-foreground-muted hover:bg-accent hover:text-foreground",
        link: "text-brand-teal underline-offset-4 hover:underline",
        google:
          "border border-border bg-white text-brand-navy shadow-[var(--card-shadow)] hover:bg-white/95 active:scale-[0.98]",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-brand-sm px-3 text-xs",
        lg: "h-11 rounded-brand-lg px-6 text-[0.9375rem]",
        xl: "h-12 rounded-brand-lg px-8 text-base",
        icon: "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
