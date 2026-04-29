import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

const updateSchema = z.object({
  name: z.string().optional(),
  isPinned: z.boolean().optional(),
  isArchived: z.boolean().optional(),
  isMuted: z.boolean().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;
  const user = await db.user.findUnique({ where: { clerkId } });
  if (!user) return new NextResponse("User not found", { status: 404 });

  const membership = await db.conversationMember.findUnique({
    where: { userId_conversationId: { userId: user.id, conversationId: id } },
  });
  if (!membership) return new NextResponse("Not a member", { status: 403 });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ errors: parsed.error.errors }, { status: 400 });

  const { name, isPinned, isArchived, isMuted } = parsed.data;

  if (isPinned !== undefined || isArchived !== undefined || name !== undefined) {
    await db.conversation.update({
      where: { id },
      data: { ...(name && { name }), ...(isPinned !== undefined && { isPinned }), ...(isArchived !== undefined && { isArchived }) },
    });
  }

  if (isMuted !== undefined) {
    await db.conversationMember.update({
      where: { userId_conversationId: { userId: user.id, conversationId: id } },
      data: { isMuted },
    });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;
  const user = await db.user.findUnique({ where: { clerkId } });
  if (!user) return new NextResponse("User not found", { status: 404 });

  await db.conversationMember.delete({
    where: { userId_conversationId: { userId: user.id, conversationId: id } },
  });

  return NextResponse.json({ success: true });
}
