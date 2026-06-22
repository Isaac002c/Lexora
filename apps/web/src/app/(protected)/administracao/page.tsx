import {
  Activity,
  Building2,
  KeyRound,
  Landmark,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/server-api";

const sections = [
  [
    "Usuários",
    "Contas, perfis, filiais e acessos.",
    "/administracao/usuarios",
    Users,
    "user.manage",
  ],
  [
    "Filiais",
    "Estrutura operacional do escritório.",
    "/administracao/filiais",
    Building2,
    "branch.manage",
  ],
  [
    "Áreas jurídicas",
    "Áreas de atuação e organização jurídica.",
    "/administracao/areas",
    Landmark,
    "legal_area.manage",
  ],
  [
    "Perfis e permissões",
    "Matriz de capacidades dos seis perfis.",
    "/administracao/perfis",
    KeyRound,
    "user.manage",
  ],
  [
    "Auditoria",
    "Rastreabilidade das ações no tenant.",
    "/administracao/auditoria",
    Activity,
    "audit.read",
  ],
  [
    "Segurança",
    "Sessões, senhas e políticas de acesso.",
    "/administracao/seguranca",
    ShieldCheck,
    "user.manage",
  ],
  [
    "Escritório",
    "Identidade visual e dados de contato.",
    "/administracao/configuracoes",
    Settings,
    "tenant.configure",
  ],
] as const;

export default async function AdministrationPage() {
  const user = await getCurrentUser();
  return (
    <>
      <PageHeader
        eyebrow="Governança"
        title="Administração"
        description="Configuração estrutural do tenant, sem misturar a operação jurídica ou financeira."
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {sections
          .filter((section) => user?.permissions.includes(section[4]))
          .map(([title, description, href, Icon]) => (
            <Link key={href} href={href}>
              <Card className="hover:border-primary/50 h-full transition-colors">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">{title}</CardTitle>
                  <Icon className="text-primary h-5 w-5" />
                </CardHeader>
                <CardContent className="text-muted-foreground text-sm">
                  {description}
                </CardContent>
              </Card>
            </Link>
          ))}
      </div>
    </>
  );
}
