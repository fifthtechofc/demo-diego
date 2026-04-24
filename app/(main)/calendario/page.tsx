import { AnimatedText } from "@/components/ui/animated-text";
import { createServiceRoleClient } from "@/lib/supabase/server";
import CalendarClient, { type DbEvent } from "./calendar-client";

export default async function CalendarioPage() {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("calendar_events")
    .select("id,title,description,start_at,end_at,color,category,tags")
    .order("start_at", { ascending: true })
    .limit(500);
  if (error) throw new Error(error.message);
  const events = (data ?? []) as DbEvent[];

  return (
    <div className="p-8">
      <AnimatedText
        text="Calendário"
        className="items-start justify-start"
        textClassName="text-left text-2xl font-semibold tracking-tight text-zinc-100"
      />

      <div className="mt-6">
        <CalendarClient initial={events} />
      </div>
    </div>
  );
}
