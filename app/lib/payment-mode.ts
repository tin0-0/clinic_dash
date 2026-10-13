export function isPaymentSimulationEnabled() {
  return (
    (process.env.NODE_ENV === 'development' || process.env.VERCEL_ENV === 'preview') &&
    (process.env.PAYMENTS_MODE ?? 'simulated') === 'simulated'
  );
}