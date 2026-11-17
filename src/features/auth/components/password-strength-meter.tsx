"use client";

import { Check, X } from "lucide-react";

import { getPasswordStrength } from "@/lib/password";
import { cn } from "@/lib/utils";

const SCORE_COLOR: Record<number, string> = {
  0: "bg-destructive",
  1: "bg-destructive",
  2: "bg-amber-500",
  3: "bg-amber-500",
  4: "bg-emerald-500",
};

const REQUIREMENTS: { key: keyof ReturnType<typeof getPasswordStrength>["checks"]; label: string }[] = [
  { key: "minLength", label: "At least 8 characters" },
  { key: "hasUpper", label: "One uppercase letter" },
  { key: "hasLower", label: "One lowercase letter" },
  { key: "hasNumber", label: "One number" },
];

export function PasswordStrengthMeter({ password }: { password: string }) {
  const { score, label, checks } = getPasswordStrength(password);

  if (!password) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex flex-1 gap-1">
          {[0, 1, 2, 3].map((bar) => (
            <div
              key={bar}
              className={cn(
                "h-1.5 flex-1 rounded-full bg-muted transition-colors",
                bar < score && SCORE_COLOR[score]
              )}
            />
          ))}
        </div>
        <span className="w-16 shrink-0 text-right text-xs text-muted-foreground">{label}</span>
      </div>
      <ul className="grid grid-cols-2 gap-x-3 gap-y-1">
        {REQUIREMENTS.map((req) => {
          const met = checks[req.key];
          return (
            <li
              key={req.key}
              className={cn(
                "flex items-center gap-1.5 text-xs",
                met ? "text-muted-foreground" : "text-muted-foreground/60"
              )}
            >
              {met ? (
                <Check className="size-3 text-emerald-500" />
              ) : (
                <X className="size-3 text-muted-foreground/40" />
              )}
              {req.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
