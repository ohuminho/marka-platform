import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const permissions = [
    "USER_READ",
    "USER_UPDATE",
    "VENDOR_CREATE",
    "VENDOR_UPDATE",
    "PRODUCT_CREATE",
    "PRODUCT_UPDATE",
    "PRODUCT_DELETE",
    "ORDER_CREATE",
    "ORDER_MANAGE",
    "PAYMENT_PROCESS",
    "ADMIN_ACCESS",
  ];

  for (const action of permissions) {
    await prisma.permission.upsert({
      where: {
        action,
      },
      update: {},
      create: {
        action,
      },
    });
  }

  const roles = [
    "CUSTOMER",
    "VENDOR",
    "ADMIN",
    "SUPER_ADMIN",
  ];

  for (const name of roles) {
    await prisma.role.upsert({
      where: {
        name,
      },
      update: {},
      create: {
        name,
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
