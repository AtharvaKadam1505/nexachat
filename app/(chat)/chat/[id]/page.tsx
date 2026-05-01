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
    <div className="fixed inset-0 z-[9999] bg-red-500 flex items-center justify-center md:relative md:bg-transparent md:block md:h-full md:w-full">
      <p className="text-white text-xl md:hidden">MOBILE CHAT LOADING: {id}</p>
      <div className="hidden md:flex flex-col h-full w-full">
        <ChatWindow conversationId={id} />
      </div>
    </div>
  );
}