"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { format, isToday, isYesterday, isSameDay } from "date-fns";
import { ArrowDown, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";
import { cn } from "@/lib/utils";
import type { Message, PaginatedMessages, TypingPayload } from "@/types";

interface MessageListProps {
  conversationId: string;
  currentUserId: string;
  currentUserClerkId: string;
  typingUsers: TypingPayload[];
  onReply: (message: Message) => void;
  onEdit: (message: Message) => void;
  onDelete: (messageId: string, scope: "self" | "all") => void;
}

function DateDivider({ date }: { date: Date }) {
  const label = isToday(date)
    ? "Today"
    : isYesterday(date)
    ? "Yesterday"
    : format(date, "MMMM d, yyyy");

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="flex-1 h-px bg-border" />
      <span className="text-[11px] font-medium text-muted-foreground bg-background px-2 rounded-full border" style={{ borderColor: "hsl(var(--border))" }}>
        {label}
      </span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

export function MessageList({
  conversationId,
  currentUserId,
  currentUserClerkId,
  typingUsers,
  onReply,
  onEdit,
  onDelete,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [newMessageCount, setNewMessageCount] = useState(0);
  const queryClient = useQueryClient();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery<PaginatedMessages>({
    queryKey: ["messages", conversationId],
    queryFn: async ({ pageParam }) => {
      const url = `/api/messages?conversationId=${conversationId}${pageParam ? `&cursor=${pageParam}` : ""}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to load messages");
      return res.json();
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 0,
  });

  const allMessages = data?.pages.flatMap((p) => p.messages) ?? [];

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    bottomRef.current?.scrollIntoView({ behavior });
    setNewMessageCount(0);
  }, []);

  useEffect(() => {
    // Scroll to bottom on initial load
    setTimeout(() => scrollToBottom("instant"), 50);
  }, [conversationId, scrollToBottom]);

  useEffect(() => {
    // Auto-scroll on new messages if already at bottom
    if (isAtBottom) {
      scrollToBottom();
    } else {
      setNewMessageCount((n) => n + 1);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allMessages.length]);

  // Scroll tracking
  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const threshold = 120;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
    setIsAtBottom(atBottom);
    if (atBottom) setNewMessageCount(0);

    // Load more when near top
    if (el.scrollTop < 100 && hasNextPage && !isFetchingNextPage) {
      const prevHeight = el.scrollHeight;
      fetchNextPage().then(() => {
        requestAnimationFrame(() => {
          if (containerRef.current) {
            containerRef.current.scrollTop += containerRef.current.scrollHeight - prevHeight;
          }
        });
      });
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading messages…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 relative overflow-hidden">
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto scrollbar-thin chat-bg"
      >
        {/* Loading more indicator */}
        {isFetchingNextPage && (
          <div className="flex justify-center py-3">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Empty state */}
        {allMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center px-6">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-foreground">No messages yet</p>
            <p className="text-xs text-muted-foreground mt-1">Send a message to start the conversation</p>
          </div>
        )}

        {/* Messages */}
        <div className="py-2">
          {allMessages.map((msg, idx) => {
            const prev = allMessages[idx - 1];
            const isOwn = msg.sender.clerkId === currentUserClerkId;
            const showAvatar = !isOwn && (
              !prev ||
              prev.senderId !== msg.senderId ||
              new Date(msg.createdAt).getTime() - new Date(prev.createdAt).getTime() > 5 * 60 * 1000
            );
            const showDate =
              !prev || !isSameDay(new Date(msg.createdAt), new Date(prev.createdAt));

            return (
              <div key={msg.id}>
                {showDate && <DateDivider date={new Date(msg.createdAt)} />}
                <MessageBubble
                  message={msg}
                  isOwn={isOwn}
                  showAvatar={showAvatar}
                  showDate={showDate}
                  onReply={onReply}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  currentUserId={currentUserId}
                />
              </div>
            );
          })}
        </div>

        {/* Typing indicator */}
        <TypingIndicator typingUsers={typingUsers} />

        <div ref={bottomRef} className="h-1" />
      </div>

      {/* Scroll to bottom button */}
      <AnimatePresence>
        {!isAtBottom && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            onClick={() => scrollToBottom()}
            className="absolute bottom-4 right-4 z-10 w-10 h-10 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors"
          >
            {newMessageCount > 0 && (
              <span className="absolute -top-2 -right-1 min-w-[18px] h-[18px] rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center px-1">
                {newMessageCount > 9 ? "9+" : newMessageCount}
              </span>
            )}
            <ArrowDown className="w-4 h-4" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
