export interface PaymentChargeRequest { tenantId: string; contractId: string; installmentId: string; amount: string; dueDate: string }
export interface PaymentChargeResult { externalId: string; status: "PENDING" | "PAID" | "FAILED"; paymentUrl?: string; pixCode?: string }
export interface PaymentGateway { createCharge(input: PaymentChargeRequest): Promise<PaymentChargeResult>; cancelCharge(externalId: string): Promise<void> }

export interface MessageRequest { tenantId: string; recipient: string; template: string; variables: Record<string, string> }
export interface MessagingProvider { sendWhatsApp(input: MessageRequest): Promise<{ externalId: string }> }
export interface EmailProvider { send(input: MessageRequest & { subject: string }): Promise<{ externalId: string }> }

export interface SignatureProvider { createEnvelope(input: { tenantId: string; documentId: string; signerEmail: string }): Promise<{ externalId: string; signingUrl: string }> }
export interface CourtQueryProvider { findUpdates(input: { tenantId: string; processNumber: string }): Promise<Array<{ occurredAt: string; description: string }>> }

export class UnsupportedIntegrationError extends Error {
  constructor(integration: string) { super(`${integration} ainda não está habilitada para este tenant.`); }
}
