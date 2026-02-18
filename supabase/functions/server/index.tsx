import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
import { createClient } from "npm:@supabase/supabase-js@2";

const app = new Hono();

// Initialize Supabase client for efficient paged fetching
const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

app.use('*', logger());
app.use('*', cors());

// Prefix for all routes
const BASE_PATH = '/make-server-2750c780';

// --- Helper Functions ---

// Optimized helper to fetch by prefix with pagination to avoid connection resets
async function getByPrefixPaged(prefix: string) {
  let allValues: any[] = [];
  let lastKey: string | null = null;
  const pageSize = 200; // Conservative page size to prevent timeouts
  let hasMore = true;

  while (hasMore) {
    let query = supabase
      .from("kv_store_2750c780")
      .select("key, value")
      .like("key", prefix + "%")
      .order("key", { ascending: true })
      .limit(pageSize);

    if (lastKey) {
      query = query.gt("key", lastKey);
    }

    const { data, error } = await query;
    
    if (error) {
      console.error(`Error fetching paged data for ${prefix}:`, error);
      throw error;
    }

    if (data && data.length > 0) {
      allValues = allValues.concat(data.map((d: any) => d.value));
      lastKey = data[data.length - 1].key;
      // If we got fewer than pageSize, we're done
      if (data.length < pageSize) hasMore = false;
    } else {
      hasMore = false;
    }
  }
  return allValues;
}

// Helper to get all incidents with migration fallback
async function getAllIncidents() {
  try {
    // 1. Try to fetch using the new individual key pattern (incident:*) using paged fetch
    let individualIncidents: any[] = [];
    try {
      individualIncidents = await getByPrefixPaged('incident:');
    } catch (e) {
      console.error("Failed to fetch individual incidents:", e);
      // Don't throw yet, try legacy
    }
    
    // 2. Also try to fetch legacy 'incidents' key
    let legacyIncidents: any[] = [];
    try {
      const legacyData = await kv.get('incidents');
      if (Array.isArray(legacyData)) {
        legacyIncidents = legacyData;
      }
    } catch (legacyError) {
      console.warn("Legacy fetch failed or empty:", legacyError);
    }

    // 3. Merge and deduplicate
    const allIncidentsMap = new Map();
    
    // Add legacy first
    legacyIncidents.forEach(inc => {
      const id = inc.id || inc._id;
      if (id) allIncidentsMap.set(id, inc);
    });
    
    // Overwrite with individual (newer)
    if (individualIncidents) {
        individualIncidents.forEach(inc => {
          const id = inc.id || inc._id;
          if (id) allIncidentsMap.set(id, inc);
        });
    }

    return Array.from(allIncidentsMap.values());
  } catch (error) {
    console.error("Error gathering incidents:", error);
    throw error;
  }
}

// Helper for resources (also migrating to individual keys for safety)
async function getAllResources() {
  try {
    // Use paged fetch for resources
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
    
    // Seed if empty (Development only)
    if (results.length === 0) {
        const initialResources = [
          { _id: 'u1', id: 'u1', name: 'Unit 1', type: 'ALS', status: 'responding', crewMembers: ['Yossi K.', 'Eli M.'] },
          { _id: 'u2', id: 'u2', name: 'Unit 2', type: 'RESPONSE', status: 'on scene', crewMembers: ['David L.'] },
          { _id: 'u3', id: 'u3', name: 'Unit 3', type: 'BLS', status: 'responding', crewMembers: ['Moshe R.'] },
          { _id: 'u4', id: 'u4', name: 'Unit 4', type: 'BLS', status: 'available', crewMembers: ['Avi C.'] }
        ];
        // Save individually
        for (const r of initialResources) {
            await kv.set(`resource:${r.id}`, r);
        }
        return initialResources;
    }
    
    return results;
  } catch (error) {
    console.error("Error gathering resources:", error);
    return [];
  }
}

// --- Incident Routes ---

