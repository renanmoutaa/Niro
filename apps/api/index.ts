import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { db } from './db';
import { leads, messages, settings, templates } from '../../packages/db/schema';
import { eq, like, or, and, sql, asc, desc } from 'drizzle-orm';
import { sendMessage } from './twilio';

const app = new Hono();
app.use('*', cors());

// Health check
app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

// List leads with filters, pagination and sorting
app.get('/leads', async (c) => {
  const query = c.req.query('q');
  const status = c.req.query('status');
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');
  const sort = c.req.query('sort') || 'name';
  const order = c.req.query('order') || 'asc';
  const neighborhood = c.req.query('neighborhood');
  const city = c.req.query('city');
  const income = c.req.query('income');

  let conditions = [];

  if (query) {
    conditions.push(
      or(
        like(leads.name, `%${query}%`),
        like(leads.email, `%${query}%`),
        like(leads.phone, `%${query}%`),
        like(leads.cpf, `%${query}%`)
      )
    );
  }

  if (status) {
    conditions.push(eq(leads.status, status));
  }

  if (neighborhood) {
    conditions.push(eq(leads.neighborhood, neighborhood));
  }

  if (city) {
    conditions.push(eq(leads.city, city));
  }

  if (income) {
    conditions.push(eq(leads.income, income));
  }

  // Count total for pagination
  const totalCountResult = await db
    .select({ count: sql`count(*)` })
    .from(leads)
    .where(conditions.length > 0 ? and(...conditions) : undefined);
  
  const total = Number(totalCountResult[0].count);
  const totalPages = Math.ceil(total / limit);

  // Fetch paginated and sorted data
  const result = await db
    .select()
    .from(leads)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(order === 'desc' ? desc((leads as any)[sort]) : asc((leads as any)[sort]))
    .limit(limit)
    .offset((page - 1) * limit);

  return c.json({
    data: result,
    pagination: {
      total,
      pages: totalPages,
      page,
      limit
    }
  });
});

// Get unique filter options for leads
app.get('/leads/filter-options', async (c) => {
  const neighborhoods = await db.select({ value: leads.neighborhood }).from(leads).groupBy(leads.neighborhood);
  const cities = await db.select({ value: leads.city }).from(leads).groupBy(leads.city);
  const incomes = await db.select({ value: leads.income }).from(leads).groupBy(leads.income);

  return c.json({
    neighborhoods: neighborhoods.map(n => n.value).filter(Boolean),
    cities: cities.map(c => c.value).filter(Boolean),
    incomes: incomes.map(i => i.value).filter(Boolean)
  });
});


// Get stats
app.get('/stats', async (c) => {
  const totalLeads = await db.select({ count: sql`count(*)` }).from(leads);
  const statusStats = await db
    .select({ status: leads.status, count: sql`count(*)` })
    .from(leads)
    .groupBy(leads.status);
  
  const deviceStats = await db
    .select({ device: leads.device, count: sql`count(*)` })
    .from(leads)
    .groupBy(leads.device)
    .limit(10);

  return c.json({
    total: totalLeads[0].count,
    byStatus: statusStats,
    topDevices: deviceStats
  });
});

import { v4 as uuidv4 } from 'uuid';
import { parse as csvParse } from 'csv-parse/sync';

// Download CSV Template
app.get('/leads/template', (c) => {
  const headers = 'name,email,phone,cpf,age,income,neighborhood,city,state\n';
  return c.text(headers, 200, {
    'Content-Type': 'text/csv',
    'Content-Disposition': 'attachment; filename=niro_template.csv',
  });
});

