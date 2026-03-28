// lib/stripe.ts
// ─────────────────────────────────────────────────────────────────────────────
// Stripe integration — subscription checkout.
//
// Node.js backend handles:
//   POST /api/payments/create-checkout  → { url }
//   POST /api/payments/webhook          → Stripe webhook handler
//   GET  /api/payments/subscription     → current subscription status
// ─────────────────────────────────────────────────────────────────────────────

import API from "./api"

export type PlanId = "starter" | "professional" | "premium"

export interface CheckoutSession {
  url: string
}

// ── Create Stripe Checkout session ───────────────────────────────────────────
// Calls your Node.js backend which creates the Stripe session server-side.
// The backend uses STRIPE_PRICE_* env vars to resolve the price ID.

export const createCheckoutSession = async (
  plan: PlanId,
  successUrl: string = `${window.location.origin}/dashboard/settings?plan=success`,
  cancelUrl:  string = `${window.location.origin}/dashboard/settings`
): Promise<string> => {
  const res = await API.post<CheckoutSession>("/payments/create-checkout", {
    plan,
    successUrl,
    cancelUrl,
  })
  return (res.data as any).url
}

// ── Redirect to Stripe Checkout ───────────────────────────────────────────────
export const redirectToCheckout = async (plan: PlanId): Promise<void> => {
  const url = await createCheckoutSession(plan)
  window.location.href = url
}

// ── Get current subscription ───────────────────────────────────────────────────
export interface Subscription {
  plan:      PlanId
  status:    "active" | "trialing" | "past_due" | "cancelled"
  renewsAt:  string
  cancelAt?: string
}

export const getSubscription = async (): Promise<Subscription | null> => {
  try {
    const res = await API.get<Subscription>("/payments/subscription")
    return res.data as Subscription
  } catch {
    return null
  }
}

// ── Plan details (static — matches your Stripe products) ────────────────────
export const PLANS = [
  {
    id:       "starter" as PlanId,
    name:     "Starter",
    price:    "₹999",
    per:      "/month",
    features: [
      "1 doctor account",
      "Up to 100 appointments/month",
      "Basic dashboard",
      "Email support",
    ],
    highlight: false,
  },
  {
    id:       "professional" as PlanId,
    name:     "Professional",
    price:    "₹2,499",
    per:      "/month",
    features: [
      "Up to 5 doctor accounts",
      "Unlimited appointments",
      "Analytics dashboard",
      "AI receptionist",
      "Priority support",
    ],
    highlight: true,
    badge:     "Most Popular",
  },
  {
    id:       "premium" as PlanId,
    name:     "Premium",
    price:    "₹4,999",
    per:      "/month",
    features: [
      "Unlimited doctors",
      "White-label branding",
      "Multi-branch support",
      "Dedicated account manager",
      "SLA guarantee",
    ],
    highlight: false,
  },
]