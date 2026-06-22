export function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description: string; action?: React.ReactNode }) {
  return <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div>{eyebrow && <p className="text-sm font-medium text-cyan-500">{eyebrow}</p>}<h1 className="mt-1 text-3xl font-semibold tracking-tight">{title}</h1><p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p></div>{action}</div>;
}
