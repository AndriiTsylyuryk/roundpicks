import { loadStripe, type Stripe as StripeJS } from "@stripe/stripe-js";

let _stripePromise: Promise<StripeJS | null> | null = null;

export function getStripe(): Promise<StripeJS | null> {
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!key) return Promise.resolve(null);
  if (!_stripePromise) {
    _stripePromise = loadStripe(key);
  }
  return _stripePromise;
}