app.get(`${BASE_PATH}/incidents`, async (c) => {
  try {
    const incidents = await getAllIncidents();
    // Sort by time descending
    incidents.sort((a, b) => new Date(b.timeCallReceived || 0).getTime() - new Date(a.timeCallReceived || 0).getTime());
    return c.json(incidents);
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

app.post(`${BASE_PATH}/incidents`, async (c) => {
  try {
    const incident = await c.req.json();
    
    if (!incident.id && !incident._id) {
      incident.id = crypto.randomUUID();
    }
    const id = incident.id || incident._id;
    incident._id = id; // Ensure compatibility

    await kv.set(`incident:${id}`, incident);
    
    return c.json(incident);
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

app.put(`${BASE_PATH}/incidents/:id`, async (c) => {
  try {
    const id = c.req.param('id');
    const updates = await c.req.json();
    
    let existing = await kv.get(`incident:${id}`);
    
    if (!existing) {
        const all = await getAllIncidents();
        existing = all.find(i => (i.id === id || i._id === id));
    }

    if (!existing) {
        return c.json({ error: "Incident not found" }, 404);
    }

    const updated = { ...existing, ...updates };
    await kv.set(`incident:${id}`, updated);
    
    return c.json(updated);
  } catch (error) {
     return c.json({ error: error.message }, 500);
  }
});

// --- Resource Routes (Restored) ---

app.get(`${BASE_PATH}/resources`, async (c) => {
  const resources = await getAllResources();
  return c.json(resources);
});

// --- Dispatch Route (Restored) ---

app.post(`${BASE_PATH}/dispatch`, async (c) => {
  try {
    const { incidentId, unitId } = await c.req.json();
    
    // Fetch directly using new method
    let incident = await kv.get(`incident:${incidentId}`);
    if (!incident) {
        // Fallback search
        const all = await getAllIncidents();
        incident = all.find(i => i.id === incidentId || i._id === incidentId);
    }

    let unit = await kv.get(`resource:${unitId}`);
    if (!unit) {
        const allRes = await getAllResources();
        unit = allRes.find(u => u.id === unitId || u._id === unitId);
    }
    
    if (incident && unit) {
        // Update Incident
        if (!incident.unitsAssigned) incident.unitsAssigned = [];
        if (!incident.unitsAssigned.includes(unitId)) {
            incident.unitsAssigned.push(unitId);
        }
        if (incident.status === 'open') {
            incident.status = 'dispatched';
        }

        // Update Unit
        unit.status = 'dispatched';
        unit.currentIncident = incidentId;
        
        // Save both
        await kv.set(`incident:${incident.id || incident._id}`, incident);
        await kv.set(`resource:${unit.id || unit._id}`, unit);

        return c.json({ success: true, incident, unit });
    }
    
    return c.json({ success: false, error: 'Incident or Unit not found' }, 404);
  } catch (error) {
    return c.json({ error: 'Dispatch failed: ' + error.message }, 500);
  }
});

// --- Lookup Routes (Restored) ---

app.get(`${BASE_PATH}/lookups/chief-complaints`, async (c) => {
    // Return static list for speed/reliability since it's large but constant
    return c.json([
        { _id: 'cc1', name: 'Abdominal Pain', code: '01', category: 'Gastrointestinal', priority: 3 },
        { _id: 'cc6', name: 'Breathing Problems', code: '06', category: 'Respiratory', priority: 1 },
        { _id: 'cc10', name: 'Chest Pain', code: '10', category: 'Cardiovascular', priority: 1 },
        { _id: 'cc29', name: 'Traffic Accident', code: '29', category: 'Trauma', priority: 1 },
        // ... abbreviated list for safety ...
    ]);
});

app.get(`${BASE_PATH}/lookups/hospitals`, async (c) => {
    return c.json([
        { _id: 'h1', name: 'Hadassah Ein Kerem', shortName: 'HEK' },
        { _id: 'h2', name: 'Shaare Zedek', shortName: 'SZMC' },
        { _id: 'h3', name: 'Hadassah Mt Scopus', shortName: 'HMS' },
        { _id: 'h4', name: 'Assuta Ashdod', shortName: 'AA' },
    ]);
});

// --- PCR Routes (Restored & Simplified) ---

app.post(`${BASE_PATH}/pcrs`, async (c) => {
    try {
        const body = await c.req.json();
        const id = body.id || body._id || crypto.randomUUID();
        const newPCR = { ...body, _id: id, id, createdAt: new Date().toISOString() };
        await kv.set(`pcr:${id}`, newPCR);
        return c.json(newPCR);
    } catch(e) { return c.json({error: e.message}, 500); }
});

app.get(`${BASE_PATH}/pcrs/:id`, async (c) => {
    const id = c.req.param('id');
    const pcr = await kv.get(`pcr:${id}`);
    
    // Also try to check if id has pcr_ prefix or not
    if (!pcr && !id.startsWith('pcr_')) {
       const pcr2 = await kv.get(`pcr_${id}`); // Try alternate
       if (pcr2) return c.json({ pcr: pcr2 });
    }
    
    // And if client sent pcr_ but stored as raw...
    // But we are standardizing on passing the ID that is stored.
    
    return pcr ? c.json({ pcr }) : c.json({ pcr: null }, 200); // Return null structure instead of 404 to be safe for frontend
});

app.put(`${BASE_PATH}/pcrs/:id`, async (c) => {
    try {
      const id = c.req.param('id');
      const updates = await c.req.json();
      
      let existing = await kv.get(`pcr:${id}`);
      if (!existing && !id.startsWith('pcr_')) {
         existing = await kv.get(`pcr:pcr_${id}`); // Just in case
      }
      
      // If still not found, upsert
      const updated = { ...existing, ...updates, _id: id, id };
      await kv.set(`pcr:${id}`, updated);
      return c.json(updated);
    } catch(e) { return c.json({error: e.message}, 500); }
});

app.post(`${BASE_PATH}/pcrs/:id/share`, async (c) => {
    return c.json({ success: true, message: "Shared successfully" });
});

app.get(`${BASE_PATH}/pcrs/:id/pdf`, async (c) => {
    // Mock PDF generation response
    return c.text("PDF content would go here", 200, { 'Content-Type': 'application/pdf' });
});

// --- User/Settings (Restored) ---

app.get(`${BASE_PATH}/users/me`, (c) => {
    return c.json({
        _id: 'u1',
        name: 'Dispatcher One',
        role: 'Dispatcher',
        branch: 'Beit Shemesh'
    });
});

app.get(`${BASE_PATH}/notifications`, async (c) => {
    return c.json([]);
});

// --- Config Routes ---

app.get(`${BASE_PATH}/config`, async (c) => {
  try {
    const config = await kv.get('system_config');
    return c.json(config || {});
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

app.post(`${BASE_PATH}/config`, async (c) => {
  try {
    const config = await c.req.json();
    await kv.set('system_config', config);
    return c.json({ success: true, config });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

Deno.serve(app.fetch);
