"use client";

import * as React from "react";
import {
  MdKeyboardArrowDown,
  MdKeyboardArrowUp,
  MdCheck,
} from "react-icons/md";
import { cn } from "./utils";

/* ------------------------------------------------------------------ */
/* Context */
/* ------------------------------------------------------------------ */

type SelectContextType = {
  value?: string;
  onValueChange?: (value: string) => void;
  open: boolean;
  setOpen: (v: boolean) => void;
};

const SelectContext = React.createContext<SelectContextType | null>(null);

function useSelect() {
  const ctx = React.useContext(SelectContext);
  if (!ctx) {
    throw new Error("Select components must be used within <Select>");
  }
  return ctx;
}

/* ------------------------------------------------------------------ */
/* Root */
/* ------------------------------------------------------------------ */

type SelectProps = {
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
};

function Select({ value, onValueChange, children }: SelectProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <SelectContext.Provider
      value={{ value, onValueChange, open, setOpen }}
    >
      <div className="relative w-full">{children}</div>
    </SelectContext.Provider>
  );
}

/* ------------------------------------------------------------------ */
/* Trigger */
/* ------------------------------------------------------------------ */

type SelectTriggerProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  size?: "sm" | "default";
};

function SelectTrigger({
  className,
  size = "default",
  children,
  ...props
}: SelectTriggerProps) {
  const { open, setOpen } = useSelect();

  return (
    <button
      type="button"
      data-size={size}
      onClick={() => setOpen(!open)}
      className={cn(
        "flex w-full items-center justify-between gap-2 rounded-md border bg-input-background px-3 py-2 text-sm",
        "focus:outline-none focus:ring-2 focus:ring-ring",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        size === "sm" ? "h-8" : "h-9",
        className
      )}
      {...props}
    >
      <span className="truncate">{children}</span>
      {open ? (
        <MdKeyboardArrowUp className="size-4 opacity-50" />
      ) : (
        <MdKeyboardArrowDown className="size-4 opacity-50" />
      )}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Content */
/* ------------------------------------------------------------------ */

function SelectContent({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const { open } = useSelect();

  if (!open) return null;

  return (
    <div
      className={cn(
        "absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md",
        className
      )}
    >
      <div className="p-1 max-h-60 overflow-y-auto">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Item */
/* ------------------------------------------------------------------ */

type SelectItemProps = {
  value: string;
  children: React.ReactNode;
  disabled?: boolean;
};

function SelectItem({ value, children, disabled }: SelectItemProps) {
  const { value: selected, onValueChange, setOpen } = useSelect();

  const isSelected = selected === value;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        if (disabled) return;
        onValueChange?.(value);
        setOpen(false);
      }}
      className={cn(
        "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-left",
        "hover:bg-accent focus:bg-accent focus:outline-none",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <span className="flex-1 truncate">{children}</span>
      {isSelected && <MdCheck className="size-4 opacity-70" />}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Value */
/* ------------------------------------------------------------------ */

function SelectValue({ placeholder }: { placeholder?: string }) {
  const { value } = useSelect();
  return <>{value ?? placeholder}</>;
}

/* ------------------------------------------------------------------ */
/* Exports */
/* ------------------------------------------------------------------ */

export {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
};
