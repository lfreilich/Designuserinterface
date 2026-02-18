import { projectId, publicAnonKey } from '/utils/supabase/info';

const BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-2750c780`;

export interface BackendIncident {
  _id: string;
  caseNumber: string;
  status: 'open' | 'dispatched' | 'responding' | 'on scene' | 'transporting' | 'at hospital' | 'closed' | 'cancelled';
  priority: number;
  chiefComplaintText: string;
  addressFormatted: string;
  callerName: string;
  callerPhone: string;
  timeCallReceived: string;
  unitsAssigned: string[];
  callType: string;
  pcrId?: string;
  [key: string]: any;
}

export interface Resource {
  _id: string;
  name: string;
  type: 'BLS' | 'ALS' | 'RESPONSE' | 'COMMAND';
  callSign: string;
  status: 'available' | 'dispatched' | 'responding' | 'on scene' | 'transporting' | 'at hospital' | 'unavailable' | 'off duty';
  location?: { type: 'Point', coordinates: number[] };
  currentIncident?: string;
  crewMembers: string[];
}

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

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${publicAnonKey}`
};

export async function getIncidents(): Promise<BackendIncident[]> {
  const res = await fetch(`${BASE_URL}/incidents`, { headers });
  if (!res.ok) throw new Error('Failed to fetch incidents');
  return res.json();
}

export async function createIncident(data: any): Promise<BackendIncident> {
  const res = await fetch(`${BASE_URL}/incidents`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to create incident');
  return res.json();
}

export async function updateIncident(id: string, data: any): Promise<BackendIncident> {
  const res = await fetch(`${BASE_URL}/incidents/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to update incident');
  return res.json();
}

export async function getResources(): Promise<Resource[]> {
  const res = await fetch(`${BASE_URL}/resources`, { headers });
  if (!res.ok) throw new Error('Failed to fetch resources');
  return res.json();
}

export async function dispatch(incidentId: string, unitId: string) {
  const res = await fetch(`${BASE_URL}/dispatch`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ incidentId, unitId })
  });
  if (!res.ok) throw new Error('Failed to dispatch unit');
  return res.json();
}

export async function createPCR(data: any): Promise<IncidentPCR> {
  const res = await fetch(`${BASE_URL}/pcrs`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to create PCR');
  return res.json();
}

export async function getPCR(id: string): Promise<{ pcr: IncidentPCR | null, observations: any[], treatments: any[] }> {
  try {
    const res = await fetch(`${BASE_URL}/pcrs/${id}`, { headers });
    if (!res.ok) return { pcr: null, observations: [], treatments: [] }; 
    const data = await res.json();
    return data || { pcr: null, observations: [], treatments: [] };
  } catch (error) {
    console.error("Error fetching PCR:", error);
    return { pcr: null, observations: [], treatments: [] };
  }
}

export async function updatePCR(id: string, data: any): Promise<IncidentPCR> {
  const res = await fetch(`${BASE_URL}/pcrs/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to update PCR');
  return res.json();
}

export async function sharePCR(id: string, email: string) {
  const res = await fetch(`${BASE_URL}/pcrs/${id}/share`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ email })
  });
  if (!res.ok) throw new Error('Failed to share PCR');
  return res.json();
}
