import { prisma } from "@/database/client/prisma";


export class WalletService {


  async createWallet(
    userId: string
  ) {

    return prisma.wallet.create({
      data: {
        userId,
        currency: "AOA",
        balance: 0,
      },
    });

  }



  async getWallet(
    userId: string
  ) {

    return prisma.wallet.findUnique({
      where: {
        userId,
      },

      include: {
        transactions: true,
      },
    });

  }



  async deposit(
    userId: string,
    amount: number
  ) {

    const wallet =
      await prisma.wallet.findUnique({
        where: {
          userId,
        },
      });


    if (!wallet) {
      throw new Error(
        "Wallet not found"
      );
    }


    return prisma.$transaction([

      prisma.wallet.update({
        where: {
          id: wallet.id,
        },

        data: {
          balance: {
            increment: amount,
          },
        },
      }),


      prisma.transaction.create({
        data: {
          walletId: wallet.id,
          type: "DEPOSIT",
          amount,
          status: "COMPLETED",
          reference:
            crypto.randomUUID(),
        },
      }),

    ]);

  }



  async withdraw(
    userId: string,
    amount: number
  ) {

    const wallet =
      await prisma.wallet.findUnique({
        where: {
          userId,
        },
      });


    if (!wallet) {
      throw new Error(
        "Wallet not found"
      );
    }


    if (wallet.balance < amount) {
      throw new Error(
        "Insufficient balance"
      );
    }


    return prisma.$transaction([

      prisma.wallet.update({
        where: {
          id: wallet.id,
        },

        data: {
          balance: {
            decrement: amount,
          },
        },
      }),


      prisma.transaction.create({
        data: {
          walletId: wallet.id,
          type: "WITHDRAW",
          amount,
          status: "COMPLETED",
          reference:
            crypto.randomUUID(),
        },
      }),

    ]);

  }

}
