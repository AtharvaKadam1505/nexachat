"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUser, useClerk } from "@clerk/nextjs";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Plus, Settings, LogOut, MessageSquare,
  Users, Archive, BellOff, Pin, X,
} from "lucide-react";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { cn, truncate, formatConversationTime } from "@/lib/utils";
import type { Conversation, User } from "@/types";
import { useSocketStore } from "@/stores/socketStore";

export function Sidebar() {
  const { user: clerkUser } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { onlineUsers } = useSocketStore();

  const [search, setSearch] = useState("");
  const [showNewChat, setShowNewChat] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [showSettings, setShowSettings] = useState(false);

  // On mobile: hide sidebar when a chat is open
  const activeConvId = pathname.split("/chat/")[1];

  const { data: conversations = [], isLoading } = useQuery<Conversation[]>({
    queryKey: ["conversations"],
    queryFn: () => fetch("/api/conversations").then((r) => r.json()),
    refetchInterval: 30000,
  });

  const { data: searchResults = [] } = useQuery<User[]>({
    queryKey: ["users", "search", userSearch],
    queryFn: () =>
      fetch(`/api/users/search?q=${encodeURIComponent(userSearch)}`).then((r) =>
        r.json()
      ),
    enabled: userSearch.length >= 2,
  });

  const createConvMutation = useMutation({
    mutationFn: (memberId: string) =>
      fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "DIRECT", memberIds: [memberId] }),
      }).then((r) => r.json()),
    onSuccess: (conv) => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      router.push(`/chat/${conv.id}`);
      setShowNewChat(false);
      setUserSearch("");
    },
  });

  const updateConvMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: object }) =>
      fetch(`/api/conversations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["conversations"] }),
  });

  const filtered = conversations.filter((c) => {
    const name = getConversationName(c, clerkUser?.id ?? "");
    return name.toLowerCase().includes(search.toLowerCase());
  });

  function getConversationName(conv: Conversation, clerkId: string): string {
    if (conv.type === "GROUP") return conv.name ?? "Group Chat";
    const other = conv.members.find((m) => m.user.clerkId !== clerkId);
    return other?.user.displayName ?? "Unknown";
  }

  function getConversationAvatar(conv: Conversation, clerkId: string) {
    if (conv.type === "GROUP") return null;
    return conv.members.find((m) => m.user.clerkId !== clerkId)?.user ?? null;
  }

  function isOnline(conv: Conversation, clerkId: string): boolean {
    const other = conv.members.find((m) => m.user.clerkId !== clerkId);
    if (!other) return false;
    return onlineUsers[other.user.id] ?? other.user.isOnline;
  }

  return (
    <div
      className={cn(
        "flex-col h-full w-full",
        pathname.includes("/chat/") ? "hidden md:flex" : "flex"
      )}
      style={{ background: "hsl(var(--sidebar-bg))" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
        style={{ borderColor: "hsl(var(--sidebar-border))" }}
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
            <MessageSquare className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-base text-foreground tracking-tight">
            NexaChat
          </span>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <button
            onClick={() => setShowNewChat(true)}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
            title="New conversation"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={cn(
              "p-2 rounded-lg transition-all",
              showSettings
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b flex-shrink-0"
            style={{ borderColor: "hsl(var(--sidebar-border))" }}
          >
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-3">
                {clerkUser && (
                  <UserAvatar
                    user={{
                      displayName:
                        clerkUser.fullName ?? clerkUser.username ?? "Me",
                      avatarUrl: clerkUser.imageUrl,
                      isOnline: true,
                    }}
                    size="md"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-foreground truncate">
                    {clerkUser?.fullName ?? clerkUser?.username ?? "Me"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {clerkUser?.emailAddresses[0]?.emailAddress}
                  </p>
                </div>
              </div>
              <ThemeToggle variant="full" />
              <button
                onClick={() => signOut({ redirectUrl: "/sign-in" })}
                className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search */}
      <div className="px-3 py-2 flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversations…"
            className="w-full bg-muted/60 rounded-xl pl-9 pr-4 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
          />
        </div>
      </div>

      {/* New Chat Modal */}
      <AnimatePresence>
        {showNewChat && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-start justify-center pt-16 px-4"
            style={{
              background: "hsl(var(--background)/80)",
              backdropFilter: "blur(4px)",
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: -10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: -10 }}
              className="w-full max-w-sm rounded-2xl border shadow-xl overflow-hidden"
              style={{
                background: "hsl(var(--card))",
                borderColor: "hsl(var(--border))",
              }}
            >
              <div
                className="flex items-center justify-between px-4 py-3 border-b"
                style={{ borderColor: "hsl(var(--border))" }}
              >
                <h3 className="font-semibold text-sm">New Conversation</h3>
                <button
                  onClick={() => {
                    setShowNewChat(false);
                    setUserSearch("");
                  }}
                  className="p-1 rounded-md hover:bg-muted transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-3">
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    autoFocus
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Search by name or username…"
                    className="w-full bg-muted rounded-xl pl-9 pr-4 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
                <div className="space-y-1 max-h-72 overflow-y-auto">
                  {userSearch.length < 2 && (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      Type at least 2 characters to search
                    </p>
                  )}
                  {userSearch.length >= 2 && searchResults.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      No users found
                    </p>
                  )}
                  {searchResults.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => createConvMutation.mutate(u.id)}
                      disabled={createConvMutation.isPending}
                      className="flex items-center gap-3 w-full px-3 py-2 rounded-xl hover:bg-muted transition-colors text-left disabled:opacity-50"
                    >
                      <UserAvatar user={u} size="sm" showPresence />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {u.displayName}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          @{u.username}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin py-1 min-h-0">
        {/* Loading skeletons */}
        {isLoading && (
          <div className="space-y-1 px-2 pt-1">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl animate-pulse"
              >
                <div className="w-10 h-10 rounded-full bg-muted flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 bg-muted rounded-full w-3/4" />
                  <div className="h-3 bg-muted rounded-full w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center h-40 text-center px-4">
            <MessageSquare className="w-8 h-8 text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">
              {search ? "No conversations found" : "No conversations yet"}
            </p>
            {!search && (
              <button
                onClick={() => setShowNewChat(true)}
                className="mt-2 text-xs text-primary hover:underline"
              >
                Start a new chat
              </button>
            )}
          </div>
        )}

        {/* Conversation items */}
        {filtered.map((conv) => {
          const name = getConversationName(conv, clerkUser?.id ?? "");
          const avatarUser = getConversationAvatar(conv, clerkUser?.id ?? "");
          const online = isOnline(conv, clerkUser?.id ?? "");
          const isActive = activeConvId === conv.id;
          const lastMsg = conv.lastMessage;

          return (
            <motion.div
              key={conv.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              className="relative group px-2"
            >
              <button
                onClick={() => {
                  console.log("Navigating to:", `/chat/${conv.id}`);
                  router.push(`/chat/${conv.id}`);
                }}
                className={cn(
                  "flex items-center gap-3 w-full px-3 py-2.5 rounded-xl transition-all text-left",
                  isActive
                    ? "bg-[hsl(var(--sidebar-active))]"
                    : "hover:bg-[hsl(var(--sidebar-hover))] active:bg-[hsl(var(--sidebar-hover))]"
                )}
              >
                {/* Avatar */}
                {avatarUser ? (
                  <UserAvatar
                    user={{ ...avatarUser, isOnline: online }}
                    size="md"
                    showPresence
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                )}

                {/* Text content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className={cn(
                        "text-sm font-medium truncate",
                        isActive
                          ? "text-[hsl(var(--sidebar-active-text))]"
                          : "text-foreground"
                      )}
                    >
                      {conv.isPinned && (
                        <Pin className="w-3 h-3 inline-block mr-1 opacity-60" />
                      )}
                      {name}
                    </span>
                    <span
                      className={cn(
                        "text-[11px] flex-shrink-0",
                        isActive
                          ? "text-[hsl(var(--sidebar-active-text))]/70"
                          : "text-muted-foreground"
                      )}
                    >
                      {lastMsg ? formatConversationTime(lastMsg.createdAt) : ""}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-1">
                    <p
                      className={cn(
                        "text-xs truncate",
                        isActive
                          ? "text-[hsl(var(--sidebar-active-text))]/80"
                          : "text-muted-foreground"
                      )}
                    >
                      {lastMsg?.isDeleted
                        ? "This message was deleted"
                        : lastMsg?.content
                        ? truncate(lastMsg.content, 36)
                        : lastMsg?.type === "IMAGE"
                        ? "📷 Photo"
                        : lastMsg?.type === "FILE"
                        ? "📎 File"
                        : lastMsg?.type === "AUDIO"
                        ? "🎵 Audio"
                        : ""}
                    </p>
                    {(conv.unreadCount ?? 0) > 0 && !isActive && (
                      <span className="flex-shrink-0 min-w-[18px] h-[18px] rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center px-1">
                        {(conv.unreadCount ?? 0) > 99 ? "99+" : conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>

              {/* Hover action buttons — desktop only */}
              <div
                className={cn(
                  "absolute right-3 top-1/2 -translate-y-1/2",
                  "hidden group-hover:md:flex items-center gap-0.5 rounded-lg p-0.5",
                  "bg-background/90 backdrop-blur-sm border shadow-sm",
                  isActive && "!hidden"
                )}
                style={{ borderColor: "hsl(var(--border))" }}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    updateConvMutation.mutate({
                      id: conv.id,
                      data: { isPinned: !conv.isPinned },
                    });
                  }}
                  className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                  title={conv.isPinned ? "Unpin" : "Pin"}
                >
                  <Pin className="w-3 h-3" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const myMembership = conv.members.find(
                      (m) => m.user.clerkId === clerkUser?.id
                    );
                    updateConvMutation.mutate({
                      id: conv.id,
                      data: { isMuted: !myMembership?.isMuted },
                    });
                  }}
                  className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                  title="Mute"
                >
                  <BellOff className="w-3 h-3" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    updateConvMutation.mutate({
                      id: conv.id,
                      data: { isArchived: true },
                    });
                  }}
                  className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                  title="Archive"
                >
                  <Archive className="w-3 h-3" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}