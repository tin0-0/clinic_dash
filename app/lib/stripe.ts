import Stripe from 'stripe';

let stripeClient: Stripe | undefined;

export function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error('STRIPE_SECRET_KEY is not configured.');
  stripeClient ??= new Stripe(secretKey);
  return stripeClient;
}

export function getAppUrl() {
  const configuredUrl = process.env.APP_URL ?? 'http://localhost:3000';
  return new URL(configuredUrl).origin;
}