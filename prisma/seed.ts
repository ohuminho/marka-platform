import {
  PrismaClient,
  OrganizationType,
  RoleStatus,
} from "@prisma/client";

const prisma = new PrismaClient();

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

const roles = [
  {
    name: "CUSTOMER",
    description: "Standard MARKA customer",
  },
  {
    name: "VENDOR",
    description: "MARKA vendor operator",
  },
  {
    name: "ADMIN",
    description: "MARKA platform administrator",
  },
  {
    name: "SUPER_ADMIN",
    description: "MARKA platform super administrator",
  },
];

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: {
      key: "marka",
    },
    update: {
      name: "MARKA Platform",
    },
    create: {
      key: "marka",
      name: "MARKA Platform",
    },
  });

  const organization = await prisma.organization.upsert({
    where: {
      slug: "marka-platform",
    },
    update: {
      name: "MARKA Platform",
      tenantId: tenant.id,
      type: OrganizationType.PLATFORM,
    },
    create: {
      tenantId: tenant.id,
      name: "MARKA Platform",
      slug: "marka-platform",
      type: OrganizationType.PLATFORM,
    },
  });

  const permissionRecords = new Map<
    string,
    { id: string }
  >();

  for (const action of permissions) {
    const permission = await prisma.permission.upsert({
      where: {
        action,
      },
      update: {},
      create: {
        action,
      },
      select: {
        id: true,
      },
    });

    permissionRecords.set(action, permission);
  }

  for (const roleDefinition of roles) {
    const role = await prisma.role.upsert({
      where: {
        organizationId_name: {
          organizationId: organization.id,
          name: roleDefinition.name,
        },
      },
      update: {
        description: roleDefinition.description,
        status: RoleStatus.ACTIVE,
      },
      create: {
        organizationId: organization.id,
        name: roleDefinition.name,
        description: roleDefinition.description,
        status: RoleStatus.ACTIVE,
      },
      select: {
        id: true,
      },
    });

    const rolePermissions =
      roleDefinition.name === "CUSTOMER"
        ? [
            "USER_READ",
            "ORDER_CREATE",
          ]
        : roleDefinition.name === "VENDOR"
          ? [
              "USER_READ",
              "USER_UPDATE",
              "VENDOR_CREATE",
              "VENDOR_UPDATE",
              "PRODUCT_CREATE",
              "PRODUCT_UPDATE",
              "PRODUCT_DELETE",
              "ORDER_MANAGE",
            ]
          : roleDefinition.name === "ADMIN"
            ? permissions.filter(
                (permission) =>
                  permission !== "ADMIN_ACCESS"
              )
            : permissions;

    for (const action of rolePermissions) {
      const permission = permissionRecords.get(action);

      if (!permission) {
        continue;
      }

      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: role.id,
          permissionId: permission.id,
        },
      });
    }
  }

  console.log(
    `MARKA foundation seed completed for organization ${organization.name}.`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
