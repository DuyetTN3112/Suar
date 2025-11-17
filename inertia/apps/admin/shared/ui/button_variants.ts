import { tv, type VariantProps } from "tailwind-variants"

export const buttonVariants = tv({
  base: [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "rounded-xl border text-sm font-extrabold",
    "transition-[transform,box-shadow,background-color,border-color,opacity]",
    "duration-150 ease-suar",
    "focus-visible:outline-none focus-visible:ring-[3px]",
    "focus-visible:ring-orange/25",
    "disabled:pointer-events-none disabled:opacity-35 disabled:shadow-none",
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  ],
  variants: {
    variant: {
      /* Orange CTA — create, submit, save, continue */
      primary: [
        "border-border bg-primary text-primary-foreground",
        "shadow-suar-strong",
        "hover:-translate-x-px hover:-translate-y-px",
        "hover:shadow-[6px_6px_0_var(--foreground)]",
        "active:translate-x-[2px] active:translate-y-[2px]",
        "active:shadow-suar-xs",
      ],
      /* Default secondary — view, cancel, close */
      secondary: [
        "border-border bg-background text-foreground",
        "shadow-suar-xs",
        "hover:border-foreground/20 hover:bg-secondary",
        "active:translate-y-px active:shadow-none",
      ],
      /* Outline — tertiary actions */
      outline: [
        "border-border bg-transparent text-foreground",
        "shadow-none hover:border-foreground/45 hover:bg-secondary",
      ],
      /* Ghost — toolbar, nav utility */
      ghost: [
        "border-transparent bg-transparent text-foreground shadow-none",
        "hover:bg-secondary",
      ],
      /* Inverse — black CTA for contrast sections */
      inverse: [
        "border-border bg-foreground text-background shadow-suar-accent",
        "hover:-translate-x-px hover:-translate-y-px",
        "hover:shadow-[5px_5px_0_var(--suar-orange)]",
        "active:translate-x-[2px] active:translate-y-[2px]",
        "active:shadow-suar-xs",
      ],
      /* Destructive — delete, remove, revoke — no red */
      destructive: [
        "relative border-border bg-foreground text-background shadow-suar-accent",
        "after:absolute after:right-2 after:top-2 after:size-1.5 after:rounded-full after:bg-primary-foreground",
        "hover:-translate-x-px hover:-translate-y-px",
        "hover:shadow-[5px_5px_0_var(--suar-orange)]",
        "active:translate-x-[2px] active:translate-y-[2px]",
        "active:shadow-suar-xs",
      ],
      /* Link — inline text actions */
      link: [
        "h-auto border-0 bg-transparent p-0 text-foreground shadow-none",
        "underline-offset-4 hover:underline",
      ],
      /* Legacy alias kept for backward compat */
      default: [
        "border-border bg-primary text-primary-foreground",
        "shadow-suar-strong",
        "hover:-translate-x-px hover:-translate-y-px",
        "hover:shadow-[6px_6px_0_var(--foreground)]",
        "active:translate-x-[2px] active:translate-y-[2px]",
        "active:shadow-suar-xs",
      ],
    },
    size: {
      sm:       "h-9 rounded-lg px-3 text-xs",
      md:       "h-11 px-4",
      lg:       "h-13 rounded-2xl px-5 text-base",
      icon:     "size-11 rounded-full p-0",
      "icon-sm": "size-9 rounded-full p-0",
      /* Legacy alias */
      default:  "h-10 px-4",
    },
  },
  defaultVariants: {
    variant: "secondary",
    size: "md",
  },
})

export type ButtonVariants = VariantProps<typeof buttonVariants>
