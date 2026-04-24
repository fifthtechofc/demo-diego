import { AnimatedText } from "@/components/ui/animated-text";

export default function HomePage() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-8">
      <AnimatedText
        text="Início"
        className="items-start justify-start"
        textClassName="text-left text-2xl font-semibold tracking-tight text-zinc-100"
      />
    </div>
  );
}