// Export Leads
app.get('/leads/export', async (c) => {
  const allLeads = await db.select().from(leads);
  let csv = 'ID,Nome,Email,Telefone,CPF,Idade,Renda,Bairro,Cidade,UF\n';
  
  allLeads.forEach(l => {
    csv += `${l.id},${l.name},${l.email},${l.phone || ''},${l.cpf || ''},${l.age || ''},${l.income || ''},${l.neighborhood || ''},${l.city || ''},${l.state || ''}\n`;
  });

  return c.text(csv, 200, {
    'Content-Type': 'text/csv',
    'Content-Disposition': `attachment; filename=relatorio_leads_${new Date().toISOString().split('T')[0]}.csv`,
  });
});

// Import Leads
app.post('/leads/import', async (c) => {
  const body = await c.req.parseBody();
  const file = body['file'];

  if (!file || typeof file === 'string') {
    return c.json({ error: 'Arquivo não enviado' }, 400);
  }

  try {
    const text = await (file as any).text();
    const records = csvParse(text, { columns: true, skip_empty_lines: true }) as any[];

    for (const record of records) {
      await db.insert(leads).values({
        id: uuidv4(),
        name: record.name || record.Nome,
        email: record.email || record.Email,
        phone: record.phone || record.Telefone,
        cpf: record.cpf || record.CPF,
        age: record.age || record.Idade,
        income: record.income || record.Renda,
        neighborhood: record.neighborhood || record.Bairro,
        city: record.city || record.Cidade,
        state: record.state || record.UF,
        status: 'default',
        location: `${record.city || record.Cidade || ''} / ${record.state || record.UF || ''}`,
      }).onConflictDoUpdate({
        target: leads.email,
        set: {
          name: record.name || record.Nome,
          phone: record.phone || record.Telefone,
          income: record.income || record.Renda,
          city: record.city || record.Cidade,
          state: record.state || record.UF,
        }
      });
    }

    return c.json({ message: `${records.length} leads importados/atualizados com sucesso.` });
  } catch (err) {
    console.error(err);
    return c.json({ error: 'Erro ao processar CSV' }, 500);
  }
});


// Get single lead
app.get('/leads/:id', async (c) => {
  const id = c.req.param('id');
  const result = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
  
  if (result.length === 0) {
    return c.json({ error: 'Lead not found' }, 404);
  }
  
  return c.json(result[0]);
});

import { enrichLead } from './enrichment';

// Enrich lead data via Apify
app.post('/leads/:id/enrich', async (c) => {
  const id = c.req.param('id');
  const leadResult = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
  
  if (leadResult.length === 0) {
    return c.json({ error: 'Lead not found' }, 404);
  }

  const lead = leadResult[0];
  const token = process.env.APIFY_TOKEN;

  if (!token) {
    return c.json({ error: 'Configuração pendente: APIFY_TOKEN não encontrado no servidor.' }, 500);
  }

  try {
    const data = await enrichLead({ 
      name: lead.name, 
      email: lead.email || "", 
      phone: lead.phone || undefined 
    }, token);
    
    // Atualiza o banco com os novos dados (apenas se foram encontrados)
    const updateData: any = {};
    if (data.neighborhood) updateData.neighborhood = data.neighborhood;
    if (data.city) updateData.city = data.city;
    if (data.state) updateData.state = data.state;
    if (data.city && data.state) updateData.location = `${data.city} / ${data.state}`;

    if (Object.keys(updateData).length > 0) {
      await db.update(leads).set(updateData).where(eq(leads.id, id));
    }

    const updatedLead = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
    return c.json({ 
      message: 'Lead enriquecido com sucesso!', 
      data: updatedLead[0],
      found: Object.keys(updateData).length > 0
    });
  } catch (err: any) {
    console.error(err);
    return c.json({ error: 'Erro no enriquecimento: ' + err.message }, 500);
  }
});

// MESSAGING ROUTES

// List all messages (global history)
app.get('/messages', async (c) => {
  const result = await db.select().from(messages).orderBy(desc(messages.createdAt)).limit(50);
  return c.json(result);
});

