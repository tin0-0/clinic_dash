import { revalidatePath } from 'next/cache';
import postgres from 'postgres';
import { getStripe } from '@/app/lib/stripe';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require', prepare: false });

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get('stripe-signature');
  if (!webhookSecret || !signature) {
    return Response.json({ error: 'Stripe webhook is not configured.' }, { status: 400 });
  }

  let event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(await request.text(), signature, webhookSecret);
  } catch (error) {
    console.error('Invalid Stripe webhook signature:', error);
    return Response.json({ error: 'Invalid webhook signature.' }, { status: 400 });
  }

  if (event.type === 'checkout.session.expired') {
    const checkout = event.data.object;
    await sql`
      UPDATE invoice_payments SET status = 'expired'
      WHERE stripe_session_id = ${checkout.id} AND status = 'pending'
    `;
    return Response.json({ received: true });
  }

  if (event.type !== 'checkout.session.completed') {
    return Response.json({ received: true });
  }

  const checkout = event.data.object;
  if (checkout.payment_status !== 'paid') {
    return Response.json({ received: true });
  }

  try {
    await sql.begin(async (transaction) => {
      const processed = await transaction`
        INSERT INTO stripe_webhook_events (event_id)
        VALUES (${event.id})
        ON CONFLICT (event_id) DO NOTHING
        RETURNING event_id
      `;
      if (processed.length === 0) return;

      if (
        checkout.metadata?.kind === 'wallet_top_up' &&
        checkout.currency === 'usd' &&
        checkout.metadata.userId &&
        checkout.amount_total !== null &&
        checkout.amount_total !== undefined &&
        checkout.metadata.amountCents === String(checkout.amount_total)
      ) {
        const userId = checkout.metadata.userId;
        await transaction`
          INSERT INTO wallet_accounts (user_id)
          VALUES (${userId}) ON CONFLICT (user_id) DO NOTHING
        `;
        const credit = await transaction`
          INSERT INTO wallet_transactions (
            user_id, amount_cents, transaction_type, stripe_session_id
          ) VALUES (
            ${userId}, ${checkout.amount_total}, 'top_up', ${checkout.id}
          )
          ON CONFLICT (stripe_session_id) DO NOTHING
          RETURNING amount_cents
        `;
        if (credit.length > 0) {
          await transaction`
            UPDATE wallet_accounts
            SET balance_cents = balance_cents + ${credit[0].amount_cents}, updated_at = NOW()
            WHERE user_id = ${userId}
          `;
        }
      } else if (
        checkout.metadata?.kind === 'invoice' &&
        checkout.metadata.invoiceId &&
        checkout.currency === 'usd' &&
        checkout.amount_total !== null &&
        checkout.amount_total !== undefined
      ) {
        const payments = await transaction`
          SELECT invoice_payments.invoice_id, invoice_payments.amount_cents,
            invoice_payments.status AS payment_status, invoices.status AS invoice_status
          FROM invoice_payments
          JOIN invoices ON invoices.id = invoice_payments.invoice_id
          WHERE invoice_payments.stripe_session_id = ${checkout.id}
            AND invoice_payments.invoice_id = ${checkout.metadata.invoiceId}
          FOR UPDATE OF invoice_payments, invoices
        `;
        const payment = payments[0];
        if (!payment || payment.amount_cents !== checkout.amount_total) {
          throw new Error('INVOICE_PAYMENT_MISMATCH');
        }
        if (payment.payment_status === 'pending' && payment.invoice_status === 'pending') {
          await transaction`
            UPDATE invoices SET status = 'paid'
            WHERE id = ${payment.invoice_id} AND status = 'pending'
          `;
          await transaction`
            UPDATE invoice_payments SET status = 'paid', paid_at = NOW()
            WHERE stripe_session_id = ${checkout.id} AND status = 'pending'
          `;
        }
      } else {
        throw new Error('UNSUPPORTED_CHECKOUT_SESSION');
      }
    });
  } catch (error) {
    console.error('Failed to process Stripe webhook:', error);
    return Response.json({ error: 'Could not process payment event.' }, { status: 500 });
  }

  revalidatePath('/dashboard/wallet');
  revalidatePath('/dashboard/invoices');
  return Response.json({ received: true });
}
