import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { ChatWindow } from "@/components/chat/ChatWindow";

interface ChatPageProps {
  params: Promise<{ id: string }>;
}

export default async function ChatPage({ params }: ChatPageProps) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { id } = await params;

  return (
    <>
      {/* Desktop — renders inside layout main */}
      <div className="hidden md:flex flex-col h-full w-full">
        <ChatWindow conversationId={id} />
      </div>

      {/* Mobile — full screen fixed overlay on top of everything */}
      <div className="md:hidden fixed inset-0 z-50 flex flex-col bg-background">
        <ChatWindow conversationId={id} />
      </div>
    </>
  );
}