export default function Loading() {
  return <div className="animate-pulse space-y-6"><div className="h-8 w-64 rounded bg-muted" /><div className="grid gap-4 md:grid-cols-4">{Array.from({ length: 8 }).map((_, index) => <div key={index} className="h-28 rounded-xl bg-muted" />)}</div></div>;
}
