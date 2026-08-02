import { ModuleNav } from "@/features/shared/components/module-nav";

export function ClientDetailNav({ clientId }: { clientId: string }) {
  return <ModuleNav items={[
    { label: "Visão geral", href: `/clientes/${clientId}` },
    { label: "Checklist", href: `/clientes/${clientId}/checklist` },
  ]} />;
}
