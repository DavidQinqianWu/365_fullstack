/**
 * Day 3 / Mini project — the transition function.
 *
 * The outer switch narrows the state, the inner switch narrows the event.
 * Both end in `assertNever`, so adding a state or an event turns every
 * unhandled combination into a compile error instead of a production bug.
 */

import {
  assertNever,
  totalOf,
  type Effect,
  type OrderEvent,
  type OrderState,
  type TransitionResult,
} from "./domain.js";

const CUSTOMER_EMAIL = "kunde@example.de";

function illegal(state: OrderState, event: OrderEvent): TransitionResult {
  return {
    ok: false,
    error: {
      kind: "illegal_transition",
      from: state.status,
      event: event.type,
    },
  };
}

export function transition(
  state: OrderState,
  event: OrderEvent,
): TransitionResult {
  // A CANCELLED event is legal from a few states only.
  // Whitelist, not blacklist: when a new state is added to the union it is
  // rejected by default instead of silently becoming cancellable.
  if (event.type === "CANCELLED") {
    if (
      state.status !== "draft" &&
      state.status !== "awaiting_payment" &&
      state.status !== "paid"
    ) {
      return illegal(state, event);
    }
    const releases: readonly Effect[] = state.items.map((item) => ({
      effect: "release_stock",
      sku: item.sku,
      quantity: item.quantity,
    }));
    return {
      ok: true,
      state: {
        status: "cancelled",
        reason: event.reason,
        cancelledAt: "2026-08-13T09:00:00Z",
      },
      effects: releases,
    };
  }

  switch (state.status) {
    case "draft": {
      switch (event.type) {
        case "ITEM_ADDED": {
          if (event.item.quantity <= 0) {
            return {
              ok: false,
              error: {
                kind: "validation",
                field: "item.quantity",
                message: "must be > 0",
              },
            };
          }
          return {
            ok: true,
            state: { status: "draft", items: [...state.items, event.item] },
            effects: [
              {
                effect: "reserve_stock",
                sku: event.item.sku,
                quantity: event.item.quantity,
              },
            ],
          };
        }
        case "CHECKOUT_STARTED": {
          if (state.items.length === 0) {
            return {
              ok: false,
              error: {
                kind: "validation",
                field: "items",
                message: "cart is empty",
              },
            };
          }
          return {
            ok: true,
            state: {
              status: "awaiting_payment",
              items: state.items,
              totalCents: totalOf(state.items),
              paymentIntentId: event.paymentIntentId,
            },
            effects: [],
          };
        }
        case "PAYMENT_SUCCEEDED":
        case "PAYMENT_FAILED":
        case "SHIPPED":
        case "DELIVERED":
        case "RETURN_REQUESTED":
          return illegal(state, event);
        default:
          return assertNever(event, "transition/draft");
      }
    }

    case "awaiting_payment": {
      switch (event.type) {
        case "PAYMENT_SUCCEEDED":
          return {
            ok: true,
            state: {
              status: "paid",
              items: state.items,
              totalCents: state.totalCents,
              paidAt: event.at,
            },
            effects: [
              {
                effect: "send_email",
                template: "order_paid",
                to: CUSTOMER_EMAIL,
              },
            ],
          };
        case "PAYMENT_FAILED":
          // Recoverable: fall back to the cart so the customer can retry.
          return {
            ok: true,
            state: { status: "draft", items: state.items },
            effects: [],
          };
        case "ITEM_ADDED":
        case "CHECKOUT_STARTED":
        case "SHIPPED":
        case "DELIVERED":
        case "RETURN_REQUESTED":
          return illegal(state, event);
        default:
          return assertNever(event, "transition/awaiting_payment");
      }
    }

    case "paid": {
      switch (event.type) {
        case "SHIPPED":
          return {
            ok: true,
            state: {
              status: "shipped",
              items: state.items,
              totalCents: state.totalCents,
              trackingCode: event.trackingCode,
            },
            effects: [
              {
                effect: "send_email",
                template: "order_shipped",
                to: CUSTOMER_EMAIL,
              },
            ],
          };
        case "ITEM_ADDED":
        case "CHECKOUT_STARTED":
        case "PAYMENT_SUCCEEDED":
        case "PAYMENT_FAILED":
        case "DELIVERED":
        case "RETURN_REQUESTED":
          return illegal(state, event);
        default:
          return assertNever(event, "transition/paid");
      }
    }

    case "shipped": {
      switch (event.type) {
        case "DELIVERED":
          return {
            ok: true,
            state: {
              status: "delivered",
              items: state.items,
              totalCents: state.totalCents,
              deliveredAt: event.at,
            },
            effects: [],
          };
        case "ITEM_ADDED":
        case "CHECKOUT_STARTED":
        case "PAYMENT_SUCCEEDED":
        case "PAYMENT_FAILED":
        case "SHIPPED":
        case "RETURN_REQUESTED":
          return illegal(state, event);
        default:
          return assertNever(event, "transition/shipped");
      }
    }

    case "delivered": {
      switch (event.type) {
        case "RETURN_REQUESTED":
          return {
            ok: true,
            state: {
              status: "returned",
              items: state.items,
              refundCents: state.totalCents,
              returnedAt: event.at,
            },
            effects: state.items.map((item) => ({
              effect: "release_stock",
              sku: item.sku,
              quantity: item.quantity,
            })),
          };
        case "ITEM_ADDED":
        case "CHECKOUT_STARTED":
        case "PAYMENT_SUCCEEDED":
        case "PAYMENT_FAILED":
        case "SHIPPED":
        case "DELIVERED":
          return illegal(state, event);
        default:
          return assertNever(event, "transition/delivered");
      }
    }

    case "returned":
    case "cancelled":
      // Terminal states accept nothing.
      return illegal(state, event);

    default:
      return assertNever(state, "transition");
  }
}
