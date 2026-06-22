# Checklist de homologação — Chronostek MVP

Execute os cenários com ao menos um usuário de cada perfil e registre resultado, usuário, data e evidência.

## Segurança e acesso

- [ ] Admin geral enxerga as quatro filiais.
- [ ] Gestor enxerga somente sua filial.
- [ ] Advogado enxerga somente processos atribuídos dentro de sua filial.
- [ ] Financeiro acessa contratos e parcelas, mas não administra usuários.
- [ ] Visualizador não vê ações de criação ou alteração.
- [ ] Usuário do tenant A não consegue consultar IDs do tenant B.
- [ ] Logout revoga a sessão e o botão Voltar não restaura dados.
- [ ] Usuário suspenso perde acesso às sessões existentes.

## Operação jurídica

- [ ] Secretaria cria atendimento com filial e área.
- [ ] Atendimento é convertido em cliente e processo uma única vez.
- [ ] Cliente é localizado por nome, e-mail e CPF/CNPJ.
- [ ] Processo recebe responsável interno e advogado.
- [ ] Distribuição registra número, data e histórico.
- [ ] Último andamento permanece visível no detalhe e na lista.
- [ ] Prazos mostram verde, amarelo, vermelho, vermelho escuro e cinza nos limites definidos.
- [ ] Conclusão de prazo altera a cor para cinza.

## Documentos e financeiro

- [ ] PDF, Word e imagem permitida podem ser anexados.
- [ ] Arquivo não permitido e arquivo acima do limite são rejeitados.
- [ ] Usuário sem acesso à filial não baixa o documento.
- [ ] Modelo de checklist é aplicado ao processo.
- [ ] Itens mostram pendência e recebimento.
- [ ] Contrato gera quantidade e soma corretas das parcelas.
- [ ] Parcela vencida e inadimplente há mais de 15 dias recebem cores corretas.
- [ ] Pagamento altera a parcela para paga e gera auditoria.
- [ ] Comprovante de pagamento pode ser anexado e baixado somente por usuário autorizado.
- [ ] Registro de cobrança aparece na linha do tempo do contrato.

## Relatórios e UX

- [ ] Cards do dashboard correspondem aos registros de teste.
- [ ] Filtros nunca ampliam o escopo permitido ao usuário.
- [ ] Listas mostram loading, vazio e erro de forma compreensível.
- [ ] Navegação funciona em desktop e tablet.
- [ ] Relatórios respeitam período, filial e área.
- [ ] Relatórios respeitam responsável e exportam CSV com os mesmos filtros.
- [ ] Calendário alterna corretamente entre mês, semana e lista.
- [ ] Modelos de checklist podem ser criados, editados e aplicados a processos.

## Evidências técnicas antes da liberação

- [ ] `pnpm lint` concluído sem erros.
- [ ] `pnpm typecheck` concluído sem erros.
- [ ] `pnpm test` com teste de RLS aprovado.
- [ ] `pnpm build` concluído sem erros.
- [ ] Backup criado e restauração testada em banco descartável.
- [ ] Health checks web e API respondendo após reinício.
