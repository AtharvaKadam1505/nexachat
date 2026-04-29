import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { MobileChatWrapper } from "@/components/chat/MobileChatWrapper";

interface ChatPageProps {
  params: Promise<{ id: string }>;
}

export default async function ChatPage({ params }: ChatPageProps) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { id } = await params;

  return (
    <>
      {/* Desktop view: renders inside layout's <main> */}
      <div className="hidden md:flex flex-col h-full w-full">
        <ChatWindow conversationId={id} />
      </div>

      {/* Mobile view: full screen overlay */}
      <MobileChatWrapper conversationId={id} />
    </>
  );
}
