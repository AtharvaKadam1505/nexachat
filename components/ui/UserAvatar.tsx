"use client";

import Image from "next/image";
import { cn, getInitials, getAvatarColor } from "@/lib/utils";

interface UserAvatarProps {
  user: {
    displayName: string;
    avatarUrl?: string | null;
    isOnline?: boolean;
    id?: string;
  };
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  showPresence?: boolean;
  className?: string;
}

const sizeMap = {
  xs: { container: "w-6 h-6", text: "text-[10px]", dot: "w-2 h-2 border" },
  sm: { container: "w-8 h-8", text: "text-xs", dot: "w-2.5 h-2.5 border" },
  md: { container: "w-10 h-10", text: "text-sm", dot: "w-3 h-3 border-2" },
  lg: { container: "w-12 h-12", text: "text-base", dot: "w-3.5 h-3.5 border-2" },
  xl: { container: "w-16 h-16", text: "text-xl", dot: "w-4 h-4 border-2" },
};

export function UserAvatar({ user, size = "md", showPresence = false, className }: UserAvatarProps) {
  const s = sizeMap[size];
  const colorClass = getAvatarColor(user.id ?? user.displayName);

  return (
    <div className={cn("relative flex-shrink-0", className)}>
      <div className={cn("rounded-full overflow-hidden flex items-center justify-center", s.container, !user.avatarUrl && colorClass)}>
        {user.avatarUrl ? (
          <Image
            src={user.avatarUrl}
            alt={user.displayName}
            fill
            className="object-cover"
            sizes="64px"
          />
        ) : (
          <span className={cn("font-semibold text-white select-none", s.text)}>
            {getInitials(user.displayName)}
          </span>
        )}
      </div>
      {showPresence && (
        <span
          className={cn(
            "absolute bottom-0 right-0 rounded-full border-background",
            s.dot,
            user.isOnline ? "bg-emerald-500" : "bg-muted-foreground/50"
          )}
        />
      )}
    </div>
  );
}
