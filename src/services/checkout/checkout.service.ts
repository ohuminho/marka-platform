import {
  OrderService,
} from "@/services/orders/order.service";


import {
  PaymentService,
} from "@/services/payments/payment.service";


import {
  CreateOrderInput,
} from "@/services/orders/types/order.types";



export class CheckoutService {



  async checkout(

    userId: string,

    cartId: string

  ) {



    const orderService =
      new OrderService();



    const paymentService =
      new PaymentService();



    const orderInput: CreateOrderInput = {

      userId,

      cartId,

      items: [],

      total: 0,

    };



    const order =
      await orderService.createOrder(
        orderInput
      );



    const payment =
      await paymentService.createPayment(

        userId,

        order.id,

        order.total

      );



    return {

      message:
        "Checkout completed",

      order,

      payment,

    };


  }


}
