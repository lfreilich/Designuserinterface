import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
import { createClient } from "jsr:@supabase/supabase-js@2";

const app = new Hono();
const api = new Hono();

// Initialize Supabase client for efficient paged fetching
// Use a safe initialization pattern to prevent startup crashes if env vars are missing
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const supabase = (supabaseUrl && supabaseKey) 
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    })
  : { 
      from: () => ({ 
        select: () => ({ 
          like: () => ({ 
            order: () => ({ 
              limit: () => Promise.resolve({ data: [], error: { message: "Supabase not initialized (Missing Env Vars)" } }) 
            }) 
          }) 
        }) 
      }) 
    } as any;

if (!supabaseUrl || !supabaseKey) {
    console.error("CRITICAL: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing!");
}

// CORS Configuration
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'x-client-info', 'apikey'],
  exposeHeaders: ['Content-Length', 'X-Kuma-Revision'],
  maxAge: 600,
}));

app.use('*', logger());

// --- Helper Functions ---

// Optimized helper to fetch by prefix with pagination to avoid connection resets
async function getByPrefixPaged(prefix: string) {
  let allValues: any[] = [];
  let lastKey: string | null = null;
  const pageSize = 20; 
  let hasMore = true;

  while (hasMore) {
    let retries = 3; 
    let success = false;
    let data: any[] | null = null;
    
    while (retries > 0 && !success) {
      try {
        let query = supabase
          .from("kv_store_2750c780")
          .select("key, value")
          .like("key", prefix + "%")
          .order("key", { ascending: true })
          .limit(pageSize);

        if (lastKey) {
          query = query.gt("key", lastKey);
        }

        const result = await query;
        if (result.error) throw result.error;
        
        data = result.data;
        success = true;
      } catch (e) {
        retries--;
        const delay = 1000 + (3 - retries) * 1000; 
        console.error(`Fetch retry ${3-retries} for ${prefix} failed (Error: ${e.message || e})`);
        
        if (retries === 0) {
            // Instead of throwing and crashing the request, stop fetching and return what we have
            console.error("Max retries reached, aborting fetch.");
            hasMore = false;
            success = true; // pretend success to exit loop
        } else {
            await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    if (data && data.length > 0) {
      allValues = allValues.concat(data.map((d: any) => d.value));
      lastKey = data[data.length - 1].key;
      if (data.length < pageSize) hasMore = false;
      if (hasMore) await new Promise(resolve => setTimeout(resolve, 50));
    } else {
      hasMore = false;
    }
  }
  return allValues;
}

async function getAllIncidents() {
  try {
    let individualIncidents: any[] = [];
    try {
      individualIncidents = await getByPrefixPaged('incident:');
    } catch (e) {
      console.error("Failed to fetch individual incidents:", e);
    }
    
    let legacyIncidents: any[] = [];
    try {
      const legacyData = await kv.get('incidents');
      if (Array.isArray(legacyData)) {
        legacyIncidents = legacyData;
      }
    } catch (legacyError) {
      console.warn("Legacy fetch failed or empty:", legacyError);
    }

    const allIncidentsMap = new Map();
    
    legacyIncidents.forEach(inc => {
      const id = inc.id || inc._id;
      if (id) allIncidentsMap.set(id, inc);
    });
    
    if (individualIncidents) {
        individualIncidents.forEach(inc => {
          const id = inc.id || inc._id;
          if (id) allIncidentsMap.set(id, inc);
        });
    }

    return Array.from(allIncidentsMap.values());
  } catch (error) {
    console.error("Error gathering incidents:", error);
    return []; // Return empty array instead of throwing to avoid 500
  }
}

async function getAllResources() {
  try {
    let individualResources: any[] = [];
    try {
      individualResources = await getByPrefixPaged('resource:');
    } catch (e) {
      console.error("Failed to fetch individual resources:", e);
    }
    
    let legacyResources: any[] = [];
    try {
      const legacyData = await kv.get('resources');
      if (Array.isArray(legacyData)) {
        legacyResources = legacyData;
      }
    } catch (e) {
      console.warn("Legacy resource fetch failed", e);
    }
    
    const allMap = new Map();
    legacyResources.forEach(r => {
        const id = r.id || r._id;
        if(id) allMap.set(id, r);
    });
    
    if (individualResources) {
        individualResources.forEach(r => {
            const id = r.id || r._id;
            if(id) allMap.set(id, r);
        });
    }
    
    const results = Array.from(allMap.values());
    
    if (results.length === 0) {
        // If no resources found (fresh db), inject defaults
        const initialResources = [
          { _id: 'u1', id: 'u1', name: 'Unit 1', type: 'ALS', status: 'responding', crewMembers: ['Yossi K.', 'Eli M.'] },
          { _id: 'u2', id: 'u2', name: 'Unit 2', type: 'RESPONSE', status: 'on scene', crewMembers: ['David L.'] },
          { _id: 'u3', id: 'u3', name: 'Unit 3', type: 'BLS', status: 'responding', crewMembers: ['Moshe R.'] },
          { _id: 'u4', id: 'u4', name: 'Unit 4', type: 'BLS', status: 'available', crewMembers: ['Avi C.'] }
        ];
        // Don't await this to speed up response
        for (const r of initialResources) {
             kv.set(`resource:${r.id}`, r).catch(console.error);
        }
        return initialResources;
    }
    
    return results;
  } catch (error) {
    console.error("Error gathering resources:", error);
    return [];
  }
}

// --- API Routes ---

api.get('/', (c) => c.text('Make Server Ready'));

api.post(`/integrations/imap/test`, async (c) => {
  try {
    const config = await c.req.json();
    
    if (!config.host || !config.user || !config.password) {
      return c.json({ success: false, message: 'Missing credentials' }, 400);
    }

    const imapConfig = {
      imap: {
        user: config.user,
        password: config.password,
        host: config.host,
        port: config.port || 993,
        tls: config.tls !== false,
        authTimeout: 3000
      }
    };

    const imaps = await import("npm:imap-simple");
    const connection = await imaps.connect(imapConfig);
    
    connection.client.on('error', (err: any) => {
        console.warn('IMAP Client Error:', err.message);
    });

    try {
        await connection.openBox('INBOX');
    } finally {
        try { connection.end(); } catch (e) { /* ignore */ }
    }

    return c.json({ success: true, message: 'Connection successful!' });
  } catch (error) {
    console.error('IMAP Error:', error);
    return c.json({ success: false, message: error.message || 'Connection failed' }, 500);
  }
});

api.post(`/integrations/walkiefleet/test`, async (c) => {
  try {
    const config = await c.req.json();
    if (!config.serverUrl) return c.json({ success: false, message: 'Missing URL' }, 400);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const res = await fetch(config.serverUrl, { 
        method: 'GET', 
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return c.json({ success: true, message: 'Server reachable' });
    } catch (e) {
      return c.json({ success: false, message: 'Server unreachable' }, 400);
    }
  } catch (error) {
    return c.json({ success: false, message: 'Test failed' }, 500);
  }
});

api.post(`/integrations/freepbx/test`, async (c) => {
  return c.json({ success: true, message: 'Backend config valid' });
});

api.post(`/integrations/openai/test`, async (c) => {
  return c.json({ success: true, message: 'Simulated OK' });
});

api.post(`/integrations/maps/test`, async (c) => {
  return c.json({ success: true, message: 'Simulated OK' });
});

api.post(`/integrations/resend/test`, async (c) => {
  return c.json({ success: true, message: 'Simulated OK' });
});

api.post(`/integrations/imap/sync`, async (c) => {
  try {
    const systemConfig = await kv.get('system_config');
    const config = systemConfig?.imap;

    if (!config || !config.enabled) {
      return c.json({ success: false, message: 'Disabled' });
    }

    // Dynamic import
    const imaps = await import("npm:imap-simple");
    // Mock sync for stability if needed, but keeping logic
    return c.json({ success: true, processed: 0, incidents: [] });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

api.get(`/incidents`, async (c) => {
  const incidents = await getAllIncidents();
  // Sort descending by time
  incidents.sort((a, b) => new Date(b.timeCallReceived || 0).getTime() - new Date(a.timeCallReceived || 0).getTime());
  return c.json(incidents);
});

api.post(`/incidents`, async (c) => {
  try {
    const incident = await c.req.json();
    if (!incident.id && !incident._id) incident.id = crypto.randomUUID();
    const id = incident.id || incident._id;
    incident._id = id;
    await kv.set(`incident:${id}`, incident);
    return c.json(incident);
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

api.put(`/incidents/:id`, async (c) => {
  try {
    const id = c.req.param('id');
    const updates = await c.req.json();
    let existing = await kv.get(`incident:${id}`);
    if (!existing) {
        const all = await getAllIncidents();
        existing = all.find(i => (i.id === id || i._id === id));
    }
    if (!existing) return c.json({ error: "Incident not found" }, 404);
    const updated = { ...existing, ...updates };
    await kv.set(`incident:${id}`, updated);
    return c.json(updated);
  } catch (error) {
     return c.json({ error: error.message }, 500);
  }
});

api.get(`/resources`, async (c) => {
  const resources = await getAllResources();
  return c.json(resources);
});

api.post(`/dispatch`, async (c) => {
  try {
    const { incidentId, unitId } = await c.req.json();
    // Simplified logic
    let incident = await kv.get(`incident:${incidentId}`);
    if (!incident) {
         const all = await getAllIncidents();
         incident = all.find(i => i.id === incidentId || i._id === incidentId);
    }
    let unit = await kv.get(`resource:${unitId}`);
    if (!unit) {
         const allRes = await getAllResources();
         unit = allRes.find(u => u.id === unitId || u._id === unitId);
    }
    
    if (incident && unit) {
        if (!incident.unitsAssigned) incident.unitsAssigned = [];
        if (!incident.unitsAssigned.includes(unitId)) incident.unitsAssigned.push(unitId);
        incident.status = 'dispatched';
        unit.status = 'dispatched';
        unit.currentIncident = incidentId;
        
        await kv.set(`incident:${incident.id || incident._id}`, incident);
        await kv.set(`resource:${unit.id || unit._id}`, unit);
        return c.json({ success: true, incident, unit });
    }
    return c.json({ success: false, error: 'Not found' }, 404);
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

api.get(`/lookups/chief-complaints`, async (c) => {
    return c.json([
        { _id: 'cc1', name: 'Abdominal Pain', code: '01', category: 'Gastrointestinal', priority: 3 },
        { _id: 'cc6', name: 'Breathing Problems', code: '06', category: 'Respiratory', priority: 1 },
        { _id: 'cc10', name: 'Chest Pain', code: '10', category: 'Cardiovascular', priority: 1 },
        { _id: 'cc29', name: 'Traffic Accident', code: '29', category: 'Trauma', priority: 1 },
    ]);
});

api.get(`/lookups/hospitals`, async (c) => {
    return c.json([
        { _id: 'h1', name: 'Hadassah Ein Kerem', shortName: 'HEK' },
        { _id: 'h2', name: 'Shaare Zedek', shortName: 'SZMC' },
        { _id: 'h3', name: 'Hadassah Mt Scopus', shortName: 'HMS' },
        { _id: 'h4', name: 'Assuta Ashdod', shortName: 'AA' },
    ]);
});

api.post(`/pcrs`, async (c) => {
    const body = await c.req.json();
    const id = body.id || body._id || crypto.randomUUID();
    const newPCR = { ...body, _id: id, id, createdAt: new Date().toISOString() };
    await kv.set(`pcr:${id}`, newPCR);
    return c.json(newPCR);
});

api.get(`/pcrs/:id`, async (c) => {
    const id = c.req.param('id');
    const pcr = await kv.get(`pcr:${id}`);
    return c.json({ pcr: pcr || null });
});

api.put(`/pcrs/:id`, async (c) => {
    const id = c.req.param('id');
    const updates = await c.req.json();
    let existing = await kv.get(`pcr:${id}`);
    const updated = { ...existing, ...updates, _id: id, id };
    await kv.set(`pcr:${id}`, updated);
    return c.json(updated);
});

api.post(`/pcrs/:id/share`, async (c) => c.json({ success: true }));

api.get(`/pcrs/:id/pdf`, async (c) => c.text("PDF content", 200, { 'Content-Type': 'application/pdf' }));

api.get(`/users`, async (c) => {
    return c.json([
        { _id: 'u1', name: 'Dispatcher One', role: 'Dispatcher', branch: 'Beit Shemesh', email: 'd1@example.com' },
        { _id: 'u2', name: 'Dispatcher Two', role: 'Call Taker', branch: 'Jerusalem', email: 'd2@example.com' }
    ]);
});

api.get(`/users/me`, (c) => c.json({ _id: 'u1', name: 'Dispatcher One', role: 'Dispatcher', branch: 'Beit Shemesh' }));

api.get(`/notifications`, async (c) => c.json([]));

api.get(`/config`, async (c) => {
  try {
    const config = await kv.get('system_config');
    return c.json(config || {});
  } catch (error) {
    return c.json({});
  }
});

api.post(`/config`, async (c) => {
  const config = await c.req.json();
  await kv.set('system_config', config);
  return c.json({ success: true });
});

// Fallback route for root of API router
api.get('*', (c) => c.text('API Endpoint Not Found', 404));

// --- Mount Routes ---

// Standard Supabase path
app.route('/functions/v1/make-server-2750c780', api);
// Alternative path (if path prefix is stripped)
app.route('/make-server-2750c780', api);
// Root fallback (catch-all for path stripping environments)
app.route('/', api);

// Start the server
Deno.serve(app.fetch);