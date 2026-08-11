/* ---------------------------------------------------------------------------
   Payment anti-corruption layer (docs/adr/0015). One port, one working
   implementation, real-vendor implementations stubbed — same shape as
   lib/integrations/bodymap/index.ts. No real charge is captured anywhere
   in this codebase yet: blueprint §9.4 marks the processor choice OPEN
   (Stripe / Network International / Telr / Tabby / Tamara are candidates,
   not decisions), and real money movement needs API credentials and a PCI
   posture this environment doesn't have. `chargeManual` is what every
   package sale in this codebase actually calls — payment is collected
   outside the system (cash, card terminal, bank transfer) and recorded
   here, same trust boundary as the existing cash_ledger table.
--------------------------------------------------------------------------- */

export type PaymentResult = { status: 'paid'; reference: string };

/** Payment collected outside the system (in person) and recorded here.
 *  Always "succeeds" — there is no decline path because no card is ever
 *  actually charged through this function. */
export function chargeManual(input: { amountAed: number; note: string }): PaymentResult {
  return { status: 'paid', reference: `manual_${Date.now()}` };
}

/** Not implemented — awaiting a Stripe account (blueprint §9.4 names it as
 *  a candidate, not a decision). */
export function chargeStripe(_input: unknown): never {
  throw new Error('Stripe payment adapter not implemented — awaiting a Stripe account and API keys');
}

/** Not implemented — awaiting a UAE-specific gateway decision (Telr,
 *  PayTabs, Network International — blueprint §9.4 marks this OPEN). */
export function chargeUaeGateway(_input: unknown): never {
  throw new Error('UAE payment gateway adapter not implemented — awaiting a provider decision (blueprint §9.4)');
}
