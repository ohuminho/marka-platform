-- Synchronise the runtime permission catalog with the persisted RBAC model.
INSERT INTO "Permission" ("id", "action", "createdAt")
VALUES
  (gen_random_uuid()::text, 'USER_READ', CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'USER_CREATE', CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'USER_UPDATE', CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'VENDOR_CREATE', CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'VENDOR_UPDATE', CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'VENDOR_MANAGE', CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'PRODUCT_CREATE', CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'PRODUCT_UPDATE', CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'PRODUCT_DELETE', CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'ORDER_READ', CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'ORDER_CREATE', CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'ORDER_MANAGE', CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'DELIVERY_AGENT_MANAGE', CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'DELIVERY_AGENT_OPERATE', CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'PAYMENT_PROCESS', CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'WALLET_READ', CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'WALLET_MANAGE', CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'SETTLEMENT_PAYOUT_EXECUTE', CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'SETTLEMENT_RECONCILIATION_EXECUTE', CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'SETTLEMENT_RECONCILIATION_RESOLVE', CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'ADMIN_ACCESS', CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'SYSTEM_ADMIN', CURRENT_TIMESTAMP)
ON CONFLICT ("action") DO NOTHING;

WITH platform_roles(name, description) AS (
  VALUES
    ('CUSTOMER', 'Standard MARKA customer'),
    ('VENDOR', 'MARKA vendor operator'),
    ('DRIVER', 'MARKA Mobility driver partner'),
    ('DELIVERY_AGENT', 'MARKA marketplace delivery partner'),
    ('ADMIN', 'MARKA platform administrator'),
    ('SUPER_ADMIN', 'MARKA platform super administrator')
)
INSERT INTO "Role" ("id", "organizationId", "name", "description", "status", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, org.id, platform_roles.name, platform_roles.description, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Organization" org
CROSS JOIN platform_roles
WHERE org.slug = 'marka-platform' AND org.type = 'PLATFORM' AND org.status = 'ACTIVE'
ON CONFLICT ("organizationId", "name")
DO UPDATE SET "description" = EXCLUDED."description", "status" = 'ACTIVE', "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "Role" ("id", "organizationId", "name", "description", "status", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, da."organizationId", 'DELIVERY_AGENT', 'MARKA marketplace delivery partner', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "DeliveryAgent" da
ON CONFLICT ("organizationId", "name")
DO UPDATE SET "description" = EXCLUDED."description", "status" = 'ACTIVE', "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "RolePermission" ("id", "roleId", "permissionId", "createdAt")
SELECT gen_random_uuid()::text, r.id, p.id, CURRENT_TIMESTAMP
FROM "Role" r
JOIN "Permission" p ON
  (r.name = 'SUPER_ADMIN')
  OR (r.name = 'ADMIN' AND p.action NOT IN ('ADMIN_ACCESS', 'SYSTEM_ADMIN', 'DELIVERY_AGENT_OPERATE'))
  OR (r.name = 'CUSTOMER' AND p.action IN ('USER_READ', 'ORDER_CREATE', 'ORDER_READ'))
  OR (r.name = 'VENDOR' AND p.action IN ('USER_READ', 'USER_UPDATE', 'VENDOR_CREATE', 'VENDOR_UPDATE', 'VENDOR_MANAGE', 'PRODUCT_CREATE', 'PRODUCT_UPDATE', 'PRODUCT_DELETE', 'ORDER_READ', 'ORDER_MANAGE'))
  OR (r.name = 'DRIVER' AND p.action IN ('USER_READ', 'ORDER_READ'))
  OR (r.name = 'DELIVERY_AGENT' AND p.action IN ('USER_READ', 'ORDER_READ', 'DELIVERY_AGENT_OPERATE'))
WHERE
  (r.organizationId IN (SELECT id FROM "Organization" WHERE slug = 'marka-platform' AND type = 'PLATFORM' AND status = 'ACTIVE'))
  OR r.name = 'DELIVERY_AGENT'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

-- Legacy privileged accounts use User.role as their original role assignment.
INSERT INTO "UserRole" ("id", "userId", "roleId", "organizationId", "createdAt")
SELECT gen_random_uuid()::text, u.id, r.id, m."organizationId", CURRENT_TIMESTAMP
FROM "User" u
JOIN "OrganizationMembership" m ON m."userId" = u.id AND m.status = 'ACTIVE'
JOIN "Organization" o ON o.id = m."organizationId" AND o.slug = 'marka-platform' AND o.type = 'PLATFORM'
JOIN "Role" r ON r."organizationId" = m."organizationId" AND r.name = u.role AND r.status = 'ACTIVE'
WHERE u.role IN ('ADMIN', 'SUPER_ADMIN')
ON CONFLICT ("userId", "roleId", "organizationId") DO NOTHING;

-- Active delivery agents receive only the DELIVERY_AGENT operating role.
INSERT INTO "UserRole" ("id", "userId", "roleId", "organizationId", "createdAt")
SELECT gen_random_uuid()::text, da."userId", r.id, da."organizationId", CURRENT_TIMESTAMP
FROM "DeliveryAgent" da
JOIN "Role" r ON r."organizationId" = da."organizationId" AND r.name = 'DELIVERY_AGENT' AND r.status = 'ACTIVE'
WHERE da.status = 'ACTIVE'
ON CONFLICT ("userId", "roleId", "organizationId") DO NOTHING;
