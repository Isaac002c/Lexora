# Chronostek — Sistema de Gestão Jurídica Inteligente

Plataforma SaaS multi-tenant para escritórios de advocacia. O repositório separa a interface Next.js da API Express e centraliza contratos, autorização e persistência em packages compartilhados.

## Requisitos

- Node.js 22 ou superior
- pnpm 10
- PostgreSQL 17 (ou Docker com Compose)

## Primeiros passos

```bash
cp .env.example .env
pnpm install
docker compose up -d postgres
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm dev
```

No Windows PowerShell, use `Copy-Item .env.example .env` no lugar de `cp`.

- Frontend: http://localhost:3000
- API: http://localhost:3333
- Health check: http://localhost:3333/health

### Acesso de demonstração

- Tenant: `demo-chronostek`
- Senha inicial de todos os usuários do seed: `Chronostek@123`
- Administradores (entram direto, sem troca de senha): `douglas@demo.chronostek.com.br` e `marina@demo.chronostek.com.br`
- Demais perfis (secretaria, advogado, financeiro, visualizador): trocam a senha obrigatoriamente no primeiro acesso.

### Banco local sem Docker

Este workspace também pode usar o cluster isolado em `.postgres/data`, na porta `55432`, quando PostgreSQL estiver instalado no Windows:

```powershell
pnpm db:local:start
pnpm dev
```

Use `pnpm db:local:status` para verificar e `pnpm db:local:stop` para encerrar o banco local.

## Scripts

- `pnpm dev`: inicia web e API.
- `pnpm build`: gera os builds de produção.
- `pnpm lint`: executa verificações estáticas.
- `pnpm typecheck`: valida TypeScript.
- `pnpm test`: executa a suíte de testes.
- `pnpm db:migrate`: cria/aplica migration de desenvolvimento.
- `pnpm db:deploy`: aplica migrations existentes em produção.
- `pnpm db:seed`: cria os dados iniciais de demonstração.

## Segurança

O tenant nunca é recebido do corpo da requisição. A API resolve tenant, filiais e permissões a partir da sessão e aplica isolamento adicional no PostgreSQL. Arquivos são privados e baixados somente por rotas autorizadas.

Consulte `docs/` para arquitetura, homologação e produção quando essas etapas forem concluídas.

## Documentação operacional

- `docs/ARCHITECTURE.md`: componentes e limites de confiança.
- `docs/SECURITY.md`: isolamento, credenciais e dados sensíveis.
- `docs/HOMOLOGACAO.md`: roteiro dos testes dos usuários.
- `docs/DEPLOY.md`: Vercel, VPS, migrations, backup e monitoramento.
- `docs/MVP_STATUS.md`: matriz do escopo implementado e integrações futuras.
