import "server-only";
import { apiFetch } from "./server-api";

export async function fetchData<T>(path: string): Promise<T> {
  const response = await apiFetch(path);
  if (!response.ok) {
    const problem = (await response.json().catch(() => ({}))) as { detail?: string; title?: string };
    throw new Error(problem.detail ?? problem.title ?? "Não foi possível carregar os dados.");
  }
  return response.json() as Promise<T>;
}

export interface LookupOption { id: string; name: string; code?: string; primaryBranchId?: string }
export interface Lookups {
  branches: LookupOption[];
  legalAreas: LookupOption[];
  users: LookupOption[];
  clients: LookupOption[];
  cases: LookupOption[];
}
