import type { Express, Request, Response } from "express";
import * as crmDb from "./crmDb";

/**
 * Public webhook endpoints for external integrations.
 * Each endpoint validates the API token from the `x-api-token` header
 * against the crm_integrations table.
 * 
 * Endpoints:
 *   POST /api/webhooks/lead       — Create a new lead from any platform
 *   POST /api/webhooks/whatsapp   — Receive WhatsApp messages (future)
 *   GET  /api/webhooks/health     — Health check
 * 
 * Usage:
 *   curl -X POST https://your-domain/api/webhooks/lead \
 *     -H "Content-Type: application/json" \
 *     -H "x-api-token: kafka_xxxxxxxxxxxx" \
 *     -d '{"name":"João","phone":"11999999999","source":"olx","vehicleInterest":"HB20 2023","department":"vendas"}'
 */

async function validateToken(req: Request, res: Response): Promise<boolean> {
  const token = req.headers["x-api-token"] as string;
  if (!token) {
    res.status(401).json({ error: "Token de API obrigatorio. Envie no header x-api-token." });
    return false;
  }
  const integration = await crmDb.getIntegrationByToken(token);
  if (!integration || !integration.active) {
    res.status(403).json({ error: "Token invalido ou integracao desativada." });
    return false;
  }
  return true;
}

