"use client";

import { Eye, EyeOff } from "lucide-react";
import * as React from "react";
import { useState } from "react";
import { Input } from "@/components/ui/input";

export type PasswordInputProps = Omit<React.ComponentProps<typeof Input>, "type"> & {
  onReveal?: () => void;
};

export function PasswordInput({ onReveal, ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input type={visible ? "text" : "password"} className="pr-8" {...props} />
      <button
        type="button"
        onClick={() => {
          setVisible((v) => {
            if (!v) {
              onReveal?.();
            }
            return !v;
          });
        }}
        aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
        className="absolute top-1/2 right-2 -translate-y-1/2 text-muted hover:text-foreground"
      >
        {visible ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    </div>
  );
}
