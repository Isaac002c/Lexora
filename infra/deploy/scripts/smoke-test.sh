#!/bin/sh
# Smoke test do ambiente PUBLICADO (ETAPA 9 do plano de implantacao).
# Valida saude, TLS/HSTS, autenticacao negada, CORS nao-permissivo e cookie seguro.
#
# SEGURANCA: nao contem segredos. Credenciais de login sao opcionais e vem do ambiente,
# nunca por argumento (evita vazar em historico de shell).
#
# Uso:
#   API_BASE=https://api.SEU_DOMINIO WEB_BASE=https://app.SEU_DOMINIO sh scripts/smoke-test.sh
# Checks autenticados (opcionais), forneca:
#   SMOKE_EMAIL=... SMOKE_PASSWORD=...   (usuario de teste; ideal: perfil de baixo privilegio)
set -u

API_BASE="${API_BASE:-}"
WEB_BASE="${WEB_BASE:-}"
[ -n "$API_BASE" ] || { echo "ERRO: defina API_BASE=https://api.SEU_DOMINIO" >&2; exit 2; }

PASS=0
FAIL=0
ok()   { echo "  [PASS] $1"; PASS=$((PASS+1)); }
bad()  { echo "  [FAIL] $1"; FAIL=$((FAIL+1)); }

echo "== API: $API_BASE =="

# 1. Health 200
code="$(curl -s -o /dev/null -w '%{http_code}' "$API_BASE/health" || echo 000)"
[ "$code" = "200" ] && ok "GET /health -> 200" || bad "GET /health -> $code (esperado 200)"

# 2. TLS valido (curl falha em cert invalido sem -k)
curl -sf -o /dev/null "$API_BASE/health" && ok "TLS valido (sem -k)" || bad "TLS invalido ou indisponivel"

# 3. HSTS presente
hsts="$(curl -sI "$API_BASE/health" | tr -d '\r' | grep -i '^strict-transport-security:' || true)"
[ -n "$hsts" ] && ok "Header HSTS presente" || bad "Header HSTS ausente"

# 4. Rota autenticada sem token -> 401
code="$(curl -s -o /dev/null -w '%{http_code}' "$API_BASE/v1/auth/me" || echo 000)"
[ "$code" = "401" ] && ok "GET /v1/auth/me sem token -> 401" || bad "GET /v1/auth/me sem token -> $code (esperado 401)"

# 5. CORS nao-permissivo: origem estranha NAO pode ser refletida em ACAO
acao="$(curl -sI -H 'Origin: https://origem-nao-autorizada.example' "$API_BASE/health" \
        | tr -d '\r' | grep -i '^access-control-allow-origin:' | awk '{print $2}' || true)"
if [ "$acao" = "*" ] || echo "$acao" | grep -qi 'origem-nao-autorizada'; then
  bad "CORS permissivo: refletiu origem estranha ($acao)"
else
  ok "CORS nao reflete origem estranha"
fi

# 6. Web: raiz sem sessao redireciona para /login
if [ -n "$WEB_BASE" ]; then
  echo "== WEB: $WEB_BASE =="
  loc="$(curl -sI "$WEB_BASE/" | tr -d '\r' | grep -i '^location:' | awk '{print $2}' || true)"
  echo "$loc" | grep -qi '/login' && ok "GET / sem sessao -> /login" || bad "GET / sem sessao -> '$loc' (esperado /login)"
fi

# 7. Login autenticado (opcional) -> cookie HttpOnly + Secure
if [ -n "${SMOKE_EMAIL:-}" ] && [ -n "${SMOKE_PASSWORD:-}" ] && [ -n "$WEB_BASE" ]; then
  echo "== Login autenticado =="
  setc="$(curl -sI -X POST "$WEB_BASE/api/auth/login" \
            -H 'Content-Type: application/json' \
            --data "{\"email\":\"$SMOKE_EMAIL\",\"password\":\"$SMOKE_PASSWORD\"}" \
          | tr -d '\r' | grep -i '^set-cookie:' || true)"
  if echo "$setc" | grep -qi 'httponly' && echo "$setc" | grep -qi 'secure'; then
    ok "Login define cookie HttpOnly + Secure"
  else
    bad "Cookie de sessao sem HttpOnly/Secure (ou login falhou)"
  fi
else
  echo "  [skip] Login autenticado (defina SMOKE_EMAIL/SMOKE_PASSWORD e WEB_BASE)"
fi

echo "== Resultado: $PASS PASS / $FAIL FAIL =="
[ "$FAIL" -eq 0 ]
