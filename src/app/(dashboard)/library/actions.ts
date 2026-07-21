"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { ensurePermission, AuthError } from "@/lib/auth";
import { getClientIp, verifySameOrigin } from "@/lib/request";
import { libraryEntrySchema } from "@/lib/validation";

async function requireManage() {
  if (!(await verifySameOrigin())) return null;
  try {
    return await ensurePermission("library.manage");
  } catch (e) {
    if (e instanceof AuthError) return null;
    throw e;
  }
}

export async function saveLibraryEntryFormAction(formData: FormData) {
  const actor = await requireManage();
  if (!actor) return;

  const parsed = libraryEntrySchema.safeParse({
    id: formData.get("id") || undefined,
    title: formData.get("title"),
    type: formData.get("type") || "NOTE",
    summary: formData.get("summary") ?? "",
    content: formData.get("content"),
    tags: formData.get("tags") ?? "",
    jurisdiction: formData.get("jurisdiction") ?? "",
    court: formData.get("court") ?? "",
    sourceUrl: formData.get("sourceUrl") ?? "",
    isPublished: formData.get("isPublished") === "on",
  });
  if (!parsed.success) return;

  const data = {
    title: parsed.data.title,
    type: parsed.data.type,
    summary: parsed.data.summary || null,
    content: parsed.data.content,
    tags: parsed.data.tags || null,
    jurisdiction: parsed.data.jurisdiction || null,
    court: parsed.data.court || null,
    sourceUrl: parsed.data.sourceUrl || null,
    isPublished: parsed.data.isPublished,
  };

  const entry = parsed.data.id
    ? await prisma.legalLibraryEntry.update({ where: { id: parsed.data.id }, data })
    : await prisma.legalLibraryEntry.create({
        data: { ...data, createdById: actor.id },
      });

  await audit({
    action: parsed.data.id ? "library.update" : "library.create",
    userId: actor.id,
    entity: "LegalLibraryEntry",
    entityId: entry.id,
    ip: await getClientIp(),
  });
  revalidatePath("/library");
}

export async function deleteLibraryEntryFormAction(formData: FormData) {
  const actor = await requireManage();
  if (!actor) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await prisma.legalLibraryEntry.delete({ where: { id } }).catch(() => null);
  await audit({
    action: "library.delete",
    userId: actor.id,
    entity: "LegalLibraryEntry",
    entityId: id,
    ip: await getClientIp(),
  });
  revalidatePath("/library");
}
