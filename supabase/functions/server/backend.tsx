import { Hono } from 'npm:hono';
import { cors } from 'npm:hono/cors';
import { logger } from 'npm:hono/logger';
import * as kv from './kv_store.tsx';

const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// --- Types based on GitHub Schema ---

interface Location {
  type: 'Point';
  coordinates: number[]; // [lng, lat]
}

export interface Incident {
  _id: string;
  caseNumber: string;
  status: 'open' | 'dispatched' | 'responding' | 'on scene' | 'transporting' | 'at hospital' | 'closed' | 'cancelled';
  priority: number;
  chiefComplaintText: string;
  addressFormatted: string;
  location?: Location;
  callerName: string;
  callerPhone: string;
  timeCallReceived: string; // ISO date
  unitsAssigned: string[]; // Array of Resource IDs (simplified from schema)
  notes?: string;
  callType: string;
}

export interface Resource {
  _id: string;
  name: string;
  type: 'BLS' | 'ALS' | 'RESPONSE' | 'COMMAND';
  callSign: string;
  status: 'available' | 'dispatched' | 'responding' | 'on scene' | 'transporting' | 'at hospital' | 'unavailable' | 'off duty';
  location?: Location;
  currentIncident?: string; // Incident ID
  crewMembers: string[]; // Names for display
}

export interface ChiefComplaint {
  _id: string;
  name: string;
  code: string;
  category: string;
  priority: number;
}

export interface Hospital {
  _id: string;
  name: string;
  shortName: string;
  suburb: string;
}

export interface Branch {
  _id: string;
  name: string;
  shortName: string;
}

export interface IncidentNote {
  _id: string;
  incidentId: string;
  text: string;
  type: 'dispatch' | 'clinical' | 'private' | 'system';
  createdAt: string;
  userName: string;
}

// --- Initial Data (Seeding) ---

const initialChiefComplaints: ChiefComplaint[] = [
  { _id: 'cc1', name: 'Cardiac Arrest', code: '09', category: 'Cardiovascular', priority: 1 },
  { _id: 'cc2', name: 'Chest Pain', code: '10', category: 'Cardiovascular', priority: 2 },
  { _id: 'cc3', name: 'Difficulty Breathing', code: '06', category: 'Respiratory', priority: 1 },
  { _id: 'cc4', name: 'Trauma / Injury', code: '30', category: 'Trauma', priority: 2 },
  { _id: 'cc5', name: 'Unconscious / Fainting', code: '31', category: 'Neurological', priority: 1 },
  { _id: 'cc6', name: 'Seizure', code: '12', category: 'Neurological', priority: 2 },
  { _id: 'cc7', name: 'Allergic Reaction', code: '02', category: 'Immune', priority: 2 },
  { _id: 'cc8', name: 'Abdominal Pain', code: '01', category: 'Gastrointestinal', priority: 3 },
  { _id: 'cc9', name: 'MVA', code: '29', category: 'Trauma', priority: 2 },
  { _id: 'cc10', name: 'Sick Person', code: '26', category: 'General', priority: 3 },
];

const initialHospitals: Hospital[] = [
  { _id: 'h1', name: 'Hadassah Ein Kerem', shortName: 'HEK', suburb: 'Jerusalem' },
  { _id: 'h2', name: 'Shaare Zedek', shortName: 'SZMC', suburb: 'Jerusalem' },
  { _id: 'h3', name: 'Hadassah Mt. Scopus', shortName: 'HMS', suburb: 'Jerusalem' },
  { _id: 'h4', name: 'Assuta Ashdod', shortName: 'Assuta', suburb: 'Ashdod' },
  { _id: 'h5', name: 'Kaplan', shortName: 'Kaplan', suburb: 'Rehovot' },
];

const initialBranches: Branch[] = [
  { _id: 'b1', name: 'Beit Shemesh', shortName: 'RBS' },
  { _id: 'b2', name: 'Jerusalem', shortName: 'JLM' },
];

