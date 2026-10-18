import type { Metadata } from "next";
import { PageEditor } from "@/components/dashboard/page-editor";

export const metadata: Metadata = {
  title: "Page editor",
};

export default function DashboardPageEditorPage() {
  return <PageEditor />;
}
