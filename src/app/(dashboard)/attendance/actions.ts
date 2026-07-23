"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentWorkDate } from "@/lib/attendance";
import { verifySameOrigin, getClientIp, getUserAgent } from "@/lib/request";
import { audit } from "@/lib/audit";

export async function clockInAction(): Promise<void> {
  if (!(await verifySameOrigin())) return;
  const user = await requireUser();
  const now = new Date();
  const workDate = getCurrentWorkDate(now);
  const ip = await getClientIp();
  const userAgent = await getUserAgent();

  const existing = await prisma.attendanceRecord.findUnique({
    where: { userId_workDate: { userId: user.id, workDate } },
    select: { id: true, clockInAt: true },
  });

  if (existing?.clockInAt) return;

  const record = existing
    ? await prisma.attendanceRecord.update({
        where: { id: existing.id },
        data: {
          clockInAt: now,
          clockInIp: ip,
          clockInUserAgent: userAgent,
        },
      })
    : await prisma.attendanceRecord.create({
        data: {
          userId: user.id,
          workDate,
          clockInAt: now,
          clockInIp: ip,
          clockInUserAgent: userAgent,
        },
      });

  await audit({
    action: "attendance.clock_in",
    userId: user.id,
    entity: "AttendanceRecord",
    entityId: record.id,
    ip,
  });
  revalidatePath("/", "layout");
  revalidatePath("/attendance");
}

export async function clockOutAction(): Promise<void> {
  if (!(await verifySameOrigin())) return;
  const user = await requireUser();
  const now = new Date();
  const workDate = getCurrentWorkDate(now);
  const ip = await getClientIp();
  const userAgent = await getUserAgent();

  const existing = await prisma.attendanceRecord.findUnique({
    where: { userId_workDate: { userId: user.id, workDate } },
    select: { id: true, clockInAt: true, clockOutAt: true },
  });

  if (!existing?.clockInAt || existing.clockOutAt) return;

  const record = await prisma.attendanceRecord.update({
    where: { id: existing.id },
    data: {
      clockOutAt: now,
      clockOutIp: ip,
      clockOutUserAgent: userAgent,
    },
  });

  await audit({
    action: "attendance.clock_out",
    userId: user.id,
    entity: "AttendanceRecord",
    entityId: record.id,
    ip,
  });
  revalidatePath("/", "layout");
  revalidatePath("/attendance");
}
