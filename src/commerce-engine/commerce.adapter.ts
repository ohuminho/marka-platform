import type {
  CommerceOperation,
  CommercePolicyDecision,
} from "@/commerce-engine/commerce.contracts";
import type { EntityRef, PolicyContext } from "@/core/domain/contracts";
import { OrderService } from "@/services/orders/order.service";
import type {
  CreateOrderInput,
} from "@/services/orders/types/order.types";

export interface CommerceCreateOrderCommand {
  organizationId: string;
  buyer: EntityRef;
  seller?: EntityRef;
  cartId: string;
  items: CreateOrderInput["items"];
  total: CreateOrderInput["total"];
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
}

export interface CommerceOrderResult {
  operation: CommerceOperation;
  order: Awaited<ReturnType<OrderService["createOrder"]>>;
}

export class CommerceAdapter {
  constructor(
    private readonly orderService: OrderService = new OrderService(),
  ) {}

  async createOrder(
    command: CommerceCreateOrderCommand,
    context: PolicyContext,
  ): Promise<CommerceOrderResult> {
    this.validateContext(command, context);

    const orderInput: CreateOrderInput = {
      userId: command.buyer.id,
      cartId: command.cartId,
      items: command.items,
      total: command.total,
    };

    const order = await this.orderService.createOrder(orderInput);

    const operation: CommerceOperation = {
      id: order.id,
      organizationId: command.organizationId,
      status: "ACTIVE",
      createdAt: new Date(),
      updatedAt: new Date(),
      entityId: order.id,
      buyer: command.buyer,
      seller: command.seller,
      total: {
        amountMinor: command.total,
        currency: context.currency,
      },
      metadata: {
        cartId: command.cartId,
        idempotencyKey: command.idempotencyKey ?? null,
        ...(command.metadata ?? {}),
      },
    };

    return {
      operation,
      order,
    };
  }

  evaluate(
    command: CommerceCreateOrderCommand,
  ): CommercePolicyDecision {
    const reasons: string[] = [];

    if (!command.organizationId.trim()) {
      reasons.push("Organization is required.");
    }

    if (!command.buyer.id.trim()) {
      reasons.push("Buyer is required.");
    }

    if (!command.cartId.trim()) {
      reasons.push("Cart is required.");
    }

    if (!Number.isSafeInteger(command.total) || command.total <= 0) {
      reasons.push(
        "Order total must be a positive safe integer in minor units.",
      );
    }

    return {
      allowed: reasons.length === 0,
      reasons,
      metadata: {
        operation: "commerce.order.create",
      },
    };
  }

  private validateContext(
    command: CommerceCreateOrderCommand,
    context: PolicyContext,
  ): void {
    if (!command.organizationId.trim()) {
      throw new Error("Organization is required.");
    }

    if (context.organizationId !== command.organizationId) {
      throw new Error(
        "Commerce context organization does not match the command.",
      );
    }

    if (!context.currency) {
      throw new Error("Commerce currency is required.");
    }

    const decision = this.evaluate(command);

    if (!decision.allowed) {
      throw new Error(decision.reasons.join(" "));
    }
  }
}

export const commerceAdapter = new CommerceAdapter();
