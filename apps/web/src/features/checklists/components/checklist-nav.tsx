import { ModuleNav } from "@/features/shared/components/module-nav";
export function ChecklistNav() { return <ModuleNav items={[{ label: "Modelos", href: "/checklists/modelos" }, { label: "Por processo", href: "/checklists/processos" }, { label: "Pendências", href: "/checklists/pendencias" }]} />; }
