import { redirect } from "next/navigation";

// §10 — Módulo Documentos desativado na operação: neste momento não há upload de
// arquivos. Os dados e arquivos antigos permanecem preservados no banco (tabelas
// documents/stored_files e a API intactas) para eventual reativação futura;
// apenas a tela operacional foi desativada, redirecionando para o painel.
export default function DocumentsPage() {
  redirect("/dashboard");
}
