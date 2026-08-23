/**
 * Day 3 / Mini project — the trust boundary.
 *
 * A discriminated union is only sound if the tag is verified where untrusted
 * data enters the process (HTTP body, queue message, webhook payload).
 * A schema library does the same job declaratively (见第 14 天).
 */

import type { OrderEvent, OrderItem } from "./domain.js";

export type ParseResult =
  | { readonly ok: true; readonly event: OrderEvent }
  | { readonly ok: false; readonly reason: string };

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}

function parseItem(input: unknown): OrderItem | null {
  if (!isRecord(input)) return null;
  const { sku, quantity, unitPriceCents } = input;
  if (typeof sku !== "string" || sku.length === 0) return null;
  if (typeof quantity !== "number" || !Number.isInteger(quantity)) return null;
  if (typeof unitPriceCents !== "number" || !Number.isInteger(unitPriceCents))
    return null;
  return { sku, quantity, unitPriceCents };
}

export function parseOrderEvent(input: unknown): ParseResult {
  if (!isRecord(input))
    return { ok: false, reason: "payload is not an object" };

  // Switching on the tag is what turns `unknown` into a union member.
  switch (input["type"]) {
    case "ITEM_ADDED": {
      const item = parseItem(input["item"]);
      return item === null
        ? { ok: false, reason: "ITEM_ADDED.item is malformed" }
        : { ok: true, event: { type: "ITEM_ADDED", item } };
    }
    case "CHECKOUT_STARTED": {
      const paymentIntentId = input["paymentIntentId"];
      return typeof paymentIntentId === "string"
        ? { ok: true, event: { type: "CHECKOUT_STARTED", paymentIntentId } }
        : {
            ok: false,
            reason: "CHECKOUT_STARTED.paymentIntentId must be a string",
          };
    }
    case "PAYMENT_SUCCEEDED": {
      const at = input["at"];
      return typeof at === "string"
        ? { ok: true, event: { type: "PAYMENT_SUCCEEDED", at } }
        : { ok: false, reason: "PAYMENT_SUCCEEDED.at must be an ISO string" };
    }
    case "PAYMENT_FAILED": {
      const code = input["code"];
      return code === "card_declined" ||
        code === "insufficient_funds" ||
        code === "network"
        ? { ok: true, event: { type: "PAYMENT_FAILED", code } }
        : { ok: false, reason: "PAYMENT_FAILED.code is not a known reason" };
    }
    case "SHIPPED": {
      const trackingCode = input["trackingCode"];
      return typeof trackingCode === "string"
        ? { ok: true, event: { type: "SHIPPED", trackingCode } }
        : { ok: false, reason: "SHIPPED.trackingCode must be a string" };
    }
    case "DELIVERED": {
      const at = input["at"];
      return typeof at === "string"
        ? { ok: true, event: { type: "DELIVERED", at } }
        : { ok: false, reason: "DELIVERED.at must be an ISO string" };
    }
    case "RETURN_REQUESTED": {
      const at = input["at"];
      const returnReason = input["reason"];
      return typeof at === "string" && typeof returnReason === "string"
        ? {
            ok: true,
            event: { type: "RETURN_REQUESTED", at, reason: returnReason },
          }
        : {
            ok: false,
            reason: "RETURN_REQUESTED needs `at` and `reason` strings",
          };
    }
    case "CANCELLED": {
      const reason = input["reason"];
      return typeof reason === "string"
        ? { ok: true, event: { type: "CANCELLED", reason } }
        : { ok: false, reason: "CANCELLED.reason must be a string" };
    }
    default:
      // No `assertNever` here: `input['type']` is `unknown`, not a union member.
      // This is the boundary where an unknown tag must be rejected, not crashed on.
      return {
        ok: false,
        reason: `unknown event type: ${String(input["type"])}`,
      };
  }
}
