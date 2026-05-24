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

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: { name: "Support Roundpicks" },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      success_url: `${req.headers.get("origin")}/support?success=true`,
      cancel_url: `${req.headers.get("origin")}/support`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Stripe error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
