import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create demo users (clerkId values are placeholders - replace with real ones from Clerk dashboard)
  const alice = await db.user.upsert({
    where: { email: "alice@nexachat.dev" },
    update: {},
    create: {
      clerkId: "user_demo_alice",
      username: "alice",
      displayName: "Alice Johnson",
      email: "alice@nexachat.dev",
      avatarUrl: null,
      isOnline: false,
    },
  });

  const bob = await db.user.upsert({
    where: { email: "bob@nexachat.dev" },
    update: {},
    create: {
      clerkId: "user_demo_bob",
      username: "bob",
      displayName: "Bob Smith",
      email: "bob@nexachat.dev",
      avatarUrl: null,
      isOnline: false,
    },
  });

  // Create a conversation
  const conv = await db.conversation.create({
    data: {
      type: "DIRECT",
      members: {
        create: [
          { userId: alice.id, role: "OWNER" },
          { userId: bob.id, role: "MEMBER" },
        ],
      },
    },
  });

  // Seed some messages
  const msgs = ["Hey Alice! 👋", "Hey Bob! How are you?", "Great thanks! Ready to try NexaChat?", "Absolutely, looks amazing! 🚀"];
  const senders = [bob.id, alice.id, bob.id, alice.id];

  for (let i = 0; i < msgs.length; i++) {
    await db.message.create({
      data: {
        clientMessageId: `seed-msg-${i}`,
        conversationId: conv.id,
        senderId: senders[i],
        content: msgs[i],
        type: "TEXT",
      },
    });
  }

  console.log("✅ Seed complete");
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
