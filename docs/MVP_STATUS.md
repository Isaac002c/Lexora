> ⚠️ **Status operacional atualizado em `docs/STATUS_MVP_LEXORA_30_JUNHO.md`** (auditoria de 2026-06-22).
> Esta matriz descreve o *escopo de código*; o documento de status é a fonte de verdade sobre o que está
> realmente validado e operacional para a entrega de 30/06.

# Matriz do MVP Chronostek

## Entregue

| Domínio | Capacidades disponíveis |
| --- | --- |
| Autenticação | Login por tenant, sessão opaca HttpOnly, logout, troca obrigatória de senha, revogação e rate limit |
| Multi-tenant | `tenant_id` em entidades operacionais, filtros derivados da sessão, escopo de filial e RLS forçado no PostgreSQL |
| Administração | Usuários, múltiplas filiais por usuário, papéis/permissões, áreas, configurações, segurança e auditoria |
| Dashboard | Indicadores operacionais e financeiros com filtros e atalhos para módulos |
| Atendimentos | Cadastro, edição, filtros, detalhes, histórico e conversão em cliente/processo |
| Clientes | Cadastro, edição, busca por nome/e-mail/CPF-CNPJ, detalhe consolidado e arquivamento |
| Processos | Cadastro, edição, atribuição, distribuição, prazos-chave, último andamento e histórico |
| Prazos | CRUD, prioridades, cores por vencimento, filtros e calendário mensal/semanal/lista |
| Documentos | Upload privado local, validação de tamanho, status, filtros, download autorizado e auditoria |
| Checklists | Modelos por área/tipo, aplicação a processos, atualização de itens e central de pendências |
| Financeiro | Contratos, parcelas, vencimentos, inadimplência de 15 dias, pagamentos, comprovantes e registros de cobrança |
| Relatórios | Indicadores, agrupamentos por área/filial/advogado/status, filtros e exportação CSV |
| Qualidade | TypeScript estrito, validação Zod, lint, testes unitários/HTTP e teste de isolamento RLS real |
| Produção | Docker da API, PostgreSQL, Caddy/TLS, migrations, volumes privados, backup/restauração e frontend Vercel |

## Preparado, sem integração ativa no MVP

- Gateway financeiro, boleto e Pix automáticos.
- WhatsApp e e-mail automáticos.
- Assinatura digital.
- Consulta automática em tribunais.
- Portal externo do cliente.
- Recursos de IA.

Esses itens não aparecem como automações funcionais. A arquitetura separada de API, adapters de armazenamento e entidades tenant-scoped permite adicioná-los sem alterar o isolamento central.