const initialIncidents: Incident[] = [
  {
    _id: '1',
    caseNumber: '2023-1001',
    status: 'responding',
    priority: 1,
    chiefComplaintText: 'Cardiac Arrest',
    addressFormatted: 'Nahar Hayarden 45, RBS Alef',
    location: { type: 'Point', coordinates: [34.98, 31.75] },
    callerName: 'Moshe Cohen',
    callerPhone: '054-123-4567',
    timeCallReceived: new Date().toISOString(),
    unitsAssigned: ['u1', 'u3'],
    callType: 'emergency'
  },
  {
    _id: '2',
    caseNumber: '2023-1002',
    status: 'on scene',
    priority: 1,
    chiefComplaintText: 'Severe Trauma',
    addressFormatted: 'Sorek 12, RBS Gimmel',
    location: { type: 'Point', coordinates: [34.99, 31.74] },
    callerName: 'Sarah Levy',
    callerPhone: '052-987-6543',
    timeCallReceived: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    unitsAssigned: ['u2'],
    callType: 'emergency'
  },
  {
    _id: '3',
    caseNumber: '2023-1003',
    status: 'open',
    priority: 2,
    chiefComplaintText: 'Difficulty Breathing',
    addressFormatted: 'Dolev 8, RBS Bet',
    location: { type: 'Point', coordinates: [34.97, 31.76] },
    callerName: 'David Goldstein',
    callerPhone: '053-456-7890',
    timeCallReceived: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
    unitsAssigned: [],
    callType: 'emergency'
  }
];

const initialResources: Resource[] = [
  {
    _id: 'u1',
    name: 'Unit 1',
    type: 'ALS',
    callSign: 'AMB-01',
    status: 'responding',
    location: { type: 'Point', coordinates: [34.981, 31.751] },
    currentIncident: '1',
    crewMembers: ['Yossi K.', 'Eli M.']
  },
  {
    _id: 'u2',
    name: 'Unit 2',
    type: 'RESPONSE',
    callSign: 'MOTO-02',
    status: 'on scene',
    location: { type: 'Point', coordinates: [34.991, 31.741] },
    currentIncident: '2',
    crewMembers: ['David L.']
  },
  {
    _id: 'u3',
    name: 'Unit 3',
    type: 'BLS',
    callSign: 'AMB-03',
    status: 'responding',
    location: { type: 'Point', coordinates: [34.982, 31.752] },
    currentIncident: '1',
    crewMembers: ['Moshe R.']
  },
  {
    _id: 'u4',
    name: 'Unit 4',
    type: 'BLS',
    callSign: 'AMB-04',
    status: 'available',
    location: { type: 'Point', coordinates: [35.0, 31.7] },
    crewMembers: ['Avi C.', 'Shlomo G.']
  }
];

// --- Helper Functions ---

async function getIncidents(): Promise<Incident[]> {
  try {
    const data = await kv.get('incidents');
    if (!data) {
      await kv.set('incidents', initialIncidents);
      return initialIncidents;
    }
    return data as Incident[];
  } catch (error) {
    console.error("Failed to get incidents:", error);
    return [];
  }
}

async function getResources(): Promise<Resource[]> {
  try {
    const data = await kv.get('resources');
    if (!data) {
      await kv.set('resources', initialResources);
      return initialResources;
    }
    return data as Resource[];
  } catch (error) {
    console.error("Failed to get resources:", error);
    return [];
  }
}

async function getChiefComplaints(): Promise<ChiefComplaint[]> {
  try {
    const data = await kv.get('chiefComplaints');
    if (!data) {
      await kv.set('chiefComplaints', initialChiefComplaints);
      return initialChiefComplaints;
    }
    return data as ChiefComplaint[];
  } catch (error) {
    return [];
  }
}

async function getHospitals(): Promise<Hospital[]> {
  try {
    const data = await kv.get('hospitals');
    if (!data) {
      await kv.set('hospitals', initialHospitals);
      return initialHospitals;
    }
    return data as Hospital[];
  } catch (error) {
    return [];
  }
}

async function getIncidentNotes(incidentId: string): Promise<IncidentNote[]> {
  try {
    const key = `notes:${incidentId}`;
    const data = await kv.get(key);
    return (data || []) as IncidentNote[];
  } catch (error) {
    return [];
  }
}

// --- API Routes ---

app.get('/incidents', async (c) => {
  const incidents = await getIncidents();
  return c.json(incidents);
});

