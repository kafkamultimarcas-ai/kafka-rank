import "dotenv/config";
import bcrypt from "bcryptjs";
import mysql from "mysql2/promise";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to run the demo tenant seed");
}

const DEMO = {
  defaultPassword: "senha123",
  superAdmin: {
    username: "superadmin",
    password: "senha123",
    name: "Super Admin Local",
    email: "super@local.test",
  },
  tenant: {
    name: "Loja Demo Multi",
    slug: "loja-demo",
    phone: "(47) 99999-0000",
    email: "contato@loja-demo.local",
    city: "Joinville",
    state: "SC",
    address: "Rua das Lojas, 100",
    primaryColor: "#DC2626",
    secondaryColor: "#111827",
    plan: "pro",
    maxSellers: 25,
    maxAdmins: 5,
    status: "active",
    monthlyPrice: 29900,
    enabledModules: JSON.stringify([
      "ranking",
      "crm",
      "financeiro",
      "pos_venda",
      "consignacao",
      "mesa_credito",
      "marketing",
      "estoque",
      "iam",
      "treinamentos",
      "competicoes",
      "mata_mata",
    ]),
  },
  admin: {
    username: "admin-lojademo",
    password: "senha123",
    name: "Admin Demo",
    email: "admin@loja-demo.local",
    phone: "(47) 98888-0001",
    role: "owner",
  },
  managerUser: {
    username: "gerente-lojademo",
    password: "senha123",
    name: "Gerente Demo",
  },
  sellers: [
    {
      username: "vendedor-lojademo",
      password: "senha123",
      name: "Vendedor Demo",
      nickname: "Vendedor",
      email: "vendedor@loja-demo.local",
      phone: "(47) 98888-0002",
      department: "vendas",
      sellerRole: "vendedor",
    },
    {
      username: "gerente-seller-lojademo",
      password: "senha123",
      name: "Gerente Painel Demo",
      nickname: "Gerente",
      email: "gerente-painel@loja-demo.local",
      phone: "(47) 98888-0003",
      department: "vendas",
      sellerRole: "gerente",
    },
    {
      username: "financeiro-lojademo",
      password: "senha123",
      name: "Financeiro Demo",
      nickname: "Financeiro",
      email: "financeiro@loja-demo.local",
      phone: "(47) 98888-0004",
      department: "financeiro",
      sellerRole: "vendedor",
    },
    {
      username: "posvenda-lojademo",
      password: "senha123",
      name: "Pós-venda Demo",
      nickname: "Pós-venda",
      email: "posvenda@loja-demo.local",
      phone: "(47) 98888-0005",
      department: "pos_venda",
      sellerRole: "vendedor",
    },
  ],
  managerPermissions: [
    { module: "ranking", canView: 1, canEdit: 1 },
    { module: "crm", canView: 1, canEdit: 1 },
    { module: "financeiro", canView: 1, canEdit: 0 },
    { module: "pos_venda", canView: 1, canEdit: 1 },
    { module: "marketing", canView: 1, canEdit: 1 },
    { module: "metas", canView: 1, canEdit: 1 },
  ],
  pipelineStages: [
    { department: "vendas", name: "Novo", displayOrder: 1, color: "#3B82F6", isDefault: 1, isFinal: 0 },
    { department: "vendas", name: "Contato", displayOrder: 2, color: "#F59E0B", isDefault: 0, isFinal: 0 },
    { department: "vendas", name: "Agendado", displayOrder: 3, color: "#8B5CF6", isDefault: 0, isFinal: 0 },
    { department: "vendas", name: "Fechado", displayOrder: 4, color: "#10B981", isDefault: 0, isFinal: 1 },
  ],
  finCategories: [
    { name: "Aluguel", type: "expense", color: "#EF4444" },
    { name: "Comissões", type: "expense", color: "#10B981" },
    { name: "Venda de Veículo", type: "income", color: "#22C55E" },
    { name: "Financiamento", type: "income", color: "#06B6D4" },
  ],
};

function logSection(title) {
  console.log(`\n=== ${title} ===`);
}

async function ensureSuperAdmin(connection) {
  const passwordHash = await bcrypt.hash(DEMO.superAdmin.password, 10);

  await connection.execute(
    `
      INSERT INTO super_admins (
        username, passwordHash, name, email, emailVerified, twoFactorEnabled, super_role, active
      ) VALUES (?, ?, ?, ?, 1, 0, 'owner', 1)
      ON DUPLICATE KEY UPDATE
        passwordHash = VALUES(passwordHash),
        name = VALUES(name),
        email = VALUES(email),
        emailVerified = VALUES(emailVerified),
        twoFactorEnabled = VALUES(twoFactorEnabled),
        super_role = VALUES(super_role),
        active = VALUES(active)
    `,
    [
      DEMO.superAdmin.username,
      passwordHash,
      DEMO.superAdmin.name,
      DEMO.superAdmin.email,
    ]
  );
}