// Send message
app.post('/messages/send', async (c) => {
  const { leadId, content, type } = await c.req.json();
  
  const lead = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);
  if (!lead.length || !lead[0].phone) {
    return c.json({ error: 'Lead não encontrado ou sem telefone' }, 404);
  }

  try {
    const twilioRes = await sendMessage({
      to: lead[0].phone,
      body: content,
      type: type || 'sms'
    });

    const newMessage = {
      id: twilioRes.sid,
      leadId,
      content,
      direction: 'outbound',
      status: twilioRes.status,
      type: type || 'sms',
      createdAt: Date.now()
    };

    await db.insert(messages).values(newMessage);
    
    // Notify SSE clients
    notifyClients(newMessage);

    return c.json(newMessage);
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// SSE for Real-time updates
let clients: any[] = [];

const notifyClients = (data: any) => {
  clients.forEach(client => {
    client.write(`data: ${JSON.stringify(data)}\n\n`);
  });
};

app.get('/messages/feed', (c) => {
  return new Response(
    new ReadableStream({
      start(controller) {
        const client = {
          write: (msg: string) => controller.enqueue(new TextEncoder().encode(msg))
        };
        clients.push(client);
        
        c.req.raw.signal.addEventListener('abort', () => {
          clients = clients.filter(h => h !== client);
          controller.close();
        });
      }
    }),
    {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    }
);
});

// Twilio Webhook (Status Updates)
app.post('/webhooks/twilio', async (c) => {
  const body = await c.req.parseBody();
  const sid = body.MessageSid as string;
  const status = body.MessageStatus as string;

  if (sid && status) {
    await db.update(messages).set({ status }).where(eq(messages.id, sid));
    
    // Fetch and notify
    const updated = await db.select().from(messages).where(eq(messages.id, sid)).limit(1);
    if (updated.length) {
      notifyClients(updated[0]);
    }
  }

  return c.text('OK');
});

// SETTINGS ROUTES

// Get settings
app.get('/settings', async (c) => {
  const result = await db.select().from(settings);
  // Transform to object for easier consumption
  const config = result.reduce((acc: any, curr) => {
    acc[curr.key] = curr.value;
    return acc;
  }, {});
  return c.json(config);
});

// Update settings
app.post('/settings', async (c) => {
  const body = await c.req.json();
  
  for (const [key, value] of Object.entries(body)) {
    await db.insert(settings).values({
      key,
      value: value as string,
      updatedAt: Date.now()
    }).onConflictDoUpdate({
      target: settings.key,
      set: { value: value as string, updatedAt: Date.now() }
    });
  }

  return c.json({ message: 'Configurações atualizadas com sucesso' });
});

// TEMPLATES ROUTES

// Get all templates
app.get('/templates', async (c) => {
  const result = await db.select().from(templates).orderBy(desc(templates.createdAt));
  return c.json(result);
});

// Create/Update template
app.post('/templates', async (c) => {
  const body = await c.req.json();
  const id = body.id || uuidv4();
  
  await db.insert(templates).values({
    id,
    title: body.title,
    content: body.content,
    type: body.type || 'sms',
    createdAt: body.createdAt || Date.now()
  }).onConflictDoUpdate({
    target: templates.id,
    set: {
      title: body.title,
      content: body.content,
      type: body.type || 'sms'
    }
  });

  return c.json({ id, message: 'Template salvo com sucesso' });
});

// Delete template
app.delete('/templates/:id', async (c) => {
  const id = c.req.param('id');
  await db.delete(templates).where(eq(templates.id, id));
  return c.json({ message: 'Template excluído com sucesso' });
});

const port = 3001;
const token = process.env.APIFY_TOKEN;
console.log(`Niro API running on http://localhost:${port}`);
console.log(`Status Configuração: ${token ? 'Apify Token Ativo' : 'Apify Token Ausente'}`);

if (process.env.NODE_ENV !== 'production') {
  serve({
    fetch: app.fetch,
    port
  });
}

export default app;
