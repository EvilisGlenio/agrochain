import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#84cc16] focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090b] disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-[#84cc16] text-[#0a0a0a] hover:bg-[#a3e635]",
        secondary: "bg-[#18181b] text-[#fafafa] hover:bg-[#27272a] border border-[#27272a]",
        outline: "border border-[#27272a] bg-transparent text-[#fafafa] hover:bg-[#18181b]",
        ghost: "bg-transparent text-[#fafafa] hover:bg-[#18181b]",
      },
      size: {
        default: "h-11 px-4 py-2",
        sm: "h-9 rounded-lg px-3",
        lg: "h-12 rounded-xl px-6",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return <button className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
