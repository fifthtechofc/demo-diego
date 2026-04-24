import { AnimatedText } from "@/components/ui/animated-text";

export default function CalendarioPage() {
  return (
    <div className="p-8">
      <AnimatedText
        text="Calendário"
        className="items-start justify-start"
        textClassName="text-left text-2xl font-semibold tracking-tight text-zinc-100"
      />
    </div>
  );
}
