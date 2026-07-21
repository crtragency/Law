"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePortalClient } from "@/lib/portal-session";
import { audit } from "@/lib/audit";
import { getClientIp, verifySameOrigin } from "@/lib/request";

export async function signPortalContractAction(formData: FormData): Promise<void> {
  if (!(await verifySameOrigin())) return;
  const client = await requirePortalClient();
  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/portal");

  const contract = await prisma.contract.findFirst({
    where: {
      id,
      clientId: client.id,
      status: "SENT",
    },
    select: { id: true },
  });

  if (contract) {
    await prisma.contract.update({
      where: { id: contract.id },
      data: { status: "CLIENT_SIGNED" },
    });
    await audit({
      action: "contract.client_sign",
      entity: "Contract",
      entityId: contract.id,
      ip: await getClientIp(),
      details: { clientId: client.id, method: "portal" },
    });
    revalidatePath("/portal");
    revalidatePath(`/portal/contracts/${contract.id}`);
    revalidatePath(`/contracts/${contract.id}`);
  }

  redirect(`/portal/contracts/${id}`);
}
