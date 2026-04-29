"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Phone, Video, MoreVertical, Users, BellOff, Bell, Archive, Trash2, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { formatLastSeen } from "@/lib/utils";
import type { Conversation, User } from "@/types";
import { useSocketStore } from "@/stores/socketStore";
import { useUser } from "@clerk/nextjs";

interface ChatHeaderProps {
  conversation: Conversation;
  onAction: (action: string, data?: object) => void;
}

export function ChatHeader({ conversation, onAction }: ChatHeaderProps) {
  const { user: clerkUser } = useUser();
  const router = useRouter();
  const { onlineUsers } = useSocketStore();
  const [showMenu, setShowMenu] = useState(false);

  const otherMember = conversation.type === "DIRECT"
    ? conversation.members.find((m) => m.user.clerkId !== clerkUser?.id)
    : null;

  const isOnline = otherMember
    ? (onlineUsers[otherMember.user.id] ?? otherMember.user.isOnline)
    : false;

  const displayName = conversation.type === "GROUP"
    ? conversation.name ?? "Group Chat"
    : otherMember?.user.displayName ?? "Unknown";

  const subtitle = conversation.type === "GROUP"
    ? `${conversation.members.length} members`
    : isOnline
    ? "Online"
    : otherMember?.user.lastSeenAt
    ? `Last seen ${formatLastSeen(otherMember.user.lastSeenAt)}`
    : "Offline";

  const menuItems = [
    { icon: Info, label: "Info", action: "info" },
    { icon: Archive, label: "Archive chat", action: "archive" },
    { icon: BellOff, label: "Mute notifications", action: "mute" },
    { icon: Trash2, label: "Delete chat", action: "delete", destructive: true },
  ];

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 border-b"
      style={{ borderColor: "hsl(var(--border))", background: "hsl(var(--background))" }}
    >
      {/* Back button (mobile) */}
      <button
        onClick={() => router.push("/")}
        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all md:hidden"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

      {/* Avatar */}
      {conversation.type === "DIRECT" && otherMember ? (
        <UserAvatar
          user={{ ...otherMember.user, isOnline }}
          size="md"
          showPresence
        />
      ) : (
        <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
          <Users className="w-5 h-5 text-primary" />
        </div>
      )}

      {/* Name + status */}
      <div className="flex-1 min-w-0">
        <h2 className="text-sm font-semibold text-foreground truncate">{displayName}</h2>
        <p className={`text-xs truncate ${isOnline ? "text-emerald-500" : "text-muted-foreground"}`}>
          {subtitle}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        <button className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-all hidden sm:flex">
          <Phone className="w-4.5 h-4.5" />
        </button>
        <button className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-all hidden sm:flex">
          <Video className="w-4.5 h-4.5" />
        </button>

        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
          >
            <MoreVertical className="w-4.5 h-4.5" />
          </button>

          <AnimatePresence>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -8 }}
                  className="absolute right-0 top-full mt-1 w-48 rounded-xl border shadow-lg overflow-hidden z-20"
                  style={{ background: "hsl(var(--card))", borderColor: "hsl(var(--border))" }}
                >
                  {menuItems.map(({ icon: Icon, label, action, destructive }) => (
                    <button
                      key={action}
                      onClick={() => { onAction(action); setShowMenu(false); }}
                      className={`flex items-center gap-2.5 w-full px-3 py-2.5 text-sm hover:bg-muted transition-colors text-left ${destructive ? "text-destructive" : "text-foreground"}`}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      {label}
                    </button>
                  ))}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
