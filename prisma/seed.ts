import {
  PrismaClient,
  OrganizationType,
  RoleStatus,
} from "@prisma/client";
import { DefaultPermissions } from "../src/core/authorization/config/default-permissions";
import { Permissions } from "../src/core/authorization/permissions.catalog";

const prisma = new PrismaClient();

const permissions = DefaultPermissions;

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
    name: "DRIVER",
    description: "MARKA Mobility driver partner pending operational approval",
  },
  {
    name: "DELIVERY_AGENT",
    description: "MARKA marketplace delivery partner",
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
  const tenant =
    await prisma.tenant.upsert({
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

  const marketplaceCategories = [
    "Eletrónica", "Moda e acessórios", "Casa e jardim", "Alimentação e mercearia",
    "Beleza e cuidados", "Desporto e lazer", "Livros e media", "Automóveis",
    "Motociclos", "Imóveis e arrendamento", "Indústria e produção",
    "Agricultura e agropecuária", "Materiais de construção e ferragens",
    "Iluminação e material elétrico", "Portas, janelas e carpintaria", "Calçado",
    "Mobiliário e decoração", "Equipamentos e máquinas", "Embalagens e consumíveis",
    "Água e bebidas", "Produtos por atacado", "Serviços — Eventos e festas",
    "Serviços — Música e entretenimento", "Serviços — Catering e cozinha",
    "Serviços — Decoração, som e iluminação", "Serviços — Fotografia e vídeo",
    "Serviços — Casa e manutenção", "Serviços — Beleza e bem-estar",
    "Serviços — Limpeza e apoio", "Serviços — Educação e formação",
    "Serviços — Tecnologia e profissionais", "Serviços — Outros", "Seguros e proteção",
    "Eventos e bilhética", "Energia solar e soluções energéticas", "Carreira e currículos", "Lojas de bairro", "Outros",
    "Materiais de construção — Areia",
    "Materiais de construção — Burgau e burgalho",
    "Materiais de construção — Brita e agregados",
    "Materiais de construção — Cimento, cal e argamassas",
    "Materiais de construção — Blocos e pavês",
    "Materiais de construção — Tijolos",
    "Materiais de construção — Telhas e coberturas",
    "Materiais de construção — Chapas de zinco e perfis",
    "Materiais de construção — Ferro, aço e varões",
    "Materiais de construção — Tintas e impermeabilização",
    "Materiais de construção — Tubos e canalização",
    "Materiais de construção — Cerâmica e sanitários",
    "Materiais de construção — Vidros e caixilharia",
    "Metalurgia e transformação de metais",
    "Metalurgia — Serralharia e estruturas metálicas",
    "Metalurgia — Alumínio e inox",
    "Metalurgia — Chapas, perfis e tubos metálicos",
    "Serviços — Construção civil e empreitadas",
    "Serviços — Pedreiros e alvenaria",
    "Serviços — Telhados e coberturas",
    "Serviços — Pintura e acabamentos",
    "Eletrónica — Telemóveis e acessórios",
    "Eletrónica — Computadores e informática",
    "Eletrónica — Televisores, áudio e vídeo",
    "Eletrónica — Eletrodomésticos",
    "Eletrónica — Componentes e acessórios",
    "Equipamentos — Máquinas de construção",
    "Equipamentos — Ferramentas profissionais",
    "Indústria — Matérias-primas e consumíveis",
    "Indústria — Peças e manutenção industrial",
  ];

  for (const name of marketplaceCategories) {
    const existing = await prisma.category.findFirst({
      where: { name: { equals: name, mode: "insensitive" }, status: "ACTIVE" },
      select: { id: true },
    });
    if (!existing) {
      await prisma.category.create({ data: { name, status: "ACTIVE" } });
    }
  }

  const organization =
    await prisma.organization.upsert({
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

  const permissionRecords =
    new Map<
      string,
      { id: string }
    >();

  for (const action of permissions) {
    const permission =
      await prisma.permission.upsert({
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

    permissionRecords.set(
      action,
      permission
    );
  }

  const roleRecords = new Map<string, { id: string }>();

  for (const roleDefinition of roles) {
    const role =
      await prisma.role.upsert({
        where: {
          organizationId_name: {
            organizationId:
              organization.id,
            name:
              roleDefinition.name,
          },
        },
        update: {
          description:
            roleDefinition.description,
          status:
            RoleStatus.ACTIVE,
        },
        create: {
          organizationId:
            organization.id,
          name:
            roleDefinition.name,
          description:
            roleDefinition.description,
          status:
            RoleStatus.ACTIVE,
        },
        select: {
          id: true,
        },
      });

    roleRecords.set(roleDefinition.name, role);

    const rolePermissions: string[] =
      roleDefinition.name === "CUSTOMER"
        ? [Permissions.USER_READ, Permissions.ORDER_CREATE, Permissions.ORDER_READ]
        : roleDefinition.name === "VENDOR"
          ? [
              Permissions.USER_READ,
              Permissions.USER_UPDATE,
              Permissions.VENDOR_CREATE,
              Permissions.VENDOR_UPDATE,
              Permissions.VENDOR_MANAGE,
              Permissions.PRODUCT_CREATE,
              Permissions.PRODUCT_UPDATE,
              Permissions.PRODUCT_DELETE,
              Permissions.ORDER_READ,
              Permissions.ORDER_MANAGE,
            ]
          : roleDefinition.name === "DRIVER"
            ? [Permissions.USER_READ, Permissions.ORDER_READ]
            : roleDefinition.name === "DELIVERY_AGENT"
              ? [Permissions.USER_READ, Permissions.ORDER_READ, Permissions.DELIVERY_AGENT_OPERATE]
              : roleDefinition.name === "ADMIN"
                ? permissions.filter(
                    (permission) =>
                      permission !== Permissions.ADMIN_ACCESS &&
                      permission !== Permissions.SYSTEM_ADMIN &&
                      permission !== Permissions.DELIVERY_AGENT_OPERATE,
                  )
                : permissions;

    for (const action of rolePermissions) {
      const permission =
        permissionRecords.get(
          action
        );

      if (!permission) {
        continue;
      }

      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId:
              permission.id,
          },
        },
        update: {},
        create: {
          roleId: role.id,
          permissionId:
            permission.id,
        },
      });
    }
  }

  // Reconcile legacy privileged account roles into the canonical UserRole table.
  const privilegedUsers = await prisma.user.findMany({
    where: { role: { in: ["ADMIN", "SUPER_ADMIN"] } },
    select: { id: true, role: true },
  });
  for (const user of privilegedUsers) {
    const role = roleRecords.get(user.role);
    if (!role) continue;
    await prisma.userRole.upsert({
      where: {
        userId_roleId_organizationId: {
          userId: user.id,
          roleId: role.id,
          organizationId: organization.id,
        },
      },
      update: {},
      create: {
        userId: user.id,
        roleId: role.id,
        organizationId: organization.id,
      },
    });
  }

  const deliveryRole = roleRecords.get("DELIVERY_AGENT");
  if (deliveryRole) {
    const activeAgents = await prisma.deliveryAgent.findMany({
      where: { organizationId: organization.id, status: "ACTIVE" },
      select: { userId: true },
    });
    for (const agent of activeAgents) {
      await prisma.userRole.upsert({
        where: {
          userId_roleId_organizationId: {
            userId: agent.userId,
            roleId: deliveryRole.id,
            organizationId: organization.id,
          },
        },
        update: {},
        create: {
          userId: agent.userId,
          roleId: deliveryRole.id,
          organizationId: organization.id,
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
