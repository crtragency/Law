"use client";

import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import {
  createAvatarUploadUrlAction,
  registerAvatarUploadAction,
  updateProfileFormAction,
} from "./actions";
import { IconPaperclip, IconUser } from "@/components/icons";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

interface ProfileManagerProps {
  user: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    profileTitle: string | null;
    avatarStorageKey: string | null;
    roleLabel: string;
  };
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? "جاري الحفظ..." : "حفظ البروفايل"}
    </button>
  );
}

export function ProfileManager({ user }: ProfileManagerProps) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const initials = user.name.trim().slice(0, 1) || "؟";

  async function uploadAvatar() {
    const file = fileRef.current?.files?.[0];
    setMessage(null);
    if (!file) {
      setMessage("اختار صورة الأول");
      return;
    }
    if (!file.type.startsWith("image/")) {
      setMessage("ارفع ملف صورة فقط");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setMessage("أقصى حجم للصورة 5 ميجابايت");
      return;
    }

    setUploading(true);
    try {
      const prep = await createAvatarUploadUrlAction({ fileName: file.name });
      if (!prep.ok) {
        setMessage(prep.error);
        return;
      }
      const put = await fetch(prep.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!put.ok) {
        setMessage("فشل رفع الصورة، جرب تاني");
        return;
      }
      const result = await registerAvatarUploadAction({
        storageKey: prep.storageKey,
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
      });
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      if (fileRef.current) fileRef.current.value = "";
      setMessage("تم تحديث الصورة");
      router.refresh();
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="profile-layout">
      <section className="profile-hero-panel">
        <div className="relative z-10 flex min-h-[300px] flex-col justify-between p-6 text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-brand-100/80">حساب المستخدم</p>
              <h2 className="mt-2 font-display text-3xl font-bold">{user.name}</h2>
              <p className="mt-1 text-sm text-brand-100">{user.profileTitle || user.roleLabel}</p>
            </div>
            <span className="rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold text-brand-50">
              {user.roleLabel}
            </span>
          </div>

          <div className="flex items-end justify-between gap-4">
            <div className="min-w-0">
              <p className="truncate text-sm text-brand-100">{user.email}</p>
              <p className="mt-1 text-xs text-brand-200">{user.phone || "بدون رقم هاتف"}</p>
            </div>
            <div className="h-28 w-28 overflow-hidden rounded-lg border border-white/25 bg-white/10 shadow-2xl shadow-black/20">
              {user.avatarStorageKey ? (
                <img
                  src={`/api/users/${user.id}/avatar`}
                  alt={user.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="grid h-full w-full place-items-center bg-brass-300 text-4xl font-bold text-brand-950">
                  {initials}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="form-panel h-fit space-y-5">
        <div className="form-heading">
          <div>
            <h2 className="form-title">تعديل بياناتي</h2>
            <p className="form-subtitle">الاسم هنا هو الاسم اللي هيظهر لك في النظام والرسائل وسجل الأعمال.</p>
          </div>
        </div>

        <form action={updateProfileFormAction} className="space-y-4">
          <div>
            <label className="label">الاسم المعروض</label>
            <input name="name" required className="field" defaultValue={user.name} />
          </div>
          <div>
            <label className="label">المسمى داخل المكتب</label>
            <input
              name="profileTitle"
              className="field"
              defaultValue={user.profileTitle ?? ""}
              placeholder="مثال: محامي قضايا تجارية"
            />
          </div>
          <div>
            <label className="label">رقم الهاتف</label>
            <input name="phone" className="field" defaultValue={user.phone ?? ""} />
          </div>
          <SubmitButton />
        </form>

        <div className="rounded-lg border border-line bg-paper/70 p-4">
          <div className="mb-3 flex items-center gap-2 font-display text-lg font-bold text-ink">
            <IconUser className="h-5 w-5 text-brand-600" />
            صورة البروفايل
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="field file:ml-3 file:rounded-md file:border-0 file:bg-brand-50 file:px-3 file:py-1 file:text-sm file:font-semibold file:text-brand-700"
          />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button type="button" onClick={uploadAvatar} className="btn-secondary" disabled={uploading}>
              <IconPaperclip className="h-4 w-4" />
              {uploading ? "جاري الرفع..." : "رفع صورة"}
            </button>
            <span className="text-xs text-gray-500">PNG, JPG, WEBP حتى 5 ميجابايت</span>
          </div>
          {message && <p className="mt-3 text-sm font-semibold text-brand-700">{message}</p>}
        </div>
      </section>
    </div>
  );
}
