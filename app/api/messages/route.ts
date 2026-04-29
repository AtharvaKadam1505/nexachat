import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

const sendMessageSchema = z.object({
  clientMessageId: z.string().uuid(),
  conversationId: z.string(),
  content: z.string().max(4000).optional(),
  type: z.enum(["TEXT", "IMAGE", "VIDEO", "FILE", "AUDIO"]).default("TEXT"),
  mediaUrl: z.string().url().optional(),
  mediaMetadata: z.object({
    size: z.number(),
    mimeType: z.string(),
    width: z.number().optional(),
    height: z.number().optional(),
    duration: z.number().optional(),
    fileName: z.string().optional(),
  }).optional(),
  replyToId: z.string().optional(),
});

export async function GET(req: Request) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return new NextResponse("Unauthorized", { status: 401 });

  const url = new URL(req.url);
  const conversationId = url.searchParams.get("conversationId");
  const cursor = url.searchParams.get("cursor");
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50"), 100);

  if (!conversationId) return new NextResponse("conversationId required", { status: 400 });

  const user = await db.user.findUnique({ where: { clerkId } });
  if (!user) return new NextResponse("User not found", { status: 404 });

  const membership = await db.conversationMember.findUnique({
    where: { userId_conversationId: { userId: user.id, conversationId } },
  });
  if (!membership) return new NextResponse("Not a member", { status: 403 });

  const messages = await db.message.findMany({
    where: {
      conversationId,
      ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
    },
    include: {
      sender: true,
      replyTo: { include: { sender: true } },
      statuses: true,
    },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
  });

  const hasMore = messages.length > limit;
  const trimmed = hasMore ? messages.slice(0, limit) : messages;
  const nextCursor = hasMore ? trimmed[trimmed.length - 1].createdAt.toISOString() : null;

  // Reset unread count
  await db.conversationMember.update({
    where: { userId_conversationId: { userId: user.id, conversationId } },
    data: { unreadCount: 0, lastReadAt: new Date() },
  });

  return NextResponse.json({
    messages: trimmed.reverse(),
    nextCursor,
    hasMore,
  });
}

export async function POST(req: Request) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return new NextResponse("Unauthorized", { status: 401 });

  const user = await db.user.findUnique({ where: { clerkId } });
  if (!user) return new NextResponse("User not found", { status: 404 });

  const body = await req.json();
  const parsed = sendMessageSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ errors: parsed.error.errors }, { status: 400 });

  const { clientMessageId, conversationId, content, type, mediaUrl, mediaMetadata, replyToId } = parsed.data;

  const membership = await db.conversationMember.findUnique({
    where: { userId_conversationId: { userId: user.id, conversationId } },
  });
  if (!membership) return new NextResponse("Not a member", { status: 403 });

  // Idempotency check
  const existing = await db.message.findUnique({ where: { clientMessageId } });
  if (existing) return NextResponse.json(existing);

  const message = await db.message.create({
    data: {
      clientMessageId,
      conversationId,
      senderId: user.id,
      content,
      type,
      mediaUrl,
      mediaMetadata: mediaMetadata as object,
      replyToId,
      statuses: {
        create: { userId: user.id, status: "SENT" },
      },
    },
    include: {
      sender: true,
      replyTo: { include: { sender: true } },
      statuses: true,
    },
  });

  // Update conversation updatedAt + increment unread for other members
  await db.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });

  const otherMembers = await db.conversationMember.findMany({
    where: { conversationId, userId: { not: user.id } },
  });

  await db.conversationMember.updateMany({
    where: {
      conversationId,
      userId: { in: otherMembers.map((m) => m.userId) },
      isMuted: false,
    },
    data: { unreadCount: { increment: 1 } },
  });

  return NextResponse.json(message, { status: 201 });
}