app.post('/incidents', async (c) => {
  try {
    const body = await c.req.json();
    const incidents = await getIncidents();
    
    // Create new incident based on schema structure (simplified)
    const newIncident: Incident = {
      _id: Math.random().toString(36).substr(2, 9),
      caseNumber: `2023-${1000 + incidents.length + 1}`,
      status: 'open',
      priority: body.priority || 2, // From frontend
      chiefComplaintText: body.type || 'Unknown', // Mapped from frontend 'type'
      addressFormatted: body.address || 'Unknown Address',
      callerName: body.caller || 'Anonymous',
      callerPhone: body.phone || '',
      timeCallReceived: new Date().toISOString(),
      unitsAssigned: [],
      callType: 'emergency',
      location: { type: 'Point', coordinates: [34.99, 31.75] }, // Mock location default
      notes: body.notes
    };
    
    // Add to top of list
    const updatedIncidents = [newIncident, ...incidents];
    await kv.set('incidents', updatedIncidents);
    
    return c.json(newIncident);
  } catch (error) {
    return c.json({ error: 'Failed to create incident' }, 500);
  }
});

app.get('/resources', async (c) => {
  const resources = await getResources();
  return c.json(resources);
});

app.post('/dispatch', async (c) => {
  try {
    const { incidentId, unitId } = await c.req.json();
    
    const incidents = await getIncidents();
    const resources = await getResources();
    
    const incidentIndex = incidents.findIndex(i => i._id === incidentId);
    const unitIndex = resources.findIndex(u => u._id === unitId);
    
    if (incidentIndex !== -1 && unitIndex !== -1) {
      // Update Incident
      const incident = incidents[incidentIndex];
      if (!incident.unitsAssigned.includes(unitId)) {
        incident.unitsAssigned.push(unitId);
      }
      if (incident.status === 'open') {
        incident.status = 'dispatched';
      }
      
      // Update Unit
      const unit = resources[unitIndex];
      unit.status = 'dispatched';
      unit.currentIncident = incidentId;
      
      // Save back to KV
      incidents[incidentIndex] = incident;
      resources[unitIndex] = unit;
      
      await kv.set('incidents', incidents);
      await kv.set('resources', resources);
      
      return c.json({ success: true, incident, unit });
    }
    
    return c.json({ success: false, error: 'Incident or Unit not found' }, 404);
  } catch (error) {
    return c.json({ error: 'Dispatch failed' }, 500);
  }
});

// Lookups Routes
app.get('/lookups/chief-complaints', async (c) => {
  const data = await getChiefComplaints();
  return c.json(data);
});

app.get('/lookups/hospitals', async (c) => {
  const data = await getHospitals();
  return c.json(data);
});

// Incident Notes Routes
app.get('/incidents/:id/notes', async (c) => {
  const { id } = c.req.param();
  const notes = await getIncidentNotes(id);
  return c.json(notes);
});

app.post('/incidents/:id/notes', async (c) => {
  const { id } = c.req.param();
  const body = await c.req.json();
  const key = `notes:${id}`;
  
  const notes = await getIncidentNotes(id);
  const newNote: IncidentNote = {
    _id: Math.random().toString(36).substr(2, 9),
    incidentId: id,
    text: body.text,
    type: body.type || 'dispatch',
    createdAt: new Date().toISOString(),
    userName: body.userName || 'System'
  };
  
  notes.push(newNote);
  await kv.set(key, notes);
  return c.json(newNote);
});

// Generic Handler for other collections
const collections = [
  'users', 'shifts', 'rosters', 'drugs', 'treatments', 'kpis', 
  'patient-warnings', 'skills', 'connecteam-events'
];

collections.forEach(collection => {
  app.get(`/${collection}`, async (c) => {
    try {
      const data = await kv.get(collection);
      return c.json(data || []);
    } catch (e) {
      return c.json([]);
    }
  });

  app.post(`/${collection}`, async (c) => {
    try {
      const body = await c.req.json();
      const data = (await kv.get(collection) || []) as any[];
      const newItem = { ...body, _id: Math.random().toString(36).substr(2, 9) };
      data.push(newItem);
      await kv.set(collection, data);
      return c.json(newItem);
    } catch (e) {
      return c.json({ error: 'Failed' }, 500);
    }
  });
});

export default app;
