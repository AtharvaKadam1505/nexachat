"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Check, CheckCheck, Clock, Pencil, Trash2, Reply, MoreHorizontal, Download, Play } from "lucide-react";
import { cn, formatMessageTime, formatFileSize } from "@/lib/utils";
import { UserAvatar } from "@/components/ui/UserAvatar";
import type { Message, DeliveryStatus } from "@/types";

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showAvatar: boolean;
  showDate: boolean;
  onReply: (message: Message) => void;
  onEdit: (message: Message) => void;
  onDelete: (messageId: string, scope: "self" | "all") => void;
  currentUserId: string;
}

function StatusIcon({ status }: { status: DeliveryStatus }) {
  if (status === "READ") return <CheckCheck className="w-3.5 h-3.5 text-blue-400" />;
  if (status === "DELIVERED") return <CheckCheck className="w-3.5 h-3.5 text-muted-foreground" />;
  return <Check className="w-3.5 h-3.5 text-muted-foreground" />;
}

export function MessageBubble({
  message,
  isOwn,
  showAvatar,
  showDate,
  onReply,
  onEdit,
  onDelete,
  currentUserId,
}: MessageBubbleProps) {
  const [showActions, setShowActions] = useState(false);
  const [showDeleteMenu, setShowDeleteMenu] = useState(false);

  const myStatus = message.statuses?.find((s) => s.userId === currentUserId);
  const worstStatus: DeliveryStatus =
    message.statuses && message.statuses.length > 1
      ? message.statuses.every((s) => s.status === "READ")
        ? "READ"
        : message.statuses.some((s) => s.status === "DELIVERED" || s.status === "READ")
        ? "DELIVERED"
        : "SENT"
      : "SENT";

  if (message.deletedForAll) {
    return (
      <div className={cn("flex items-center gap-2 px-4 py-0.5", isOwn ? "justify-end" : "justify-start")}>
        <span className="text-xs text-muted-foreground italic bg-muted/50 px-3 py-1.5 rounded-full border border-dashed">
          🚫 This message was deleted
        </span>
      </div>
    );
  }

  const renderContent = () => {
    switch (message.type) {
      case "IMAGE":
        return (
          <div className="relative rounded-xl overflow-hidden max-w-[280px]">
            <Image
              src={message.mediaUrl!}
              alt="Image"
              width={280}
              height={200}
              className="object-cover rounded-xl"
              style={{ maxHeight: 200 }}
            />
            {message.content && (
              <p className="px-3 py-2 text-sm">{message.content}</p>
            )}
          </div>
        );
      case "FILE":
        return (
          <a
            href={message.mediaUrl!}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl border min-w-[200px] hover:opacity-80 transition-opacity"
            style={{ borderColor: isOwn ? "rgba(255,255,255,0.2)" : "hsl(var(--border))" }}
          >
            <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0", isOwn ? "bg-white/20" : "bg-primary/10")}>
              <Download className={cn("w-4 h-4", isOwn ? "text-white" : "text-primary")} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {(message.mediaMetadata as { fileName?: string })?.fileName ?? "File"}
              </p>
              <p className={cn("text-xs", isOwn ? "text-white/70" : "text-muted-foreground")}>
                {formatFileSize((message.mediaMetadata as { size?: number })?.size ?? 0)}
              </p>
            </div>
          </a>
        );
      case "AUDIO":
        return (
          <div className="flex items-center gap-2 px-3 py-2 min-w-[180px]">
            <button className={cn("w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0", isOwn ? "bg-white/20" : "bg-primary/10")}>
              <Play className={cn("w-3.5 h-3.5 ml-0.5", isOwn ? "text-white" : "text-primary")} />
            </button>
            <div className="flex-1 h-1 rounded-full bg-current opacity-30" />
            <span className={cn("text-xs", isOwn ? "text-white/70" : "text-muted-foreground")}>
              {(message.mediaMetadata as { duration?: number })?.duration
                ? `${Math.round(((message.mediaMetadata as { duration?: number }).duration ?? 0))}s`
                : "0:00"}
            </span>
          </div>
        );
      default:
        return (
          <p className="px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words">
            {message.content}
          </p>
        );
    }
  };

  return (
    <div className={cn("group flex gap-2 px-3 py-0.5", isOwn ? "flex-row-reverse" : "flex-row")}>
      {/* Avatar spacer */}
      <div className="w-8 flex-shrink-0 flex items-end">
        {!isOwn && showAvatar && (
          <UserAvatar user={message.sender} size="sm" />
        )}
      </div>

      <div className={cn("flex flex-col max-w-[75%] sm:max-w-[65%]", isOwn ? "items-end" : "items-start")}>
        {/* Sender name (group chats) */}
        {!isOwn && showAvatar && (
          <span className="text-xs font-medium text-primary mb-1 ml-1">
            {message.sender.displayName}
          </span>
        )}

        {/* Reply preview */}
        {message.replyTo && !message.replyTo.deletedForAll && (
          <div
            className={cn(
              "flex items-start gap-2 mb-1 px-3 py-1.5 rounded-xl border-l-2 border-primary/60 max-w-full text-left cursor-pointer",
              isOwn ? "bg-black/10 self-end" : "bg-muted/60"
            )}
          >
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-primary truncate">
                {message.replyTo.sender.displayName}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {message.replyTo.content ?? "Media"}
              </p>
            </div>
          </div>
        )}

        {/* Bubble */}
        <div className="relative flex items-end gap-1.5">
          {/* Action buttons (hover) */}
          <div
            className={cn(
              "flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity",
              isOwn ? "order-first" : "order-last"
            )}
          >
            <button
              onClick={() => onReply(message)}
              className="p-1.5 rounded-lg bg-background border shadow-sm hover:bg-muted transition-colors"
              style={{ borderColor: "hsl(var(--border))" }}
            >
              <Reply className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
            {isOwn && (
              <div className="relative">
                <button
                  onClick={() => setShowActions(!showActions)}
                  className="p-1.5 rounded-lg bg-background border shadow-sm hover:bg-muted transition-colors"
                  style={{ borderColor: "hsl(var(--border))" }}
                >
                  <MoreHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
                {showActions && (
                  <div
                    className={cn(
                      "absolute bottom-full mb-1 w-36 rounded-xl border shadow-lg overflow-hidden z-20",
                      isOwn ? "right-0" : "left-0"
                    )}
                    style={{ background: "hsl(var(--card))", borderColor: "hsl(var(--border))" }}
                  >
                    {message.type === "TEXT" && (
                      <button
                        onClick={() => { onEdit(message); setShowActions(false); }}
                        className="flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-muted transition-colors text-left"
                      >
                        <Pencil className="w-3.5 h-3.5" /> Edit
                      </button>
                    )}
                    <button
                      onClick={() => { setShowDeleteMenu(true); setShowActions(false); }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-muted transition-colors text-left text-destructive"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </div>
                )}
                {showDeleteMenu && (
                  <div
                    className={cn(
                      "absolute bottom-full mb-1 w-44 rounded-xl border shadow-lg overflow-hidden z-20",
                      isOwn ? "right-0" : "left-0"
                    )}
                    style={{ background: "hsl(var(--card))", borderColor: "hsl(var(--border))" }}
                  >
                    <p className="px-3 pt-2 pb-1 text-[11px] font-medium text-muted-foreground">Delete for…</p>
                    <button
                      onClick={() => { onDelete(message.id, "self"); setShowDeleteMenu(false); }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-muted transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Me only
                    </button>
                    <button
                      onClick={() => { onDelete(message.id, "all"); setShowDeleteMenu(false); }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-muted transition-colors text-destructive"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Everyone
                    </button>
                    <button
                      onClick={() => setShowDeleteMenu(false)}
                      className="w-full px-3 py-2 text-xs text-muted-foreground hover:bg-muted transition-colors border-t"
                      style={{ borderColor: "hsl(var(--border))" }}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.15 }}
            className={cn(
              "rounded-2xl overflow-hidden",
              isOwn
                ? "rounded-br-sm bg-[hsl(var(--bubble-sent))] text-[hsl(var(--bubble-sent-text))]"
                : "rounded-bl-sm bg-[hsl(var(--bubble-received))] text-[hsl(var(--bubble-received-text))]"
            )}
          >
            {renderContent()}

            {/* Timestamp + status */}
            <div className={cn(
              "flex items-center gap-1 px-3 pb-1.5 -mt-1",
              isOwn ? "justify-end" : "justify-start"
            )}>
              {message.isEdited && (
                <span className={cn("text-[10px]", isOwn ? "text-white/60" : "text-muted-foreground")}>
                  edited
                </span>
              )}
              <span className={cn("text-[10px]", isOwn ? "text-white/60" : "text-muted-foreground")}>
                {formatMessageTime(message.createdAt)}
              </span>
              {isOwn && <StatusIcon status={worstStatus} />}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
