"use client";

import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion } from "framer-motion";
import {
  Calendar,
  FilePlus2,
  History,
  Settings,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Separator } from "@/components/ui/separator";

const sidebarVariants = {
  open: { width: "15rem" },
  closed: { width: "3.05rem" },
};

const contentVariants = {
  open: { display: "block", opacity: 1 },
  closed: { display: "block", opacity: 1 },
};

const variants = {
  open: {
    x: 0,
    opacity: 1,
    transition: { x: { stiffness: 1000, velocity: -100 } },
  },
  closed: {
    x: -20,
    opacity: 0,
    transition: { x: { stiffness: 100 } },
  },
};

const transitionProps = {
  type: "tween" as const,
  ease: "easeOut" as const,
  duration: 0.2,
  staggerChildren: 0.1,
};

const staggerVariants = {
  open: {
    transition: { staggerChildren: 0.03, delayChildren: 0.02 },
  },
};

const navItems = [
  { href: "/novo-pdf", label: "Novo PDF", segment: "novo-pdf", icon: FilePlus2 },
  { href: "/calendario", label: "Calendário", segment: "calendario", icon: Calendar },
  { href: "/historico", label: "Histórico", segment: "historico", icon: History },
  { href: "/equipes", label: "Equipes", segment: "equipes", icon: Users },
] as const;

export function SessionNavBar() {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const pathname = usePathname();

  return (
    <motion.div
      className={cn(
        "sidebar relative z-40 h-full shrink-0 self-stretch border-r border-zinc-800",
      )}
      initial={isCollapsed ? "closed" : "open"}
      animate={isCollapsed ? "closed" : "open"}
      variants={sidebarVariants}
      transition={transitionProps}
      onMouseEnter={() => setIsCollapsed(false)}
      onMouseLeave={() => setIsCollapsed(true)}
    >
      <motion.div
        className="relative z-40 flex h-full w-full min-w-0 shrink-0 flex-col bg-zinc-950 text-zinc-400 transition-all"
        variants={contentVariants}
      >
        <motion.div
          variants={staggerVariants}
          className="flex h-full w-full min-w-0 flex-col"
        >
          <div className="flex w-full grow flex-col items-stretch">
            <div className="flex min-h-[76px] w-full shrink-0 items-center border-b border-zinc-800 px-2 py-2">
              <Link
                href="/"
                className={cn(
                  "flex min-w-0 items-center gap-2 bg-transparent px-1 py-0.5 shadow-none",
                  "rounded-none outline-none ring-0 ring-offset-0",
                  "hover:bg-transparent focus:bg-transparent active:bg-transparent",
                  "focus-visible:bg-transparent focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0",
                  "[-webkit-tap-highlight-color:transparent]",
                )}
              >
                <Image
                  src="/images/Logo.png"
                  alt="FifthTech"
                  width={280}
                  height={64}
                  className={cn(
                    "w-auto shrink-0 object-contain object-left invert",
                    isCollapsed ? "h-9 max-w-[2.55rem]" : "h-12 max-w-[13rem]",
                  )}
                  priority
                />
                <motion.span
                  variants={variants}
                  animate={isCollapsed ? "closed" : "open"}
                  className="min-w-0 truncate text-xs font-medium text-zinc-500"
                >
                  {!isCollapsed && "Software That Adapts"}
                </motion.span>
              </Link>
            </div>

            <div className="flex h-full w-full min-h-0 flex-col">
              <div className="flex min-h-0 flex-1 flex-col gap-4">
                <ScrollArea className="min-h-0 flex-1 p-2">
                  <div className="flex w-full flex-col gap-1">
                    {navItems.map(({ href, label, segment, icon: Icon }) => (
                      <Link
                        key={href}
                        href={href}
                        className={cn(
                          "flex h-8 w-full flex-row items-center rounded-md px-2 py-1.5 transition hover:bg-zinc-900 hover:text-zinc-100",
                          pathname?.includes(segment) &&
                            "bg-zinc-900 text-white",
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <motion.span
                          variants={variants}
                          animate={isCollapsed ? "closed" : "open"}
                          className="min-w-0"
                        >
                          {!isCollapsed && (
                            <p className="ml-2 truncate text-sm font-medium">
                              {label}
                            </p>
                          )}
                        </motion.span>
                      </Link>
                    ))}
                  </div>
                </ScrollArea>
              </div>
              <div className="flex flex-col gap-1 p-2">
                <Separator className="bg-zinc-800" />
                <Link
                  href="/configuracoes"
                  className={cn(
                    "flex h-8 w-full flex-row items-center rounded-md px-2 py-1.5 transition hover:bg-zinc-900 hover:text-zinc-100",
                    pathname?.includes("configuracoes") &&
                      "bg-zinc-900 text-white",
                  )}
                >
                  <Settings className="h-4 w-4 shrink-0" />
                  <motion.span
                    variants={variants}
                    animate={isCollapsed ? "closed" : "open"}
                  >
                    {!isCollapsed && (
                      <p className="ml-2 text-sm font-medium">Configurações</p>
                    )}
                  </motion.span>
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
