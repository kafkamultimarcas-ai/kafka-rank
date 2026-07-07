import "dotenv/config";
import bcrypt from "bcryptjs";
import mysql from "mysql2/promise";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to run the second tenant seed");
}

const DEMO = {
  defaultPassword: "senha123",
  tenant: {
    name: "Auto Veloz Motors",
    slug: "auto-veloz",
    phone: "(11) 98888-1000",
    email: "contato@auto-veloz.local",
    city: "Sao Paulo",
    state: "SP",
    address: "Av. Paulista, 2000",
    primaryColor: "#2563EB",
    secondaryColor: "#0F172A",
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
    username: "admin-autoveloz",
    password: "senha123",
    name: "Admin Auto Veloz",
    email: "admin@auto-veloz.local",
    phone: "(11) 98888-1001",
    role: "owner",
  },
  managerUser: {
    username: "gerente-autoveloz",
    password: "senha123",
    name: "Gerente Auto Veloz",
  },
  sellers: [
    {
      username: "vendedor-autoveloz",
      password: "senha123",
      name: "Vendedor Auto Veloz",
      nickname: "Vendedor",
      email: "vendedor@auto-veloz.local",
      phone: "(11) 98888-1002",
      department: "vendas",
      sellerRole: "vendedor",
    },
    {
      username: "gerente-seller-autoveloz",
      password: "senha123",
      name: "Gerente Painel Auto Veloz",
      nickname: "Gerente",
      email: "gerente-painel@auto-veloz.local",
      phone: "(11) 98888-1003",
      department: "vendas",
      sellerRole: "gerente",
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
    { department: "vendas", name: "Novo", displayOrder: 1, color: "#2563EB", isDefault: 1, isFinal: 0 },
    { department: "vendas", name: "Negociando", displayOrder: 2, color: "#F59E0B", isDefault: 0, isFinal: 0 },
    { department: "vendas", name: "Vendido", displayOrder: 3, color: "#16A34A", isDefault: 0, isFinal: 1 },
  ],
  finCategories: [
    { name: "Aluguel", type: "expense", color: "#EF4444" },
    { name: "Comissoes", type: "expense", color: "#10B981" },
    { name: "Venda de Veiculo", type: "income", color: "#22C55E" },
  ],
};

function logSection(title) {
  console.log(`\n=== ${title} ===`);
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
    logSection("Seed Second Tenant (isolamento cross-tenant)");

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

    console.log("Segundo tenant criado/atualizado com sucesso.");
    console.log(`Tenant ID: ${tenantId}`);

    logSection("URLs de teste");
    console.log(`Login vendedor: http://localhost:3000/t/${DEMO.tenant.slug}/login`);
    console.log(`Login CRM admin: http://localhost:3000/t/${DEMO.tenant.slug}/crm/admin/login`);
    console.log(`CRM admin: http://localhost:3000/t/${DEMO.tenant.slug}/crm/admin`);
    console.log(`Gerente: http://localhost:3000/t/${DEMO.tenant.slug}/gerente`);

    logSection("Credenciais");
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
  console.error("Falha ao executar seed do segundo tenant:", error);
  process.exit(1);
});
