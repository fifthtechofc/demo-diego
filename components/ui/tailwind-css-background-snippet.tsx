import { cn } from "@/lib/utils";

type HeroProps = {
  className?: string;
  children?: React.ReactNode;
  /**
   * `true` — gradient only inside this box (e.g. main column next to sidebar).
   * `false` — full viewport layer (standalone / demo).
   */
  contained?: boolean;
};

export const Hero = ({ className, children, contained = false }: HeroProps) => {
  return (
    <div
      className={cn(
        "relative isolate w-full",
        contained ? "flex min-h-full flex-col" : "min-h-dvh",
        className,
      )}
    >
      <div
        aria-hidden
        className={cn(
          "pointer-events-none z-0 [background:radial-gradient(125%_125%_at_50%_10%,#000_40%,#fff_100%)]",
          contained ? "absolute inset-0" : "fixed inset-0",
        )}
      />
      {children != null ? (
        <div
          className={cn(
            "relative z-10",
            contained ? "flex min-h-full flex-1 flex-col" : "min-h-dvh",
          )}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
};
