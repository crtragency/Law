"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { ensurePermission, AuthError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getClientIp, verifySameOrigin } from "@/lib/request";
import { createSignedUploadUrl, storageConfigured } from "@/lib/storage";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

const profileSchema = z.object({
  name: z.string().trim().min(2, "الاسم قصير جدا").max(100),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  profileTitle: z.string().trim().max(80).optional().or(z.literal("")),
});

const avatarRequestSchema = z.object({
  fileName: z.string().trim().min(1).max(200),
});

const avatarRegisterSchema = z.object({
  storageKey: z.string().min(1).max(600),
  fileName: z.string().trim().min(1).max(200),
  mimeType: z.string().trim().min(1).max(120),
  sizeBytes: z.number().int().positive().max(MAX_AVATAR_BYTES),
});

function safeFileName(fileName: string) {
  return fileName.replace(/[^\w.\-\u0600-\u06FF]+/g, "_").slice(-100);
}

async function getActor() {
  if (!(await verifySameOrigin())) return null;
  try {
    return await ensurePermission("search.view");
  } catch (e) {
    if (e instanceof AuthError) return null;
    throw e;
  }
}

export async function updateProfileFormAction(formData: FormData) {
  const actor = await getActor();
  if (!actor) return;

  const parsed = profileSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone") ?? "",
    profileTitle: formData.get("profileTitle") ?? "",
  });
  if (!parsed.success) return;

  await prisma.user.update({
    where: { id: actor.id },
    data: {
      name: parsed.data.name,
      phone: parsed.data.phone || null,
      profileTitle: parsed.data.profileTitle || null,
    },
  });
  await audit({
    action: "profile.update",
    userId: actor.id,
    entity: "User",
    entityId: actor.id,
    ip: await getClientIp(),
  });
  revalidatePath("/profile");
  revalidatePath("/dashboard");
}

export async function createAvatarUploadUrlAction(input: {
  fileName: string;
}): Promise<
  | { ok: true; uploadUrl: string; storageKey: string }
  | { ok: false; error: string }
> {
  const actor = await getActor();
  if (!actor) return { ok: false, error: "طلب غير صالح" };
  if (!storageConfigured()) {
    return { ok: false, error: "رفع الصور غير مفعل بعد" };
  }

  const parsed = avatarRequestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "اسم ملف غير صالح" };

  const storageKey = `profiles/${actor.id}/${crypto.randomUUID()}-${safeFileName(parsed.data.fileName)}`;
  try {
    const uploadUrl = await createSignedUploadUrl(storageKey);
    return { ok: true, uploadUrl, storageKey };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "تعذر تجهيز رفع الصورة" };
  }
}

export async function registerAvatarUploadAction(input: {
  storageKey: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const actor = await getActor();
  if (!actor) return { ok: false, error: "طلب غير صالح" };

  const parsed = avatarRegisterSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "بيانات الصورة غير صالحة" };
  }
  if (!parsed.data.mimeType.startsWith("image/")) {
    return { ok: false, error: "الصورة يجب أن تكون ملف صورة" };
  }
  if (!parsed.data.storageKey.startsWith(`profiles/${actor.id}/`)) {
    return { ok: false, error: "مسار الصورة غير صالح" };
  }

  await prisma.user.update({
    where: { id: actor.id },
    data: {
      avatarStorageKey: parsed.data.storageKey,
      avatarFileName: parsed.data.fileName,
      avatarMimeType: parsed.data.mimeType,
    },
  });
  await audit({
    action: "profile.avatar",
    userId: actor.id,
    entity: "User",
    entityId: actor.id,
    ip: await getClientIp(),
    details: { fileName: parsed.data.fileName, sizeBytes: parsed.data.sizeBytes },
  });
  revalidatePath("/profile");
  revalidatePath("/dashboard");
  return { ok: true };
}
