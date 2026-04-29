"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { TypingPayload } from "@/types";

interface TypingIndicatorProps {
  typingUsers: TypingPayload[];
}

export function TypingIndicator({ typingUsers }: TypingIndicatorProps) {
  if (typingUsers.length === 0) return null;

  const label =
    typingUsers.length === 1
      ? `${typingUsers[0].displayName} is typing`
      : typingUsers.length === 2
      ? `${typingUsers[0].displayName} and ${typingUsers[1].displayName} are typing`
      : `${typingUsers.length} people are typing`;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        className="flex items-center gap-2 px-5 py-2"
      >
        <div className="flex items-center gap-1 bg-[hsl(var(--bubble-received))] px-3 py-2 rounded-2xl rounded-bl-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-[pulseDot_1.4s_ease-in-out_infinite]" style={{ animationDelay: "0ms" }} />
          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-[pulseDot_1.4s_ease-in-out_infinite]" style={{ animationDelay: "200ms" }} />
          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-[pulseDot_1.4s_ease-in-out_infinite]" style={{ animationDelay: "400ms" }} />
        </div>
        <span className="text-xs text-muted-foreground">{label}</span>
      </motion.div>
    </AnimatePresence>
  );
}
