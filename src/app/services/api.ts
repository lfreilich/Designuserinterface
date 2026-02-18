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
  
  // Extended Fields for Screenshot Match
  callTaker?: string;
  backupCallTaker?: string;
  secondCallerPhone?: string;
  
  // Detailed Address
  addressCity?: string;
  addressStreet?: string;
  addressEntrance?: string;
  addressFloor?: string;
  addressApt?: string;
  addressType?: 'home' | 'business' | 'public' | 'other';
  
  // Patient Info
  patientAge?: number;
  patientAgeUnit?: 'years' | 'months' | 'days';
  patientGender?: 'male' | 'female' | 'other';
  description?: string;
  
  // Risk Flags
  isSafetyRisk?: boolean;
  isInfectionRisk?: boolean;
  
  // Timestamps
  timeDispatched?: string;
  timeArrived?: string;
  timeCleared?: string;
}

export interface BackendResource {
  _id: string;
  name: string;
  type: 'BLS' | 'ALS' | 'RESPONSE' | 'COMMAND';
  callSign: string;
  status: string; // 'available' | 'dispatched' | 'enroute' | 'arrived' | 'cleared' | 'offline'
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

export interface BackendNotification {
  _id: string;
  title: string;
  message: string;
  type: 'alert' | 'info' | 'success';
  createdAt: string;
}

export interface BackendSettings {
  darkMode: boolean;
  sound: boolean;
  notifications: boolean;
}

export interface BackendUser {
  _id: string;
  name: string;
  email: string;
  role: string;
  branch: string;
  avatar?: string;
}

// Notifications
export async function getNotifications(): Promise<BackendNotification[]> {
  try {
    const res = await fetch(`${API_BASE}/notifications`, {
      headers: { 'Authorization': `Bearer ${publicAnonKey}` },
    });
    return await res.json();
  } catch (error) { return []; }
}

export async function createNotification(title: string, message: string, type: 'alert' | 'info' | 'success'): Promise<BackendNotification | null> {
  try {
    const res = await fetch(`${API_BASE}/notifications`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title, message, type }),
    });
    return await res.json();
  } catch (error) { return null; }
}

// Settings
export async function getSettings(): Promise<BackendSettings | null> {
  try {
    const res = await fetch(`${API_BASE}/settings`, {
      headers: { 'Authorization': `Bearer ${publicAnonKey}` },
    });
    return await res.json();
  } catch (error) { return null; }
}

export async function updateSettings(settings: BackendSettings): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(settings),
    });
    return res.ok;
  } catch (error) { return false; }
}

// User Profile
export async function getUserProfile(): Promise<BackendUser | null> {
  try {
    const res = await fetch(`${API_BASE}/users/me`, {
      headers: { 'Authorization': `Bearer ${publicAnonKey}` },
    });
    return await res.json();
  } catch (error) { return null; }
}

export async function getUsers(): Promise<BackendUser[]> {
  try {
    const res = await fetch(`${API_BASE}/users`, {
      headers: { 'Authorization': `Bearer ${publicAnonKey}` },
    });
    return await res.json();
  } catch (error) { return []; }
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

// PCR Functions

export interface BackendPCR {
  _id: string;
  incidentId: string;
  status: 'active' | 'submitted';
  
  // Patient
  patientFirstName?: string;
  patientLastName?: string;
  patientId?: string;
  patientAge?: string;
  patientGender?: string;
  patientAddress?: string;
  
  // Clinical
  chiefComplaintText?: string;
  secondaryComplaint?: string;
  history?: string; // SAMPLE
  allergies?: string;
  currentMedications?: string;
  pastMedicalHistory?: string;
  
  // Assessment
  consciousness?: 'Alert' | 'Verbal' | 'Pain' | 'Unresponsive';
  vitals?: {
    time: string;
    bpSystolic?: number;
    bpDiastolic?: number;
    pulse?: number;
    resp?: number;
    spo2?: number;
    glucose?: number;
    gcs?: number;
  }[];
  
  clinicalImpression?: string;
  triageCategory?: 'Green' | 'Yellow' | 'Red' | 'Black';
  
  // Treatment
  treatments?: string[];
  narrative?: string;
  
  // Outcome
  outcome?: string;
  transportDestination?: string;
  
  // Meta
  submittedAt?: string;
  submittedBy?: string;
  createdAt: string;
}

export async function createPCR(incidentId: string, patientData: any = {}): Promise<BackendPCR | null> {
  try {
    const res = await fetch(`${API_BASE}/pcrs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ incidentId, ...patientData }),
    });
    return await res.json();
  } catch (error) {
    console.error(error);
    return null;
  }
}

export async function getPCR(pcrId: string): Promise<BackendPCR | null> {
  try {
    const res = await fetch(`${API_BASE}/pcrs/${pcrId}`, {
      headers: { 'Authorization': `Bearer ${publicAnonKey}` },
    });
    const data = await res.json();
    return data.pcr || null;
  } catch (error) {
    return null;
  }
}

export async function updatePCR(pcrId: string, data: any): Promise<BackendPCR | null> {
  try {
    const res = await fetch(`${API_BASE}/pcrs/${pcrId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return await res.json();
  } catch (error) {
    return null;
  }
}

export async function sharePCR(pcrId: string, email: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/pcrs/${pcrId}/share`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    return data.success;
  } catch (error) {
    return false;
  }
}

export function getPCRPdfUrl(pcrId: string): string {
  return `${API_BASE}/pcrs/${pcrId}/pdf`;
}
