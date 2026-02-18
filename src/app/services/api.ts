import { projectId, publicAnonKey } from '../../../utils/supabase/info';

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-2750c780`;

// Types matching Backend
export interface BackendIncident {
  _id: string;
  caseNumber: string;
  status: 'open' | 'dispatched' | 'responding' | 'on scene' | 'transporting' | 'at hospital' | 'closed' | 'cancelled';
  priority: number;
  chiefComplaintText: string;
  addressFormatted: string;
  location?: { type: 'Point'; coordinates: number[] };
  callerName: string;
  callerPhone: string;
  timeCallReceived: string;
  unitsAssigned: string[];
  notes?: string;
}

export interface BackendResource {
  _id: string;
  name: string;
  type: 'BLS' | 'ALS' | 'RESPONSE' | 'COMMAND';
  callSign: string;
  status: string;
  location?: { type: 'Point'; coordinates: number[] };
  currentIncident?: string;
  crewMembers: string[];
}

export interface BackendChiefComplaint {
  _id: string;
  name: string;
  code: string;
  category: string;
  priority: number;
}

export interface BackendHospital {
  _id: string;
  name: string;
  shortName: string;
  suburb: string;
}

export interface BackendNote {
  _id: string;
  incidentId: string;
  text: string;
  type: string;
  createdAt: string;
  userName: string;
}

// Fetch Incidents
export async function getIncidents(): Promise<BackendIncident[]> {
  try {
    const res = await fetch(`${API_BASE}/incidents`, {
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
      },
    });
    if (!res.ok) throw new Error('Failed to fetch incidents');
    return await res.json();
  } catch (error) {
    console.error(error);
    return [];
  }
}

// Fetch Resources
export async function getResources(): Promise<BackendResource[]> {
  try {
    const res = await fetch(`${API_BASE}/resources`, {
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
      },
    });
    if (!res.ok) throw new Error('Failed to fetch resources');
    return await res.json();
  } catch (error) {
    console.error(error);
    return [];
  }
}

// Create Incident
export async function createIncident(data: any): Promise<BackendIncident | null> {
  try {
    const res = await fetch(`${API_BASE}/incidents`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create incident');
    return await res.json();
  } catch (error) {
    console.error(error);
    return null;
  }
}

// Dispatch Unit
export async function dispatchUnit(incidentId: string, unitId: string) {
  try {
    const res = await fetch(`${API_BASE}/dispatch`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ incidentId, unitId }),
    });
    return await res.json();
  } catch (error) {
    console.error(error);
    return { success: false };
  }
}

// Fetch Chief Complaints
export async function getChiefComplaints(): Promise<BackendChiefComplaint[]> {
  try {
    const res = await fetch(`${API_BASE}/lookups/chief-complaints`, {
      headers: { 'Authorization': `Bearer ${publicAnonKey}` },
    });
    return await res.json();
  } catch (error) { return []; }
}

// Fetch Hospitals
export async function getHospitals(): Promise<BackendHospital[]> {
  try {
    const res = await fetch(`${API_BASE}/lookups/hospitals`, {
      headers: { 'Authorization': `Bearer ${publicAnonKey}` },
    });
    return await res.json();
  } catch (error) { return []; }
}

// Fetch Notes
export async function getNotes(incidentId: string): Promise<BackendNote[]> {
  try {
    const res = await fetch(`${API_BASE}/incidents/${incidentId}/notes`, {
      headers: { 'Authorization': `Bearer ${publicAnonKey}` },
    });
    return await res.json();
  } catch (error) { return []; }
}

// Add Note
export async function addNote(incidentId: string, text: string, userName = 'Dispatcher') {
  try {
    const res = await fetch(`${API_BASE}/incidents/${incidentId}/notes`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text, userName }),
    });
    return await res.json();
  } catch (error) { return null; }
}
