import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

const createConversationSchema = z.object({
  type: z.enum(["DIRECT", "GROUP"]),
  memberIds: z.array(z.string()).min(1),
  name: z.string().optional(),
});

export async function GET() {
  const { userId: clerkId } = await auth();
  if (!clerkId) return new NextResponse("Unauthorized", { status: 401 });

  const user = await db.user.findUnique({ where: { clerkId } });
  if (!user) return new NextResponse("User not found", { status: 404 });

  const conversations = await db.conversation.findMany({
    where: {
      members: { some: { userId: user.id } },
      isArchived: false,
    },
    include: {
      members: {
        include: { user: true },
      },
      messages: {
        take: 1,
        orderBy: { createdAt: "desc" },
        include: { sender: true },
      },
    },
    orderBy: [{ isPinned: "desc" }, { updatedAt: "desc" }],
  });

  const enriched = conversations.map((conv: typeof conversations[number]) => {
  const myMembership = conv.members.find((m) => m.userId === user.id);
  return {
    ...conv,
    lastMessage: conv.messages[0] ?? null,
    unreadCount: myMembership?.unreadCount ?? 0,
    messages: undefined,
  };
});


  return NextResponse.json(enriched);
}

export async function POST(req: Request) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return new NextResponse("Unauthorized", { status: 401 });

  const user = await db.user.findUnique({ where: { clerkId } });
  if (!user) return new NextResponse("User not found", { status: 404 });

  const body = await req.json();
  const parsed = createConversationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.errors }, { status: 400 });
  }

  const { type, memberIds, name } = parsed.data;

  // For DMs, check if one already exists
  if (type === "DIRECT" && memberIds.length === 1) {
    const existing = await db.conversation.findFirst({
      where: {
        type: "DIRECT",
        AND: [
          { members: { some: { userId: user.id } } },
          { members: { some: { userId: memberIds[0] } } },
        ],
      },
      include: { members: { include: { user: true } }, messages: { take: 1, orderBy: { createdAt: "desc" } } },
    });
    if (existing) return NextResponse.json(existing);
  }

  const allMemberIds = Array.from(new Set([user.id, ...memberIds]));

  const conversation = await db.conversation.create({
    data: {
      type,
      name: type === "GROUP" ? name : null,
      members: {
        create: allMemberIds.map((id) => ({
          userId: id,
          role: id === user.id ? "OWNER" : "MEMBER",
        })),
      },
    },
    include: { members: { include: { user: true } } },
  });

  return NextResponse.json(conversation, { status: 201 });
}
