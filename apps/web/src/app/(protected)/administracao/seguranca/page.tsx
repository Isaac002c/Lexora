import { Clock3, KeyRound, LockKeyhole, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const policies = [
  ["Senhas", "Argon2id e troca obrigatória no primeiro acesso.", KeyRound],
  [
    "Sessões",
    "Expiração absoluta de 12 horas e inatividade de 2 horas.",
    Clock3,
  ],
  [
    "Navegador",
    "Cookie HttpOnly, SameSite Lax e Secure em produção.",
    LockKeyhole,
  ],
  [
    "Isolamento",
    "Tenant derivado da sessão, RLS no PostgreSQL e escopo de filial.",
    ShieldCheck,
  ],
] as const;
export default function SecurityPage() {
  return (
    <>
      <PageHeader
        eyebrow="Políticas ativas"
        title="Segurança e sessões"
        description="Controles aplicados a todos os usuários do tenant."
      />
      <div className="grid gap-4 md:grid-cols-2">
        {policies.map(([title, description, Icon]) => (
          <Card key={title}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">{title}</CardTitle>
              <Icon className="text-primary h-5 w-5" />
            </CardHeader>
            <CardContent className="text-muted-foreground text-sm">
              {description}
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
