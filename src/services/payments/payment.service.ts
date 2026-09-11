export class PaymentService {


  async createPayment(
    userId: string,
    orderId: string,
    amount: number
  ) {

    return {

      message: "Payment creation flow ready",

      userId,

      orderId,

      amount,

    };

  }





  async confirmPayment(
    paymentId: string
  ) {

    return {

      message: "Payment confirmation flow ready",

      paymentId,

    };

  }





  async refundPayment(
    paymentId: string
  ) {

    return {

      message: "Payment refund flow ready",

      paymentId,

    };

  }


}
