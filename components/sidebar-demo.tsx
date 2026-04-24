"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";

import { SiteFooter } from "@/components/site-footer";
import { Hero } from "@/components/ui/tailwind-css-background-snippet";
import { SessionNavBar } from "@/components/ui/sidebar";

export function SidebarDemo({ children }: { children?: ReactNode }) {
  return (
    <div className="flex h-screen w-screen min-h-0 flex-row bg-zinc-950">
      <SessionNavBar />
      <main className="relative flex min-h-0 min-w-0 flex-1 flex-col border-l border-zinc-900 text-zinc-200">
        <div className="pointer-events-none absolute right-6 top-5 z-30 sm:right-8 sm:top-6">
          <Link
            href="/"
            className="pointer-events-auto block outline-none ring-offset-zinc-950 focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-2"
            aria-label="Ir para início"
          >
            <Image
              src="/images/Logo.png"
              alt=""
              width={280}
              height={64}
              className="h-12 w-auto max-w-[14rem] object-contain object-right brightness-0 invert sm:h-14 sm:max-w-[17rem]"
              priority
            />
          </Link>
        </div>
        <div className="min-h-0 flex-1 overflow-auto">
          <Hero contained className="min-h-full">
            {children}
          </Hero>
        </div>
        <SiteFooter />
      </main>
    </div>
  );
}
