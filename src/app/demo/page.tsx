import type { Metadata } from "next";
import { DemoExperience, type DemoView } from "./demo-experience";

export const metadata: Metadata = {
  title: "جولة تفاعلية | منصة ميزان",
  description:
    "نسخة تجريبية تفاعلية من منصة ميزان لإدارة مكاتب المحاماة.",
  robots: { index: false, follow: false },
};

const allowedViews: DemoView[] = [
  "dashboard",
  "cases",
  "clients",
  "tasks",
  "calendar",
  "finance",
  "contracts",
  "documents",
];

export default async function DemoPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view } = await searchParams;
  const initialView = allowedViews.includes(view as DemoView)
    ? (view as DemoView)
    : "dashboard";

  return <DemoExperience initialView={initialView} />;
}
