/**
 * Day 3 / Mini project — domain model of an order, expressed as unions.
 * Every state carries exactly the data that is valid in that state.
 */
export interface OrderItem {
  readonly sku: string;
  readonly quantity: number;
  readonly unitPriceCents: number;
}
/** The state union. Discriminant: `status`. */
export type OrderState =
  | { readonly status: "draft"; readonly items: readonly OrderItem[] }
  | {
      readonly status: "awaiting_payment";
      readonly items: readonly OrderItem[];
      readonly totalCents: number;
      readonly paymentIntentId: string;
    }
  | {
      readonly status: "paid";
      readonly items: readonly OrderItem[];
      readonly totalCents: number;
      readonly paidAt: string;
    }
  | {
      readonly status: "shipped";
      readonly items: readonly OrderItem[];
      readonly totalCents: number;
      readonly trackingCode: string;
    }
  | {
      readonly status: "delivered";
      readonly items: readonly OrderItem[];
      readonly totalCents: number;
      readonly deliveredAt: string;
    }
  | {
      readonly status: "cancelled";
      readonly reason: string;
      readonly cancelledAt: string;
    }
  | {
      readonly status: "returned";
      readonly items: readonly OrderItem[];
      readonly refundCents: number;
      readonly returnedAt: string;
    };
/** The event union. Discriminant: `type`. */
export type OrderEvent =
  | { readonly type: "ITEM_ADDED"; readonly item: OrderItem }
  | { readonly type: "CHECKOUT_STARTED"; readonly paymentIntentId: string }
  | { readonly type: "PAYMENT_SUCCEEDED"; readonly at: string }
  | {
      readonly type: "PAYMENT_FAILED";
      readonly code: "card_declined" | "insufficient_funds" | "network";
    }
  | { readonly type: "SHIPPED"; readonly trackingCode: string }
  | { readonly type: "DELIVERED"; readonly at: string }
  | { readonly type: "CANCELLED"; readonly reason: string }
  | {
      readonly type: "RETURN_REQUESTED";
      readonly at: string;
      readonly reason: string;
    };

/** Indexed access on a union yields the union of the discriminant literals. */
export type OrderStatus = OrderState["status"];
export type OrderEventType = OrderEvent["type"];

/** Side effects the machine wants the caller to perform. Also a union. */
export type Effect =
  | {
      readonly effect: "send_email";
      readonly template: "order_paid" | "order_shipped";
      readonly to: string;
    }
  | {
      readonly effect: "reserve_stock";
      readonly sku: string;
      readonly quantity: number;
    }
  | {
      readonly effect: "release_stock";
      readonly sku: string;
      readonly quantity: number;
    };
export type TransitionError =
  | {
      readonly kind: "illegal_transition";
      readonly from: OrderStatus;
      readonly event: OrderEventType;
    }
  | {
      readonly kind: "validation";
      readonly field: string;
      readonly message: string;
    };

export type TransitionResult =
  | {
      readonly ok: true;
      readonly state: OrderState;
      readonly effects: readonly Effect[];
    }
  | { readonly ok: false; readonly error: TransitionError };

export function assertNever(value: never, context: string): never {
  throw new Error(`Unhandled variant in ${context}: ${JSON.stringify(value)}`);
}
export function totalOf(items: readonly OrderItem[]): number {
  return items.reduce(
    (sum, item) => sum + item.quantity * item.unitPriceCents,
    0,
  );
}

export function describeError(error: TransitionError): string {
  switch (error.kind) {
    case "illegal_transition":
      return `illegal transition: ${error.event} is not allowed while ${error.from}`;
    case "validation":
      return `validation failed on "${error.field}": ${error.message}`;
    default:
      return assertNever(error, "describeError");
  }
}