async function ensureTenant(connection) {
  const [rows] = await connection.execute(
    "SELECT id FROM tenants WHERE slug = ? LIMIT 1",
    [DEMO.tenant.slug]
  );

  if (rows.length > 0) {
    const tenantId = rows[0].id;
    await connection.execute(
      `
        UPDATE tenants
        SET name = ?, phone = ?, email = ?, address = ?, city = ?, state = ?,
            primaryColor = ?, secondaryColor = ?, plan = ?, maxSellers = ?, maxAdmins = ?,
            enabledModules = ?, tenant_status = ?, monthlyPrice = ?
        WHERE id = ?
      `,
      [
        DEMO.tenant.name,
        DEMO.tenant.phone,
        DEMO.tenant.email,
        DEMO.tenant.address,
        DEMO.tenant.city,
        DEMO.tenant.state,
        DEMO.tenant.primaryColor,
        DEMO.tenant.secondaryColor,
        DEMO.tenant.plan,
        DEMO.tenant.maxSellers,
        DEMO.tenant.maxAdmins,
        DEMO.tenant.enabledModules,
        DEMO.tenant.status,
        DEMO.tenant.monthlyPrice,
        tenantId,
      ]
    );
    return tenantId;
  }

  const [result] = await connection.execute(
    `
      INSERT INTO tenants (
        name, slug, phone, email, address, city, state,
        primaryColor, secondaryColor, plan, maxSellers, maxAdmins,
        enabledModules, tenant_status, monthlyPrice
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      DEMO.tenant.name,
      DEMO.tenant.slug,
      DEMO.tenant.phone,
      DEMO.tenant.email,
      DEMO.tenant.address,
      DEMO.tenant.city,
      DEMO.tenant.state,
      DEMO.tenant.primaryColor,
      DEMO.tenant.secondaryColor,
      DEMO.tenant.plan,
      DEMO.tenant.maxSellers,
      DEMO.tenant.maxAdmins,
      DEMO.tenant.enabledModules,
      DEMO.tenant.status,
      DEMO.tenant.monthlyPrice,
    ]
  );

  return result.insertId;
}

async function ensureTenantAdmin(connection, tenantId) {
  const passwordHash = await bcrypt.hash(DEMO.admin.password, 10);

  await connection.execute(
    `
      INSERT INTO admins (
        username, passwordHash, name, email, admin_phone, mustChangePassword, role, active, tenantId
      ) VALUES (?, ?, ?, ?, ?, 0, ?, 1, ?)
      ON DUPLICATE KEY UPDATE
        passwordHash = VALUES(passwordHash),
        name = VALUES(name),
        email = VALUES(email),
        admin_phone = VALUES(admin_phone),
        mustChangePassword = VALUES(mustChangePassword),
        role = VALUES(role),
        active = VALUES(active),
        tenantId = VALUES(tenantId)
    `,
    [
      DEMO.admin.username,
      passwordHash,
      DEMO.admin.name,
      DEMO.admin.email,
      DEMO.admin.phone,
      DEMO.admin.role,
      tenantId,
    ]
  );
}

async function ensureManager(connection, tenantId) {
  const passwordHash = await bcrypt.hash(DEMO.managerUser.password, 10);

  await connection.execute(
    `
      INSERT INTO managers (username, passwordHash, name, active, tenantId)
      VALUES (?, ?, ?, 1, ?)
      ON DUPLICATE KEY UPDATE
        passwordHash = VALUES(passwordHash),
        name = VALUES(name),
        active = VALUES(active),
        tenantId = VALUES(tenantId)
    `,
    [
      DEMO.managerUser.username,
      passwordHash,
      DEMO.managerUser.name,
      tenantId,
    ]
  );
}

async function ensureSeller(connection, tenantId, seller) {
  const passwordHash = await bcrypt.hash(seller.password, 10);
  const [rows] = await connection.execute(
    "SELECT id FROM sellers WHERE tenantId = ? AND username = ? LIMIT 1",
    [tenantId, seller.username]
  );

  if (rows.length > 0) {
    const sellerId = rows[0].id;
    await connection.execute(
      `
        UPDATE sellers
        SET name = ?, nickname = ?, phone = ?, email = ?, department = ?, active = 1,
            username = ?, passwordHash = ?, sellerRole = ?
        WHERE id = ?
      `,
      [
        seller.name,
        seller.nickname,
        seller.phone,
        seller.email,
        seller.department,
        seller.username,
        passwordHash,
        seller.sellerRole,
        sellerId,
      ]
    );
    return sellerId;
  }

  const [result] = await connection.execute(
    `
      INSERT INTO sellers (
        name, nickname, phone, email, department, active,
        totalSales, totalPoints, username, passwordHash, sellerRole, tenantId
      ) VALUES (?, ?, ?, ?, ?, 1, 0, 0, ?, ?, ?, ?)
    `,
    [
      seller.name,
      seller.nickname,
      seller.phone,
      seller.email,
      seller.department,
      seller.username,
      passwordHash,
      seller.sellerRole,
      tenantId,
    ]
  );

  return result.insertId;
}

async function ensureManagerPermissions(connection, tenantId, sellerId) {
  await connection.execute(
    "DELETE FROM manager_permissions WHERE tenantId = ? AND sellerId = ?",
    [tenantId, sellerId]
  );

  for (const permission of DEMO.managerPermissions) {
    await connection.execute(
      `
        INSERT INTO manager_permissions (sellerId, module, canView, canEdit, tenantId)
        VALUES (?, ?, ?, ?, ?)
      `,
      [sellerId, permission.module, permission.canView, permission.canEdit, tenantId]
    );
  }
}

async function ensurePipelineStages(connection, tenantId) {
  for (const stage of DEMO.pipelineStages) {
    const [rows] = await connection.execute(
      "SELECT id FROM crm_pipeline_stages WHERE tenantId = ? AND department = ? AND name = ? LIMIT 1",
      [tenantId, stage.department, stage.name]
    );

    if (rows.length > 0) continue;

    await connection.execute(
      `
        INSERT INTO crm_pipeline_stages (department, name, displayOrder, color, isDefault, isFinal, tenantId)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [stage.department, stage.name, stage.displayOrder, stage.color, stage.isDefault, stage.isFinal, tenantId]
    );
  }
}

