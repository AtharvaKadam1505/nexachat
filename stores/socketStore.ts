import { create } from "zustand";
import type { TypingPayload, PresencePayload } from "@/types";

interface SocketState {
  isConnected: boolean;
  typingUsers: Record<string, TypingPayload[]>; // conversationId → typing users
  onlineUsers: Record<string, boolean>; // userId → online status
  setConnected: (connected: boolean) => void;
  setTyping: (payload: TypingPayload) => void;
  setPresence: (payload: PresencePayload) => void;
  clearTyping: (conversationId: string, userId: string) => void;
}

export const useSocketStore = create<SocketState>((set) => ({
  isConnected: false,
  typingUsers: {},
  onlineUsers: {},

  setConnected: (connected) => set({ isConnected: connected }),

  setTyping: (payload) =>
    set((state) => {
      const current = state.typingUsers[payload.conversationId] || [];
      const filtered = current.filter((t) => t.userId !== payload.userId);
      const updated = payload.isTyping ? [...filtered, payload] : filtered;
      return {
        typingUsers: {
          ...state.typingUsers,
          [payload.conversationId]: updated,
        },
      };
    }),

  clearTyping: (conversationId, userId) =>
    set((state) => {
      const current = state.typingUsers[conversationId] || [];
      return {
        typingUsers: {
          ...state.typingUsers,
          [conversationId]: current.filter((t) => t.userId !== userId),
        },
      };
    }),

  setPresence: (payload) =>
    set((state) => ({
      onlineUsers: {
        ...state.onlineUsers,
        [payload.userId]: payload.isOnline,
      },
    })),
}));
