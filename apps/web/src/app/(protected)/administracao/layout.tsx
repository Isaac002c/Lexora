import { notFound } from "next/navigation";
import { AdminNav } from "@/features/admin/components/admin-nav";
import { getCurrentUser } from "@/lib/server-api";

export default async function AdministrationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (
    !user ||
    !user.permissions.some((permission) =>
      [
        "user.manage",
        "branch.manage",
        "legal_area.manage",
        "audit.read",
        "tenant.configure",
      ].includes(permission),
    )
  )
    notFound();
  return (
    <>
      <AdminNav permissions={user.permissions} />
      {children}
    </>
  );
}
