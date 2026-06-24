# Guia Rápido — Lexora (operação por perfil)

> Material de apoio para o uso do Lexora pelos 5 perfis do escritório. Descreve **apenas
> funcionalidades reais e validadas** do sistema (auditoria 2026-06-23). Onde algo depende de
> decisão do escritório, está marcado como **a definir**.
>
> ⚠️ **Material pronto ≠ usuário treinado.** Este guia habilita o treinamento; o treinamento humano
> de cada usuário deve ser realizado e registrado no checklist da seção 9.

---

## 1. Acesso ao sistema

1. Abra o endereço do sistema (produção: **a definir** pelo escritório).
2. Informe **Ambiente do escritório** (ex.: `demo-chronostek`), **E-mail** e **Senha**.
3. Clique em **Entrar com segurança**.
4. **Primeiro acesso (todos, exceto administradores):** o sistema exige a **troca de senha** antes de continuar.
5. Para sair, use **Sair** no rodapé do menu lateral.

> Cada usuário tem login e senha **individuais**. A sessão expira por inatividade (2h) e no máximo em 12h.

## 2. O que cada perfil enxerga

O menu mostra **apenas** os módulos permitidos ao perfil (e o backend bloqueia acessos indevidos):

| Perfil | Vê no menu | Não acessa |
| --- | --- | --- |
| **Administrador geral** | Tudo, incluindo **Administração** | — |
| **Gestor de filial** | Operação + Financeiro + Relatórios (na sua filial) | Administração de usuários/segurança |
| **Secretaria** | Atendimentos, Clientes, Processos, Prazos, Calendário, Documentos, Checklists | Financeiro, Relatórios, Administração |
| **Advogado** | Clientes, Processos, Prazos, Calendário, Documentos, Checklists (dos seus casos) | Financeiro, Relatórios, Administração |
| **Financeiro** | Dashboard, Clientes, Processos, Documentos, Financeiro, Relatórios | Administração, gestão de prazos |

## 3. Administrador geral

**Fluxo recomendado de implantação:**
1. **Administração → Filiais:** cadastre/confirme as 4 filiais.
2. **Administração → Áreas:** confirme as 7 áreas (Trabalhista, Criminal, Cível, Juizado Cível, Vara Cível, Federal, Administrativo).
3. **Administração → Usuários:** cadastre os 17 usuários, vinculando **papel** e **filial**.
4. **Administração → Auditoria:** acompanhe ações relevantes (quem fez o quê e quando).
5. **Dashboard:** visão consolidada; use os filtros de **filial** e **área**.

## 4. Secretaria

**Como cadastrar um cliente:** Clientes → **Novo cliente** → preencha nome (obrigatório), filial,
responsável, e-mail/telefone, CPF/CNPJ → **Salvar**.
**Como registrar um atendimento:** Atendimentos → **Novo atendimento** → dados do contato, área,
origem, status → **Salvar**. Use o status para a **triagem** (Novo → Em triagem → Aguardando
documentos → Direcionado) e o painel de conversão para **encaminhar/transformar em processo**.
**Como anexar um documento:** Documentos (ou pela ficha do cliente/processo) → enviar arquivo
vinculado ao cliente/processo (fica registrado **quem anexou** e **a data**).

## 5. Advogado

- **Processos:** você vê os processos em que está designado. Abra a ficha para andamentos, prazos, documentos e checklists.
- **Como criar um prazo:** Prazos → **Novo prazo** → título, tipo (inclui **Audiência**), processo, cliente, filial, área, responsável, **vencimento** e prioridade → **Salvar**.
- **Cores do prazo** (seção 8): o sistema sinaliza automaticamente a urgência e marca **Vencido**.
- **Checklists:** atualize o status dos itens (Pendente → Recebido → Analisado) na ficha do processo.

## 6. Gestor de filial

- **Dashboard / Relatórios:** use os filtros por **filial**, **área**, **responsável** e **período**.
- Você enxerga apenas dados da(s) **sua(s) filial(is)**.
- **Prazos críticos:** em Prazos, use as abas **Vencidos**, **Vencem hoje**, **Próximos 5/7 dias**.
- **Pendências:** Documentos e Checklists mostram o que está aguardando.
- **Relatórios:** exporte em **CSV** quando precisar consolidar.

## 7. Financeiro

- **Como cadastrar um contrato:** Financeiro → Contratos → **Novo contrato** → cliente, processo
  (opcional), filial, **honorários**, **custas**, forma/momento de pagamento, **nº de parcelas** e
  **primeiro vencimento** → **Salvar**. O sistema **gera as parcelas** automaticamente.
- **Como registrar um pagamento:** na ficha do contrato ou em Parcelas → **Registrar pagamento**
  (baixa a parcela, registra data e responsável). Anexe o **comprovante** quando houver.
- **Inadimplência:** Financeiro → Inadimplência lista parcelas vencidas há mais de 15 dias (cor **laranja**).
- **Cobrança:** na ficha do contrato, **Registrar contato** grava o follow-up/negociação no histórico.

## 8. Regras de prazo (memorize)

| Situação | Quando | Indicador |
| --- | --- | --- |
| No prazo | mais de 7 dias para vencer | 🟢 verde |
| Atenção | 6 ou 7 dias para vencer | 🟡 amarelo |
| Crítico | 5 dias ou menos | 🔴 vermelho |
| **Vencido** | data já passou | 🟥 **"Vencido"** (texto + vermelho) |

Cores financeiras: 🟢 em dia · 🟡 a vencer · 🔴 vencido · 🟧 inadimplente +15 dias.
Todas as datas seguem o fuso **America/Sao_Paulo**.

## 9. Checklist de treinamento (preencher por usuário)

| Usuário | Perfil | Login OK | Trocou senha | Fez 1 fluxo do seu perfil | Tirou dúvidas | Data | Treinado por |
| --- | --- | --- | --- | --- | --- | --- | --- |
| | | ☐ | ☐ | ☐ | ☐ | | |

> Replicar a linha para os 17 usuários. Marcar um usuário como "treinado" **somente** após ele
> executar, de fato, ao menos um fluxo do seu perfil acompanhado.

## 10. Perguntas frequentes (FAQ)

- **Esqueci minha senha.** O administrador pode redefinir em Administração → Usuários.
- **Não vejo um módulo no menu.** Ele não faz parte das permissões do seu perfil (correto e esperado).
- **Um prazo está vermelho/"Vencido".** Veja a seção 8 — é o indicador de urgência/vencimento.
- **Não consigo abrir um processo de outro advogado.** Cada advogado vê apenas os casos em que está designado.
- **Canal de suporte interno.** **A definir** pelo escritório (e-mail/WhatsApp/responsável de TI).

## 11. Limites conhecidos (para alinhar expectativa)

- **Audiência** é registrada como um **tipo de prazo** (Audiência) e/ou data de audiência no processo — não há uma agenda de audiências separada.
- Integrações automáticas (Pix/boleto, WhatsApp/e-mail, assinatura digital, consulta a tribunais, portal do cliente) **não fazem parte** desta versão.
- Canais de suporte e endereço de produção: **a definir** pelo escritório.
