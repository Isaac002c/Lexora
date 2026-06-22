import {
  ModuleNav,
  type ModuleNavItem,
} from "@/features/shared/components/module-nav";

const items: ModuleNavItem[] = [
  { label: "Visão geral", href: "/administracao", permission: "user.manage" },
  {
    label: "Usuários",
    href: "/administracao/usuarios",
    permission: "user.manage",
  },
  {
    label: "Filiais",
    href: "/administracao/filiais",
    permission: "branch.manage",
  },
  {
    label: "Áreas jurídicas",
    href: "/administracao/areas",
    permission: "legal_area.manage",
  },
  {
    label: "Perfis e permissões",
    href: "/administracao/perfis",
    permission: "user.manage",
  },
  {
    label: "Auditoria",
    href: "/administracao/auditoria",
    permission: "audit.read",
  },
  {
    label: "Segurança",
    href: "/administracao/seguranca",
    permission: "user.manage",
  },
  {
    label: "Escritório",
    href: "/administracao/configuracoes",
    permission: "tenant.configure",
  },
];

export function AdminNav({ permissions }: { permissions: string[] }) {
  return <ModuleNav items={items} permissions={permissions} />;
}
