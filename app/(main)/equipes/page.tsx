import { AnimatedText } from "@/components/ui/animated-text";
import { TeamSection } from "@/components/ui/team-section-1";
import { Facebook, Instagram, Linkedin, Twitter, Users } from "lucide-react";

export default function EquipesPage() {
  const members = [
    {
      name: "Camila Rocha",
      designation: "Instrumentadora Cirúrgica • Centro Cirúrgico",
      imageSrc:
        "https://images.unsplash.com/photo-1761234852472-85aeea9c3eac?auto=format&fit=crop&w=600&h=600&crop=faces&q=80",
      socialLinks: [
        { icon: Linkedin, href: "#" },
        { icon: Twitter, href: "#" },
      ],
    },
    {
      name: "Rafael Mendes",
      designation: "Instrumentador Cirúrgico • Ortopedia",
      imageSrc:
        "https://images.unsplash.com/photo-1622253694238-3b22139576c6?auto=format&fit=crop&w=600&h=600&crop=faces&q=80",
      socialLinks: [
        { icon: Linkedin, href: "#" },
        { icon: Instagram, href: "#" },
      ],
    },
    {
      name: "Bruna Almeida",
      designation: "Instrumentadora Cirúrgica • Cardiologia",
      imageSrc:
        "https://images.unsplash.com/photo-1632052999485-d748103abf98?auto=format&fit=crop&w=600&h=600&crop=faces&q=80",
      socialLinks: [
        { icon: Facebook, href: "#" },
        { icon: Instagram, href: "#" },
      ],
    },
  ];

  return (
    <div className="p-8">
      <AnimatedText
        text="Equipes"
        className="items-start justify-start"
        textClassName="text-left text-2xl font-semibold tracking-tight text-zinc-100"
      />

      <div className="mt-8">
        <TeamSection
          title="EQUIPE DE INSTRUMENTAÇÃO"
          description="Profissionais especializados em instrumentação cirúrgica, atuando lado a lado com a equipe médica para garantir segurança, organização e agilidade em cada procedimento."
          members={members}
          logo={
            <span className="inline-flex items-center gap-2">
              <Users className="h-6 w-6" />
              FifthTech
            </span>
          }
        />
      </div>
    </div>
  );
}
