import { Search } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

export function SearchForm({ defaultValue, placeholder = "Buscar...", children }: { defaultValue?: string; placeholder?: string; children?: React.ReactNode }) {
  return <form className="mb-5 flex flex-wrap items-center gap-2"><div className="relative min-w-64 flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input name="search" defaultValue={defaultValue} placeholder={placeholder} className="pl-9" /></div>{children}<Button type="submit" variant="secondary">Filtrar</Button></form>;
}
