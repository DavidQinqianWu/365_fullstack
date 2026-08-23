/**
 * Day 3 / Mini project — runner.
 * Run: npx tsx src/03-main.ts
 */

import {
  describeError,
  type Effect,
  type OrderEvent,
  type OrderState,
} from "./order/domain.js";
import { transition } from "./order/machine.js";
import { parseOrderEvent } from "./order/parse.js";

function summarize(state: OrderState): string {
  switch (state.status) {
    case "draft":
      return `draft(${state.items.length} items)`;
    case "awaiting_payment":
      return `awaiting_payment(${(state.totalCents / 100).toFixed(2)} EUR, ${state.paymentIntentId})`;
    case "paid":
      return `paid(${(state.totalCents / 100).toFixed(2)} EUR at ${state.paidAt})`;
    case "shipped":
      return `shipped(${state.trackingCode})`;
    case "delivered":
      return `delivered(${state.deliveredAt})`;
    case "cancelled":
      return `cancelled(${state.reason})`;
  }
}

function formatEffect(effect: Effect): string {
  switch (effect.effect) {
    case "send_email":
      return `email:${effect.template}->${effect.to}`;
    case "reserve_stock":
      return `reserve:${effect.sku}x${effect.quantity}`;
    case "release_stock":
      return `release:${effect.sku}x${effect.quantity}`;
  }
}

/** Folds an event log into a final state — the core of event sourcing. */
function replay(
  initial: OrderState,
  events: readonly OrderEvent[],
): OrderState {
  let current = initial;
  for (const event of events) {
    const result = transition(current, event);
    if (result.ok) {
      const effects = result.effects.map(formatEffect).join(", ") || "-";
      console.log(
        `  ${event.type.padEnd(18)} -> ${summarize(result.state).padEnd(44)} [${effects}]`,
      );
      current = result.state;
    } else {
      console.log(
        `  ${event.type.padEnd(18)} !! ${describeError(result.error)}`,
      );
    }
  }
  return current;
}

console.log("--- happy path ---");
const finalState = replay({ status: "draft", items: [] }, [
  {
    type: "ITEM_ADDED",
    item: { sku: "KEY-01", quantity: 2, unitPriceCents: 4999 },
  },
  {
    type: "ITEM_ADDED",
    item: { sku: "CAB-07", quantity: 1, unitPriceCents: 1290 },
  },
  { type: "CHECKOUT_STARTED", paymentIntentId: "pi_9f2a" },
  { type: "PAYMENT_SUCCEEDED", at: "2026-08-13T08:15:00Z" },
  { type: "SHIPPED", trackingCode: "DHL-123456789" },
  { type: "DELIVERED", at: "2026-08-15T11:02:00Z" },
]);
console.log("final:", summarize(finalState));

console.log("\n--- rejected transitions ---");
replay({ status: "draft", items: [] }, [
  { type: "CHECKOUT_STARTED", paymentIntentId: "pi_empty" }, // empty cart
  {
    type: "ITEM_ADDED",
    item: { sku: "KEY-01", quantity: 0, unitPriceCents: 4999 },
  }, // quantity 0
  { type: "SHIPPED", trackingCode: "DHL-000" }, // illegal from draft
]);

console.log("\n--- payment failure returns to the cart ---");
replay({ status: "draft", items: [] }, [
  {
    type: "ITEM_ADDED",
    item: { sku: "KEY-01", quantity: 1, unitPriceCents: 4999 },
  },
  { type: "CHECKOUT_STARTED", paymentIntentId: "pi_bad" },
  { type: "PAYMENT_FAILED", code: "card_declined" },
  { type: "CHECKOUT_STARTED", paymentIntentId: "pi_retry" },
  { type: "PAYMENT_SUCCEEDED", at: "2026-08-13T08:40:00Z" },
]);

console.log("\n--- untrusted payloads at the boundary ---");
const payloads: readonly unknown[] = [
  { type: "SHIPPED", trackingCode: "DHL-42" },
  { type: "SHIPPED", trackingCode: 42 },
  { type: "REFUNDED", amount: 100 },
  '{"type":"CANCELLED"}',
  null,
];
for (const payload of payloads) {
  const parsed = parseOrderEvent(payload);
  console.log(
    `  ${JSON.stringify(payload)?.slice(0, 38).padEnd(40)} ${parsed.ok ? `OK -> ${parsed.event.type}` : `REJECTED: ${parsed.reason}`}`,
  );
}
