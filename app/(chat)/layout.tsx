import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { SocketProvider } from "@/components/providers/SocketProvider";
import { Sidebar } from "@/components/chat/Sidebar";

export default async function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId: clerkId } = await auth();
  if (!clerkId) redirect("/sign-in");

  const clerkUser = await currentUser();
  if (clerkUser) {
    const email = clerkUser.emailAddresses[0]?.emailAddress ?? "";
    const displayName =
      [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
      clerkUser.username ||
      "User";
    const username = clerkUser.username || `user_${clerkUser.id.slice(-8)}`;
    try {
      const user = await db.user.upsert({
        where: { clerkId },
        create: { clerkId, username, displayName, email, avatarUrl: clerkUser.imageUrl },
        update: { username, displayName, email, avatarUrl: clerkUser.imageUrl },
      });
      console.log("✅ User synced:", user.id, user.displayName);
    } catch (error) {
      console.error("❌ User sync failed:", error);
    }
  }

  return (
    <SocketProvider>
      {/* 
        Layout strategy:
        - Mobile: Sidebar and chat are both full screen, chat uses fixed overlay
        - Desktop: Sidebar + chat side by side
      */}
      <div className="relative flex h-screen w-screen overflow-hidden bg-background">
        <aside
          className="w-full md:w-80 lg:w-96 flex-shrink-0 h-full border-r"
          style={{ borderColor: "hsl(var(--border))" }}
        >
          <Sidebar />
        </aside>

        {/* Desktop only main — mobile uses fixed overlay in page */}
        <main className="hidden md:flex flex-1 flex-col h-full overflow-hidden">
          {children}
        </main>

        {/* Mobile portal target — children with fixed positioning escape this */}
        <div className="md:hidden">
          {children}
        </div>
      </div>
    </SocketProvider>
  );
}