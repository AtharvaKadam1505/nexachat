"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@clerk/nextjs";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { ChatHeader } from "./ChatHeader";
import { useSocket } from "@/components/providers/SocketProvider";
import { useSocketStore } from "@/stores/socketStore";
import { SocketEvents } from "@/lib/socket";
import type { Conversation, Message } from "@/types";

interface ChatWindowProps {
  conversationId: string;
}

export function ChatWindow({ conversationId }: ChatWindowProps) {
  const { user: clerkUser } = useUser();
  const socket = useSocket();
  const queryClient = useQueryClient();
  const { typingUsers } = useSocketStore();
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const { data: conversation, isLoading } = useQuery<Conversation>({
    queryKey: ["conversation", conversationId],
    queryFn: async () => {
      const convs = await fetch("/api/conversations").then((r) => r.json()) as Conversation[];
      return convs.find((c) => c.id === conversationId) ?? null;
    },
  });

  const { data: currentUser } = useQuery({
    queryKey: ["me"],
    queryFn: () => fetch("/api/users/me").then((r) => r.json()),
  });

  // Join socket room on mount
  useEffect(() => {
    if (!socket || !conversationId) return;
    socket.emit(SocketEvents.JOIN_CONVERSATION, { conversationId });

    return () => {
      socket.emit(SocketEvents.LEAVE_CONVERSATION, { conversationId });
    };
  }, [socket, conversationId]);

  // Listen for new messages
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (message: Message) => {
      if (message.conversationId !== conversationId) return;
      queryClient.setQueryData(
        ["messages", conversationId],
        (old: { pages: { messages: Message[] }[] } | undefined) => {
          if (!old) return old;
          const lastPage = old.pages[old.pages.length - 1];
          const already = lastPage.messages.some((m) => m.id === message.id || m.clientMessageId === message.clientMessageId);
          if (already) return old;
          return {
            ...old,
            pages: [
              ...old.pages.slice(0, -1),
              { ...lastPage, messages: [...lastPage.messages, message] },
            ],
          };
        }
      );
      // Refresh conversations list for sidebar
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    };

    const handleMessageUpdated = (message: Message) => {
      queryClient.setQueryData(
        ["messages", conversationId],
        (old: { pages: { messages: Message[] }[] } | undefined) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              messages: page.messages.map((m) => m.id === message.id ? message : m),
            })),
          };
        }
      );
    };

    socket.on(SocketEvents.MESSAGE_RECEIVED, handleNewMessage);
    socket.on(SocketEvents.MESSAGE_UPDATED, handleMessageUpdated);
    socket.on(SocketEvents.MESSAGE_DELETED, handleMessageUpdated);

    return () => {
      socket.off(SocketEvents.MESSAGE_RECEIVED, handleNewMessage);
      socket.off(SocketEvents.MESSAGE_UPDATED, handleMessageUpdated);
      socket.off(SocketEvents.MESSAGE_DELETED, handleMessageUpdated);
    };
  }, [socket, conversationId, queryClient]);

  const handleSend = useCallback(async (content: string, replyToId?: string, mediaFile?: File) => {
    if (!currentUser) return;

    const clientMessageId = uuidv4();
    let mediaUrl: string | undefined;
    let mediaMetadata: object | undefined;

    // Upload file if present
    if (mediaFile) {
      try {
        const presignRes = await fetch("/api/uploads/presign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: mediaFile.name,
            mimeType: mediaFile.type,
            size: mediaFile.size,
          }),
        }).then((r) => r.json());

        // In production: PUT to presignRes.uploadUrl
        mediaUrl = presignRes.publicUrl;
        mediaMetadata = { size: mediaFile.size, mimeType: mediaFile.type, fileName: mediaFile.name };
      } catch {
        toast.error("Failed to upload file");
        return;
      }
    }

    const type = mediaFile
      ? mediaFile.type.startsWith("image/") ? "IMAGE"
      : mediaFile.type.startsWith("video/") ? "VIDEO"
      : mediaFile.type.startsWith("audio/") ? "AUDIO"
      : "FILE"
      : "TEXT";

    const payload = {
      clientMessageId,
      conversationId,
      content: content || undefined,
      type,
      mediaUrl,
      mediaMetadata,
      replyToId,
    };

    // Optimistic insert
    const optimisticMsg: Message = {
      id: clientMessageId,
      clientMessageId,
      content: content || null,
      type: type as Message["type"],
      mediaUrl: mediaUrl ?? null,
      mediaMetadata: null,
      isEdited: false,
      isDeleted: false,
      deletedForAll: false,
      editedAt: null,
      createdAt: new Date().toISOString(),
      conversationId,
      senderId: currentUser.id,
      replyToId: replyToId ?? null,
      sender: currentUser,
      statuses: [],
    };

    queryClient.setQueryData(
      ["messages", conversationId],
      (old: { pages: { messages: Message[] }[] } | undefined) => {
        if (!old) return old;
        const lastPage = old.pages[old.pages.length - 1];
        return {
          ...old,
          pages: [
            ...old.pages.slice(0, -1),
            { ...lastPage, messages: [...lastPage.messages, optimisticMsg] },
          ],
        };
      }
    );

    setReplyTo(null);

    try {
      const saved = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then((r) => r.json());

      // Replace optimistic with real
      queryClient.setQueryData(
        ["messages", conversationId],
        (old: { pages: { messages: Message[] }[] } | undefined) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              messages: page.messages.map((m) => m.clientMessageId === clientMessageId ? saved : m),
            })),
          };
        }
      );

      // Broadcast via socket
      socket?.emit(SocketEvents.SEND_MESSAGE, saved);
    } catch {
      toast.error("Failed to send message");
      queryClient.setQueryData(
        ["messages", conversationId],
        (old: { pages: { messages: Message[] }[] } | undefined) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              messages: page.messages.filter((m) => m.clientMessageId !== clientMessageId),
            })),
          };
        }
      );
    }
  }, [currentUser, conversationId, queryClient, socket]);

  const handleDelete = useCallback(async (messageId: string, scope: "self" | "all") => {
    try {
      await fetch(`/api/messages/${messageId}?scope=${scope}`, { method: "DELETE" });
      queryClient.setQueryData(
        ["messages", conversationId],
        (old: { pages: { messages: Message[] }[] } | undefined) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              messages: page.messages.map((m) =>
                m.id === messageId
                  ? { ...m, isDeleted: true, deletedForAll: scope === "all", content: null }
                  : m
              ),
            })),
          };
        }
      );
      socket?.emit(SocketEvents.DELETE_MESSAGE, { messageId, scope, conversationId });
    } catch {
      toast.error("Failed to delete message");
    }
  }, [conversationId, queryClient, socket]);

  const handleTypingStart = useCallback(() => {
    if (!currentUser) return;
    socket?.emit(SocketEvents.TYPING_START, {
      conversationId,
      userId: currentUser.id,
      displayName: currentUser.displayName,
    });
  }, [socket, conversationId, currentUser]);

  const handleTypingStop = useCallback(() => {
    if (!currentUser) return;
    socket?.emit(SocketEvents.TYPING_STOP, {
      conversationId,
      userId: currentUser.id,
      displayName: currentUser.displayName,
    });
  }, [socket, conversationId, currentUser]);

  const handleHeaderAction = useCallback(async (action: string) => {
    if (action === "archive") {
      await fetch(`/api/conversations/${conversationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isArchived: true }),
      });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      toast.success("Conversation archived");
    }
  }, [conversationId, queryClient]);

  if (isLoading || !conversation) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="space-y-3 w-full max-w-sm px-8">
          <div className="h-12 bg-muted rounded-xl animate-pulse" />
          <div className="h-4 bg-muted rounded-full w-3/4 animate-pulse" />
          <div className="h-4 bg-muted rounded-full w-1/2 animate-pulse" />
        </div>
      </div>
    );
  }

  const convTypingUsers = typingUsers[conversationId] ?? [];

  return (
    <div className="flex flex-col h-full">
      <ChatHeader conversation={conversation} onAction={handleHeaderAction} />

      <MessageList
        conversationId={conversationId}
        currentUserId={currentUser?.id ?? ""}
        currentUserClerkId={clerkUser?.id ?? ""}
        typingUsers={convTypingUsers}
        onReply={setReplyTo}
        onEdit={setEditingMessage}
        onDelete={handleDelete}
      />

      <MessageInput
        onSend={handleSend}
        onTypingStart={handleTypingStart}
        onTypingStop={handleTypingStop}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
      />
    </div>
  );
}
