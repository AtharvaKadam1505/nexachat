"use client";

import { ChatWindow } from "./ChatWindow";

export function MobileChatWrapper({ conversationId }: { conversationId: string }) {
  return (
    <div className="md:hidden fixed inset-0 z-50 bg-background flex flex-col">
      <ChatWindow conversationId={conversationId} />
    </div>
  );
}