export function registerWebhookRoutes(app: Express) {
  // Health check - no auth needed
  app.get("/api/webhooks/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", timestamp: Date.now(), version: "1.0.0" });
  });

  // Create lead from external platform
  app.post("/api/webhooks/lead", async (req: Request, res: Response) => {
    try {
      if (!(await validateToken(req, res))) return;

      const { name, phone, email, vehicleInterest, vehiclePlate, source, department, notes, sellerId } = req.body;

      if (!name) {
        res.status(400).json({ error: "Campo 'name' e obrigatorio." });
        return;
      }

      // Get default stage for the department
      const dept = department || "vendas";
      const defaultStage = await crmDb.getDefaultStage(dept);

      const leadId = await crmDb.createLead({
        name,
        phone: phone || null,
        email: email || null,
        vehicleInterest: vehicleInterest || null,
        vehiclePlate: vehiclePlate || null,
        source: source || "api",
        department: dept,
        stage: defaultStage?.name || "Novo Lead",
        score: "warm",
        sellerId: sellerId || null,
        notes: notes || null,
      });

      // Create initial activity
      await crmDb.createActivity({
        leadId,
        sellerId: sellerId || null,
        type: "criacao",
        description: `Lead criado via API (${source || "api"})`,
      });

      // If vehicle interest was provided, check for matching inventory
      let matchingVehicles = 0;
      if (vehicleInterest) {
        const inventory = await crmDb.listInventory({ search: vehicleInterest });
        matchingVehicles = inventory.length;
      }

      res.status(201).json({
        success: true,
        leadId,
        matchingVehicles,
        message: `Lead '${name}' criado com sucesso.${matchingVehicles > 0 ? ` ${matchingVehicles} veiculo(s) no estoque correspondem ao interesse.` : ""}`,
      });
    } catch (err: any) {
      console.error("Webhook lead error:", err);
      res.status(500).json({ error: "Erro interno ao criar lead.", details: err.message });
    }
  });

  // Bulk create leads
  app.post("/api/webhooks/leads/bulk", async (req: Request, res: Response) => {
    try {
      if (!(await validateToken(req, res))) return;

      const { leads } = req.body;
      if (!Array.isArray(leads) || leads.length === 0) {
        res.status(400).json({ error: "Campo 'leads' deve ser um array com pelo menos 1 item." });
        return;
      }

      if (leads.length > 100) {
        res.status(400).json({ error: "Maximo de 100 leads por requisicao." });
        return;
      }

      const results = [];
      for (const lead of leads) {
        try {
          const dept = lead.department || "vendas";
          const defaultStage = await crmDb.getDefaultStage(dept);
          const leadId = await crmDb.createLead({
            name: lead.name,
            phone: lead.phone || null,
            email: lead.email || null,
            vehicleInterest: lead.vehicleInterest || null,
            vehiclePlate: lead.vehiclePlate || null,
            source: lead.source || "api",
            department: dept,
            stage: defaultStage?.name || "Novo Lead",
            score: lead.score || "warm",
            sellerId: lead.sellerId || null,
            notes: lead.notes || null,
          });
          await crmDb.createActivity({
            leadId,
            sellerId: lead.sellerId || null,
            type: "criacao",
            description: `Lead criado via API bulk (${lead.source || "api"})`,
          });
          results.push({ name: lead.name, leadId, success: true });
        } catch (err: any) {
          results.push({ name: lead.name, success: false, error: err.message });
        }
      }

      res.status(201).json({
        success: true,
        total: leads.length,
        created: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results,
      });
    } catch (err: any) {
      console.error("Webhook bulk lead error:", err);
      res.status(500).json({ error: "Erro interno.", details: err.message });
    }
  });

  // WhatsApp webhook (placeholder for future integration)
  app.post("/api/webhooks/whatsapp", async (req: Request, res: Response) => {
    try {
      if (!(await validateToken(req, res))) return;

      // Placeholder: log the incoming message
      const { from, message, timestamp } = req.body;
      console.log(`WhatsApp webhook: from=${from}, message=${message}, ts=${timestamp}`);

      // Try to find existing lead by phone
      if (from) {
        const phone = from.replace(/\D/g, "");
        const existingLeads = await crmDb.searchLeads(phone);
        if (existingLeads.length > 0) {
          // Add activity to existing lead
          await crmDb.createActivity({
            leadId: existingLeads[0].id,
            sellerId: existingLeads[0].sellerId,
            type: "whatsapp",
            description: `Mensagem recebida: ${(message || "").substring(0, 200)}`,
          });
          res.json({ success: true, action: "activity_added", leadId: existingLeads[0].id });
          return;
        }
      }

      res.json({ success: true, action: "logged", message: "Mensagem recebida. Nenhum lead correspondente encontrado." });
    } catch (err: any) {
      console.error("WhatsApp webhook error:", err);
      res.status(500).json({ error: "Erro interno.", details: err.message });
    }
  });

  // SIG Web sync endpoint
  app.post("/api/webhooks/sig/sale", async (req: Request, res: Response) => {
    try {
      if (!(await validateToken(req, res))) return;

      const { leadId, vehicleModel, saleValue, sigId } = req.body;

      if (leadId) {
        // Update lead stage to "Venda Fechada" or equivalent
        const lead = await crmDb.getLeadById(leadId);
        if (lead) {
          await crmDb.updateLead(leadId, { stage: "Venda Fechada", archived: true });
          await crmDb.createActivity({
            leadId,
            sellerId: lead.sellerId,
            type: "observacao",
            description: `Venda sincronizada do SIG (ID: ${sigId || "N/A"}). Veiculo: ${vehicleModel || "N/A"}. Valor: R$ ${saleValue || "N/A"}`,
          });
        }
      }

      res.json({ success: true, message: "Venda sincronizada com sucesso." });
    } catch (err: any) {
      console.error("SIG webhook error:", err);
      res.status(500).json({ error: "Erro interno.", details: err.message });
    }
  });

  // Get API documentation
  app.get("/api/webhooks/docs", (_req: Request, res: Response) => {
    res.json({
      title: "Kafka CRM API",
      version: "1.0.0",
      description: "API para integracao com o CRM Kafka Rank. Use o token de API gerado no painel admin.",
      authentication: {
        type: "API Token",
        header: "x-api-token",
        description: "Token gerado nas configuracoes de integracao do CRM Admin.",
      },
      endpoints: [
        {
          method: "GET",
          path: "/api/webhooks/health",
          description: "Verificar se a API esta funcionando.",
          auth: false,
        },
        {
          method: "POST",
          path: "/api/webhooks/lead",
          description: "Criar um novo lead.",
          auth: true,
          body: {
            name: { type: "string", required: true, description: "Nome do cliente" },
            phone: { type: "string", required: false, description: "Telefone (ex: 11999999999)" },
            email: { type: "string", required: false, description: "Email" },
            vehicleInterest: { type: "string", required: false, description: "Veiculo de interesse" },
            vehiclePlate: { type: "string", required: false, description: "Placa do veiculo atual" },
            source: { type: "string", required: false, description: "Origem: manual, whatsapp, olx, webmotors, socarrao, facebook, instagram, trafego_pago, indicacao, loja, api" },
            department: { type: "string", required: false, description: "Setor: vendas, pre_vendas, consignacao, fei. Default: vendas" },
            sellerId: { type: "number", required: false, description: "ID do vendedor responsavel" },
            notes: { type: "string", required: false, description: "Observacoes" },
          },
        },
        {
          method: "POST",
          path: "/api/webhooks/leads/bulk",
          description: "Criar multiplos leads de uma vez (max 100).",
          auth: true,
          body: {
            leads: { type: "array", required: true, description: "Array de objetos lead (mesmos campos do endpoint /lead)" },
          },
        },
        {
          method: "POST",
          path: "/api/webhooks/whatsapp",
          description: "Receber mensagens do WhatsApp (webhook).",
          auth: true,
          body: {
            from: { type: "string", description: "Numero do remetente" },
            message: { type: "string", description: "Texto da mensagem" },
            timestamp: { type: "number", description: "Timestamp da mensagem" },
          },
        },
        {
          method: "POST",
          path: "/api/webhooks/sig/sale",
          description: "Sincronizar venda do SIG Web.",
          auth: true,
          body: {
            leadId: { type: "number", description: "ID do lead no CRM" },
            vehicleModel: { type: "string", description: "Modelo do veiculo vendido" },
            saleValue: { type: "number", description: "Valor da venda" },
            sigId: { type: "string", description: "ID da venda no SIG" },
          },
        },
      ],
    });
  });
}
