// Executa uma vez na inicialização do servidor Next. Fixa o fuso horário do
// processo em São Paulo para que cálculos de data em componentes de servidor
// (ex.: agrupamento do calendário de prazos por dia) usem o dia correto.
// Pode ser sobrescrito definindo TZ no ambiente.
export function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    process.env.TZ = process.env.TZ ?? "America/Sao_Paulo";
  }
}
