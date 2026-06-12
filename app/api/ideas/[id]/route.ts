import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ideas } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";

async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

// PATCH /api/ideas/[id] — actualiza campos de una idea
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id } = await params;
  const patch = await req.json();

  await db
    .update(ideas)
    .set({
      ...(patch.title !== undefined && { title: patch.title }),
      ...(patch.summary !== undefined && { summary: patch.summary }),
      ...(patch.tags !== undefined && { tags: patch.tags }),
      ...(patch.clusterId !== undefined && { clusterId: patch.clusterId }),
      ...(patch.status !== undefined && { status: patch.status }),
      ...(patch.viability !== undefined && { viability: patch.viability }),
      ...(patch.complexity !== undefined && { complexity: patch.complexity }),
      ...(patch.research !== undefined && { research: patch.research }),
      ...(patch.isPublic !== undefined && { isPublic: patch.isPublic }),
    })
    .where(and(eq(ideas.id, id), eq(ideas.userId, session.user.id)));

  return NextResponse.json({ ok: true });
}

// DELETE /api/ideas/[id]
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id } = await params;
  await db.delete(ideas).where(and(eq(ideas.id, id), eq(ideas.userId, session.user.id)));

  return NextResponse.json({ ok: true });
}