async function ensureFinCategories(connection, tenantId) {
  for (const category of DEMO.finCategories) {
    const [rows] = await connection.execute(
      "SELECT id FROM fin_categories WHERE tenantId = ? AND name = ? LIMIT 1",
      [tenantId, category.name]
    );

    if (rows.length > 0) continue;

    await connection.execute(
      "INSERT INTO fin_categories (name, type, color, tenantId) VALUES (?, ?, ?, ?)",
      [category.name, category.type, category.color, tenantId]
    );
  }
}

async function main() {
  const connection = await mysql.createConnection(databaseUrl);

  try {
    logSection("Seed Demo Tenant");

    await ensureSuperAdmin(connection);
    const tenantId = await ensureTenant(connection);
    await ensureTenantAdmin(connection, tenantId);
    await ensureManager(connection, tenantId);

    let gerenteSellerId = null;

    for (const seller of DEMO.sellers) {
      const sellerId = await ensureSeller(connection, tenantId, seller);
      if (seller.sellerRole === "gerente") {
        gerenteSellerId = sellerId;
      }
    }

    if (gerenteSellerId) {
      await ensureManagerPermissions(connection, tenantId, gerenteSellerId);
    }

    await ensurePipelineStages(connection, tenantId);
    await ensureFinCategories(connection, tenantId);

    console.log("Tenant demo criado/atualizado com sucesso.");
    console.log(`Tenant ID: ${tenantId}`);

    logSection("URLs de teste");
    console.log("Portal master: http://localhost:3000/super-admin");
    console.log("Login único: http://localhost:3000/login");
    console.log(`CRM admin: http://localhost:3000/t/${DEMO.tenant.slug}/crm/admin`);
    console.log(`Gerente: http://localhost:3000/t/${DEMO.tenant.slug}/gerente`);
    console.log(`Financeiro: http://localhost:3000/t/${DEMO.tenant.slug}/financeiro`);
    console.log(`Pós-venda: http://localhost:3000/t/${DEMO.tenant.slug}/pos-venda`);

    logSection("Credenciais");
    console.log(`Super admin: ${DEMO.superAdmin.username} / ${DEMO.superAdmin.password}`);
    console.log(`Admin CRM: ${DEMO.admin.username} / ${DEMO.admin.password}`);
    console.log(`Manager table: ${DEMO.managerUser.username} / ${DEMO.managerUser.password}`);
    for (const seller of DEMO.sellers) {
      console.log(`${seller.department} (${seller.sellerRole}): ${seller.username} / ${seller.password}`);
    }
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error("Falha ao executar seed demo:", error);
  process.exit(1);
});
