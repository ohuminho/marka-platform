import {
  OrderStatus,
  CreateOrderInput,
  OrderSummary,
} from "./types/order.types";



export class OrderService {



  async createOrder(
    input: CreateOrderInput
  ) {



    return {

      id: crypto.randomUUID(),

      userId: input.userId,

      status: OrderStatus.PENDING,

      total: input.total,

      items: input.items,

      message:
        "Order creation service ready",

    };


  }





  async getUserOrders(
    userId: string
  ): Promise<OrderSummary[]> {



    return [];


  }





  async getOrderById(
    orderId: string
  ) {



    return {

      id: orderId,

      message:
        "Order lookup service ready",

    };


  }





  async updateOrderStatus(
    orderId: string,

    status: OrderStatus

  ) {



    return {

      id: orderId,

      status,

      message:
        "Order status update service ready",

    };


  }


}
