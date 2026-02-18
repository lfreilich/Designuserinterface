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
  unitsAssigned: string[]; // Array of Resource IDs
  notes?: string;
  callType: string;
  pcrId?: string; // Link to PCR
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

// PCR Types
export interface IncidentPCR {
  _id: string;
  incidentId: string;
  status: 'active' | 'submitted';
  patientFirstName?: string;
  patientLastName?: string;
  patientAge?: string;
  patientGender?: string;
  chiefComplaintText?: string;
  history?: string;
  allergies?: string;
  medications?: string;
  clinicalImpression?: string;
  triageCategory?: string;
  outcome?: string;
  transportDestination?: string;
  submittedAt?: string;
  submittedBy?: string;
  createdAt: string;
}

export interface PCRObservation {
  _id: string;
  pcrId: string;
  timestamp: string;
  heartRate?: number;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  respiratoryRate?: number;
  spo2?: number;
  gcsTotal?: number;
  notes?: string;
}

export interface PCRTreatment {
  _id: string;
  pcrId: string;
  treatmentName: string;
  dose?: string;
  route?: string;
  timestamp: string;
  outcome?: string;
}

// --- Initial Data (Seeding) ---

const initialChiefComplaints: ChiefComplaint[] = [
  { _id: 'cc1', name: 'Abdominal Pain', code: '01', category: 'Gastrointestinal', priority: 3 },
  { _id: 'cc2', name: 'Allergies / Envenomations', code: '02', category: 'Immune', priority: 2 },
  { _id: 'cc3', name: 'Animal Bites / Attacks', code: '03', category: 'Trauma', priority: 3 },
  { _id: 'cc4', name: 'Assault / Sexual Assault', code: '04', category: 'Trauma', priority: 2 },
  { _id: 'cc5', name: 'Back Pain (Non-Traumatic)', code: '05', category: 'General', priority: 3 },
  { _id: 'cc6', name: 'Breathing Problems', code: '06', category: 'Respiratory', priority: 1 },
  { _id: 'cc7', name: 'Burns / Explosion', code: '07', category: 'Trauma', priority: 2 },
  { _id: 'cc8', name: 'Carbon Monoxide / Hazmat', code: '08', category: 'Environmental', priority: 1 },
  { _id: 'cc9', name: 'Cardiac Arrest / Death', code: '09', category: 'Cardiovascular', priority: 1 },
  { _id: 'cc10', name: 'Chest Pain (Non-Traumatic)', code: '10', category: 'Cardiovascular', priority: 1 },
  { _id: 'cc11', name: 'Choking', code: '11', category: 'Respiratory', priority: 1 },
  { _id: 'cc12', name: 'Convulsions / Seizures', code: '12', category: 'Neurological', priority: 1 },
  { _id: 'cc13', name: 'Diabetic Problems', code: '13', category: 'Endocrine', priority: 2 },
  { _id: 'cc14', name: 'Drowning / Diving', code: '14', category: 'Environmental', priority: 1 },
  { _id: 'cc15', name: 'Electrocution / Lightning', code: '15', category: 'Trauma', priority: 1 },
  { _id: 'cc16', name: 'Eye Problems / Injuries', code: '16', category: 'Trauma', priority: 3 },
  { _id: 'cc17', name: 'Falls', code: '17', category: 'Trauma', priority: 2 },
  { _id: 'cc18', name: 'Headache', code: '18', category: 'Neurological', priority: 3 },
  { _id: 'cc19', name: 'Heart Problems / A.I.C.D.', code: '19', category: 'Cardiovascular', priority: 2 },
  { _id: 'cc20', name: 'Heat / Cold Exposure', code: '20', category: 'Environmental', priority: 2 },
  { _id: 'cc21', name: 'Hemorrhage / Lacerations', code: '21', category: 'Trauma', priority: 2 },
  { _id: 'cc22', name: 'Inaccessible Incident', code: '22', category: 'General', priority: 3 },
  { _id: 'cc23', name: 'Overdose / Poisoning', code: '23', category: 'Toxicology', priority: 1 },
  { _id: 'cc24', name: 'Pregnancy / Childbirth', code: '24', category: 'Obstetric', priority: 1 },
  { _id: 'cc25', name: 'Psychiatric / Suicide Attempt', code: '25', category: 'Psychiatric', priority: 2 },
  { _id: 'cc26', name: 'Sick Person', code: '26', category: 'General', priority: 3 },
  { _id: 'cc27', name: 'Stab / Gunshot / Penetrating', code: '27', category: 'Trauma', priority: 1 },
  { _id: 'cc28', name: 'Stroke (CVA)', code: '28', category: 'Neurological', priority: 1 },
  { _id: 'cc29', name: 'Traffic / Transportation (MVA)', code: '29', category: 'Trauma', priority: 1 },
  { _id: 'cc30', name: 'Traumatic Injuries', code: '30', category: 'Trauma', priority: 2 },
  { _id: 'cc31', name: 'Unconscious / Fainting', code: '31', category: 'Neurological', priority: 1 },
  { _id: 'cc32', name: 'Unknown Problem (Man Down)', code: '32', category: 'General', priority: 2 },
  { _id: 'cc33', name: 'Interfacility Transfer', code: '33', category: 'General', priority: 3 },
  { _id: 'cc34', name: 'Standby / Event', code: '34', category: 'General', priority: 3 },
  { _id: 'cc35', name: 'Test / Training', code: '35', category: 'Admin', priority: 9 },
  { _id: 'cc36', name: 'Well Person Check', code: '36', category: 'General', priority: 3 },
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

async function getPCR(pcrId: string): Promise<IncidentPCR | null> {
  const data = await kv.get(`pcr:${pcrId}`);
  return data as IncidentPCR | null;
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
      
      // Log notification (Simulation of incidentNotifier.js)
      console.log(`Notification: Unit ${unit.callSign} dispatched to ${incident.caseNumber}`);
      
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

// PCR Routes
app.post('/pcrs', async (c) => {
  try {
    const body = await c.req.json();
    const newPCR: IncidentPCR = {
      _id: Math.random().toString(36).substr(2, 9),
      incidentId: body.incidentId,
      status: 'active',
      patientFirstName: body.patientFirstName,
      patientLastName: body.patientLastName,
      createdAt: new Date().toISOString()
    };
    
    await kv.set(`pcr:${newPCR._id}`, newPCR);
    
    // Link to incident
    const incidents = await getIncidents();
    const incidentIndex = incidents.findIndex(i => i._id === body.incidentId);
    if (incidentIndex !== -1) {
      incidents[incidentIndex].pcrId = newPCR._id;
      await kv.set('incidents', incidents);
    }
    
    return c.json(newPCR);
  } catch (e) {
    return c.json({ error: 'Failed to create PCR' }, 500);
  }
});

app.get('/pcrs/:id', async (c) => {
  const { id } = c.req.param();
  const pcr = await getPCR(id);
  if (!pcr) return c.json({ error: 'PCR not found' }, 404);
  
  // Get linked data (mocked mostly for this demo as we don't have full relational DB)
  const observations = (await kv.get(`pcr:${id}:obs`)) || [];
  const treatments = (await kv.get(`pcr:${id}:tx`)) || [];
  
  return c.json({ pcr, observations, treatments });
});

app.put('/pcrs/:id', async (c) => {
  const { id } = c.req.param();
  const body = await c.req.json();
  const pcr = await getPCR(id);
  if (!pcr) return c.json({ error: 'PCR not found' }, 404);
  
  const updatedPCR = { ...pcr, ...body };
  await kv.set(`pcr:${id}`, updatedPCR);
  return c.json(updatedPCR);
});

// Generate PDF Report (HTML representation)
app.get('/pcrs/:id/pdf', async (c) => {
  const { id } = c.req.param();
  const pcr = await getPCR(id);
  if (!pcr) return c.text('PCR Not Found', 404);
  
  // Generate HTML Report
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>PCR Report - ${pcr._id}</title>
      <style>
        body { font-family: sans-serif; padding: 40px; }
        h1 { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; }
        .section { margin-bottom: 20px; border: 1px solid #ddd; padding: 15px; border-radius: 4px; }
        .section h2 { margin-top: 0; font-size: 16px; background: #f0f0f0; padding: 5px; }
        .row { display: flex; margin-bottom: 5px; }
        .label { font-weight: bold; width: 150px; }
      </style>
    </head>
    <body>
      <h1>Patient Care Report</h1>
      <div class="section">
        <h2>Incident Details</h2>
        <div class="row"><span class="label">ID:</span> ${pcr.incidentId}</div>
        <div class="row"><span class="label">Created:</span> ${new Date(pcr.createdAt).toLocaleString()}</div>
      </div>
      <div class="section">
        <h2>Patient Information</h2>
        <div class="row"><span class="label">Name:</span> ${pcr.patientFirstName || ''} ${pcr.patientLastName || ''}</div>
        <div class="row"><span class="label">Age/Gender:</span> ${pcr.patientAge || '-'} / ${pcr.patientGender || '-'}</div>
      </div>
      <div class="section">
        <h2>Clinical</h2>
        <div class="row"><span class="label">Chief Complaint:</span> ${pcr.chiefComplaintText || '-'}</div>
        <div class="row"><span class="label">History:</span> ${pcr.history || '-'}</div>
        <div class="row"><span class="label">Allergies:</span> ${pcr.allergies || '-'}</div>
        <div class="row"><span class="label">Medications:</span> ${pcr.medications || '-'}</div>
      </div>
      <div class="section">
        <h2>Outcome</h2>
        <div class="row"><span class="label">Disposition:</span> ${pcr.outcome || '-'}</div>
        <div class="row"><span class="label">Destination:</span> ${pcr.transportDestination || '-'}</div>
      </div>
    </body>
    </html>
  `;
  
  return c.html(html);
});

// Share PCR (Email simulation)
app.post('/pcrs/:id/share', async (c) => {
  const { id } = c.req.param();
  const { email } = await c.req.json();
  
  const pcr = await getPCR(id);
  if (!pcr) return c.json({ error: 'PCR not found' }, 404);
  
  // Log the email "sending"
  console.log(`[Email Service] Sending PCR Report ${id} to hospital email: ${email}`);
  
  return c.json({ success: true, message: 'Report queued for delivery' });
});

// Settings Routes
app.get('/settings', async (c) => {
  const settings = await kv.get('settings') || {
    darkMode: false,
    sound: true,
    notifications: true
  };
  return c.json(settings);
});

app.post('/settings', async (c) => {
  try {
    const body = await c.req.json();
    await kv.set('settings', body);
    return c.json(body);
  } catch (e) {
    return c.json({ error: 'Failed' }, 500);
  }
});

// Notifications Routes
app.get('/notifications', async (c) => {
  const notifications = await kv.get('notifications') || [];
  // Sort by date descending
  return c.json(notifications.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
});

app.post('/notifications', async (c) => {
  try {
    const body = await c.req.json();
    const notifications = (await kv.get('notifications') || []) as any[];
    const newNotification = {
      _id: Math.random().toString(36).substr(2, 9),
      ...body,
      createdAt: new Date().toISOString()
    };
    notifications.push(newNotification);
    await kv.set('notifications', notifications);
    return c.json(newNotification);
  } catch (e) {
    return c.json({ error: 'Failed' }, 500);
  }
});

// User Routes
app.get('/users/me', async (c) => {
  // Mock current user for now as we don't have full auth context in this demo environment
  return c.json({
    _id: 'u1',
    name: 'Dispatcher One',
    email: 'dispatch1@hatzala.org.il',
    role: 'Dispatcher',
    branch: 'Beit Shemesh',
    avatar: ''
  });
});

// Generic Handler for other collections
const collections = [
  'users', 'shifts', 'rosters', 'drugs', 'treatments', 'kpis', 
  'patient-warnings', 'skills', 'connecteam-events'
];

const initialUsers = [
  { _id: 'u1', name: 'Dispatcher One', email: 'dispatch1@hatzala.org.il', role: 'Dispatcher', branch: 'Beit Shemesh' },
  { _id: 'u2', name: 'Responder Two', email: 'responder2@hatzala.org.il', role: 'Responder', branch: 'Beit Shemesh' },
  { _id: 'u3', name: 'Admin Three', email: 'admin3@hatzala.org.il', role: 'Admin', branch: 'Jerusalem' },
];

collections.forEach(collection => {
  app.get(`/${collection}`, async (c) => {
    try {
      let data = await kv.get(collection);
      
      // Auto-seed users if empty
      if (collection === 'users' && (!data || (Array.isArray(data) && data.length === 0))) {
         data = initialUsers;
         await kv.set('users', data);
      }

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
