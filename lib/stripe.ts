import Stripe from "stripe";

const configuredStripe = process.env.STRIPE_API_SECRET_KEY
  ? new Stripe(process.env.STRIPE_API_SECRET_KEY, {
      apiVersion: "2026-02-25.clover",
      typescript: true,
    })
  : null;

type StripeClient = NonNullable<typeof configuredStripe>;

export const stripe: StripeClient =
  configuredStripe ??
  (new Proxy({} as StripeClient, {
    get() {
      throw new Error(
        "Stripe is not configured. Set STRIPE_API_SECRET_KEY before using billing flows."
      );
    },
  }) as StripeClient);
