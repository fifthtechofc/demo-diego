"use client";

import * as React from "react";
import { EventManager, type Event } from "@/components/ui/event-manager";

export type DbEvent = {
  id: string;
  title: string;
  description: string | null;
  start_at: string;
  end_at: string | null;
  color: string | null;
  category: string | null;
  tags: string[] | null;
};

function toUiEvent(e: DbEvent): Event {
  return {
    id: e.id,
    title: e.title,
    description: e.description ?? undefined,
    startTime: new Date(e.start_at),
    endTime: new Date(e.end_at ?? e.start_at),
    color: e.color ?? "blue",
    category: e.category ?? undefined,
    tags: e.tags ?? undefined,
  };
}

export default function CalendarClient({ initial }: { initial: DbEvent[] }) {
  const initialEvents = React.useMemo(() => initial.map(toUiEvent), [initial]);

  return (
    <EventManager
      events={initialEvents}
      onEventCreate={async (event) => {
        await fetch("/api/calendar-events", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            id: event.id,
            title: event.title,
            description: event.description ?? null,
            start_at: event.startTime.toISOString(),
            end_at: event.endTime.toISOString(),
            category: event.category ?? null,
            color: event.color ?? null,
            tags: event.tags ?? [],
            source: "manual",
          }),
        });
      }}
      onEventUpdate={async (id, patch) => {
        await fetch(`/api/calendar-events/${id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            ...(patch.title !== undefined ? { title: patch.title } : {}),
            ...(patch.description !== undefined ? { description: patch.description } : {}),
            ...(patch.startTime !== undefined ? { start_at: patch.startTime.toISOString() } : {}),
            ...(patch.endTime !== undefined ? { end_at: patch.endTime.toISOString() } : {}),
            ...(patch.category !== undefined ? { category: patch.category } : {}),
            ...(patch.color !== undefined ? { color: patch.color } : {}),
            ...(patch.tags !== undefined ? { tags: patch.tags } : {}),
          }),
        });
      }}
      onEventDelete={async (id) => {
        await fetch(`/api/calendar-events/${id}`, { method: "DELETE" });
      }}
      categories={["Procedimento", "Reunião", "Tarefa", "Lembrete", "Pessoal"]}
      availableTags={["PDF", "Importante", "Urgente", "Trabalho", "Pessoal", "Equipe", "Cliente"]}
      defaultView="month"
    />
  );
}

