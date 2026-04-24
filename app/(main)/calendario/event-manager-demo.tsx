"use client";

import { EventManager, type Event } from "@/components/ui/event-manager";

export default function EventManagerDemo() {
  const demoEvents: Event[] = [
    {
      id: "1",
      title: "Daily da equipe",
      description: "Alinhamento rápido com a equipe para discutir andamento e impedimentos",
      startTime: new Date(2025, 9, 20, 9, 0),
      endTime: new Date(2025, 9, 20, 9, 30),
      color: "blue",
      category: "Reunião",
      attendees: ["Alice", "Bob", "Charlie"],
      tags: ["Trabalho", "Equipe"],
    },
    {
      id: "2",
      title: "Revisão de design",
      description: "Revisar os novos mockups do redesign do dashboard com stakeholders",
      startTime: new Date(2025, 9, 20, 14, 0),
      endTime: new Date(2025, 9, 20, 15, 30),
      color: "purple",
      category: "Reunião",
      attendees: ["Sarah", "Mike"],
      tags: ["Importante", "Cliente"],
    },
    {
      id: "3",
      title: "Revisão de código",
      description: "Revisar pull requests da funcionalidade de autenticação",
      startTime: new Date(2025, 9, 21, 10, 0),
      endTime: new Date(2025, 9, 21, 11, 0),
      color: "green",
      category: "Tarefa",
      tags: ["Trabalho", "Urgente"],
    },
    {
      id: "4",
      title: "Apresentação para cliente",
      description: "Apresentar roadmap e novidades do trimestre para stakeholders",
      startTime: new Date(2025, 9, 22, 15, 0),
      endTime: new Date(2025, 9, 22, 16, 30),
      color: "orange",
      category: "Reunião",
      attendees: ["John", "Emma", "David"],
      tags: ["Importante", "Cliente"],
    },
    {
      id: "5",
      title: "Academia",
      description: "Treino no fim do dia",
      startTime: new Date(2025, 9, 20, 18, 0),
      endTime: new Date(2025, 9, 20, 19, 0),
      color: "pink",
      category: "Pessoal",
      tags: ["Pessoal"],
    },
    {
      id: "6",
      title: "Planejamento da sprint",
      description: "Planejar tarefas e estimar pontos para a próxima sprint",
      startTime: new Date(2025, 9, 23, 10, 0),
      endTime: new Date(2025, 9, 23, 12, 0),
      color: "blue",
      category: "Reunião",
      attendees: ["Team"],
      tags: ["Trabalho", "Equipe", "Importante"],
    },
    {
      id: "7",
      title: "Consulta médica",
      description: "Check-up anual",
      startTime: new Date(2025, 9, 24, 11, 0),
      endTime: new Date(2025, 9, 24, 12, 0),
      color: "red",
      category: "Pessoal",
      tags: ["Pessoal", "Importante"],
    },
    {
      id: "8",
      title: "Deploy em produção",
      description: "Publicar a versão 2.5.0 com melhorias e correções",
      startTime: new Date(2025, 9, 25, 16, 0),
      endTime: new Date(2025, 9, 25, 17, 0),
      color: "green",
      category: "Tarefa",
      tags: ["Trabalho", "Urgente"],
    },
    {
      id: "9",
      title: "Café com a Sarah",
      description: "Colocar o papo em dia no café novo do centro",
      startTime: new Date(2025, 9, 26, 15, 0),
      endTime: new Date(2025, 9, 26, 16, 0),
      color: "pink",
      category: "Pessoal",
      tags: ["Pessoal"],
    },
    {
      id: "10",
      title: "Revisão de orçamento",
      description: "Revisar o orçamento do trimestre com o financeiro",
      startTime: new Date(2025, 9, 27, 13, 0),
      endTime: new Date(2025, 9, 27, 14, 30),
      color: "orange",
      category: "Reunião",
      attendees: ["Finance Team"],
      tags: ["Trabalho", "Importante"],
    },
  ];

  return (
    <div className="w-full">
      <EventManager
        events={demoEvents}
        onEventCreate={(event) => console.log("Criado:", event)}
        onEventUpdate={(id, event) => console.log("Atualizado:", id, event)}
        onEventDelete={(id) => console.log("Excluído:", id)}
        categories={["Reunião", "Tarefa", "Lembrete", "Pessoal"]}
        availableTags={["Importante", "Urgente", "Trabalho", "Pessoal", "Equipe", "Cliente"]}
        defaultView="month"
      />
    </div>
  );
}

