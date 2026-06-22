# Segurança e isolamento

## Modelo de confiança

O navegador conversa com o BFF do Next.js. O token opaco permanece em cookie HttpOnly e é encaminhado à API como Bearer somente no servidor. A API deriva tenant, permissões e filiais da sessão; IDs de tenant enviados pelo cliente são ignorados.

## Banco

Todas as tabelas operacionais possuem `tenant_id`, chaves compostas evitam vínculos cruzados e a migration `202606170002_tenant_rls` ativa e força Row-Level Security. A role da aplicação em produção deve ser não-superuser e não pode ser dona das tabelas. Cada transação define `app.tenant_id` com `set_config(..., true)`.

## Dados sensíveis

Senhas usam Argon2id. CPF/CNPJ e identidade usam AES-256-GCM; a busca exata de CPF/CNPJ usa HMAC separado por tenant. Tokens são persistidos somente como SHA-256. Arquivos ficam fora da raiz pública, com nome aleatório e download autorizado.

## Verificações obrigatórias antes da produção

- trocar todos os segredos de exemplo;
- limitar CORS ao domínio oficial;
- usar TLS entre Vercel, API e usuários;
- testar restauração do backup;
- provisionar role PostgreSQL sem `BYPASSRLS`;
- configurar rate limit adicional no proxy reverso;
- revisar logs para impedir PII e credenciais;
- adicionar varredura antimalware quando o volume de uploads justificar.
