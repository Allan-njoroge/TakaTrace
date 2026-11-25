import type { ComponentProps } from "react";
import { Link } from "react-router";
import { cn } from "../../lib/cn";
import { buttonBaseClass, buttonVariantClasses, type ButtonVariant } from "./Button";

export interface LinkButtonProps extends ComponentProps<typeof Link> {
  variant?: ButtonVariant;
}

/** A navigation link styled like Button, for actions that go to another route (e.g. inside a Banner). */
export function LinkButton({ variant = "primary", className, ...props }: LinkButtonProps) {
  return <Link className={cn(buttonBaseClass, buttonVariantClasses[variant], className)} {...props} />;
}
