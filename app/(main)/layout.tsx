import type { ReactNode } from "react";

import { SidebarDemo } from "@/components/sidebar-demo";

export default function MainLayout({ children }: { children: ReactNode }) {
  return <SidebarDemo>{children}</SidebarDemo>;
}
