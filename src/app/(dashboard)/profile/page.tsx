import { requireUser } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/rbac";
import { PageHeader } from "@/components/ui";
import { ProfileManager } from "./profile-manager";

export const metadata = { title: "البروفايل — نظام مكتب المحاماة" };

export default async function ProfilePage() {
  const user = await requireUser();

  return (
    <div className="space-y-7">
      <PageHeader
        title="البروفايل"
        subtitle="تحكم في اسمك وصورتك وبيانات ظهورك داخل نظام المكتب."
      />
      <ProfileManager
        user={{
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          profileTitle: user.profileTitle,
          avatarStorageKey: user.avatarStorageKey,
          roleLabel: ROLE_LABELS[user.role],
        }}
      />
    </div>
  );
}
