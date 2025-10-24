"use client";
import { forwardRef, ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: "default" | "primary" | "secondary" | "destructive";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className = "",
      disabled = false,
      type = "button",
      variant = "default",
      size = "md",
      loading = false,
      ...props
    },
    ref
  ) => {
    const baseClasses = `
      relative
      inline-flex
      items-center
      justify-center
      font-medium
      transition-all
      duration-200
      ease-in-out
      z-50
      border-2
      border-foreground
      bg-background
      text-foreground
      focus:outline-none
      focus:ring-2
      focus:ring-primary/80
      focus:ring-offset-2
      focus:ring-offset-background
      disabled:opacity-50
      disabled:cursor-not-allowed
      disabled:pointer-events-none
      translate-x-0
      translate-y-0
      hover:translate-x-1
      hover:translate-y-1
      active:translate-x-1
      active:translate-y-1
    `
      .trim()
      .replace(/\s+/g, " ");

    const shadowClasses = `
      absolute
      top-1
      left-1
      w-full
      h-full
      bg-foreground
      transition-all
      duration-200
      ease-in-out
    `
      .trim()
      .replace(/\s+/g, " ");

    const sizeClasses = {
      sm: "px-3 py-1.5 text-sm",
      md: "px-4 py-2 text-base",
      lg: "px-6 py-3 text-lg",
    };

    const variantClasses = {
      default: "text-foreground border-foreground hover:text-foreground",
      primary: "text-primary border-primary hover:text-primary",
      secondary: "text-secondary border-secondary hover:text-secondary",
      destructive: "text-delete border-delete hover:text-delete",
    };

    const combinedClasses = `
      ${baseClasses}
      ${sizeClasses[size]}
      ${variantClasses[variant]}
      ${className}
    `
      .trim()
      .replace(/\s+/g, " ");

    return (
      <div className="relative group">
        <div className={shadowClasses} />
        <button
          ref={ref}
          type={type}
          disabled={disabled || loading}
          className={combinedClasses}
          aria-disabled={disabled || loading}
          {...props}
        >
          {loading ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Loading...
            </>
          ) : (
            children
          )}
        </button>
      </div>
    );
  }
);

Button.displayName = "Button";

export default Button;
