"use client";

import { useTheme } from "next-themes";
import { Moon, Sun, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

interface ThemeToggleProps {
  variant?: "icon" | "full";
  className?: string;
}

export function ThemeToggle({ variant = "icon", className }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  if (variant === "full") {
    const options = [
      { value: "light", label: "Light", Icon: Sun },
      { value: "system", label: "System", Icon: Monitor },
      { value: "dark", label: "Dark", Icon: Moon },
    ];
    return (
      <div className={cn("flex items-center gap-1 p-1 rounded-lg bg-muted", className)}>
        {options.map(({ value, label, Icon }) => (
          <button
            key={value}
            onClick={() => setTheme(value)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
              theme === value
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>
    );
  }

  const cycleTheme = () => {
    if (theme === "light") setTheme("dark");
    else if (theme === "dark") setTheme("system");
    else setTheme("light");
  };

  const Icon = theme === "dark" ? Moon : theme === "light" ? Sun : Monitor;

  return (
    <button
      onClick={cycleTheme}
      className={cn(
        "p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all",
        className
      )}
      title={`Theme: ${theme}`}
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}
