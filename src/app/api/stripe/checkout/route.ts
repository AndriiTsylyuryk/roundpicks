import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/server";

export async function POST(req: Request) {
  try {
    if (!stripe) {
      return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
    }

    const { amount } = await req.json();

    if (!amount || amount < 100 || amount > 100000) {
      return NextResponse.json({ error: "Amount must be between 100 and 100000 (in cents)" }, { status: 400 });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "usd",
      automatic_payment_methods: { enabled: true },
    });

    return NextResponse.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    console.error("Stripe error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
