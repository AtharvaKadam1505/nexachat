export type MessageType = "TEXT" | "IMAGE" | "VIDEO" | "FILE" | "AUDIO" | "SYSTEM";
export type ConversationType = "DIRECT" | "GROUP";
export type DeliveryStatus = "SENT" | "DELIVERED" | "READ";
export type MemberRole = "OWNER" | "ADMIN" | "MEMBER";

export interface User {
  id: string;
  clerkId: string;
  username: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  lastSeenAt: Date | string;
  isOnline: boolean;
  createdAt: Date | string;
}

export interface ConversationMember {
  id: string;
  role: MemberRole;
  isMuted: boolean;
  lastReadAt: Date | string;
  joinedAt: Date | string;
  unreadCount: number;
  userId: string;
  conversationId: string;
  user: User;
}

export interface Message {
  id: string;
  clientMessageId: string;
  content: string | null;
  type: MessageType;
  mediaUrl: string | null;
  mediaMetadata: MediaMetadata | null;
  isEdited: boolean;
  isDeleted: boolean;
  deletedForAll: boolean;
  editedAt: Date | string | null;
  createdAt: Date | string;
  conversationId: string;
  senderId: string;
  replyToId: string | null;
  sender: User;
  replyTo?: Message | null;
  statuses?: MessageStatus[];
}

export interface MediaMetadata {
  size: number;
  mimeType: string;
  width?: number;
  height?: number;
  duration?: number;
  fileName?: string;
}

export interface MessageStatus {
  id: string;
  status: DeliveryStatus;
  messageId: string;
  userId: string;
  updatedAt: Date | string;
}

export interface Conversation {
  id: string;
  type: ConversationType;
  name: string | null;
  avatarUrl: string | null;
  isPinned: boolean;
  isArchived: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  members: ConversationMember[];
  messages?: Message[];
  lastMessage?: Message | null;
  unreadCount?: number;
}

export interface PaginatedMessages {
  messages: Message[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface SendMessagePayload {
  clientMessageId: string;
  conversationId: string;
  content?: string;
  type: MessageType;
  mediaUrl?: string;
  mediaMetadata?: MediaMetadata;
  replyToId?: string;
}

export interface TypingPayload {
  conversationId: string;
  userId: string;
  displayName: string;
  isTyping: boolean;
}

export interface PresencePayload {
  userId: string;
  isOnline: boolean;
  lastSeenAt: string;
}
