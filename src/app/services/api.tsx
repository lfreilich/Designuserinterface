import { projectId, publicAnonKey } from '/utils/supabase/info';
import { toast } from 'sonner';

const BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-2750c780`;

export interface BackendIncident {
  _id: string;
  id?: string;
  caseNumber?: string;
  status: 'open' | 'dispatched' | 'responding' | 'on scene' | 'transporting' | 'at hospital' | 'closed' | 'cancelled';
  priority: number;
  chiefComplaintText: string;
  addressFormatted: string;
  callerName: string;
  callerPhone: string;
  timeCallReceived: string;
  unitsAssigned: string[];
  callType?: string;
  location?: { coordinates: number[] };
  pcrId?: string;
  [key: string]: any;
}

export interface Resource {
  _id: string;
  id?: string;
  name: string;
  type: 'BLS' | 'ALS' | 'RESPONSE' | 'COMMAND';
  callSign?: string;
  status: 'available' | 'dispatched' | 'responding' | 'on scene' | 'transporting' | 'at hospital' | 'unavailable' | 'off duty';
  location?: { type: 'Point', coordinates: number[] };
  currentIncident?: string;
  crewMembers: string[];
}

export interface BackendUser {
  _id: string;
  name: string;
  role: string;
  branch?: string;
  email?: string;
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

export interface BackendConfig {
  general: {
    centerName: string;
    defaultLanguage: string;
    theme: string;
    refreshRate: number;
  };
  apiKeys: {
    openai: string;
    googleMaps: string;
    resend: string;
  };
  dispatch: {
    autoDispatch: boolean;
    priorityThreshold: string;
    maxUnitsPerCall: number;
  };
  walkieFleet: {
    serverUrl: string;
    username: string;
    password?: string;
    enabled: boolean;
  };
  freePBX: {
    serverUrl: string;
    extension: string;
    secret?: string;
    enabled: boolean;
  };
  imap: {
    host: string;
    port: number;
    user: string;
    password?: string;
    tls: boolean;
    enabled: boolean;
  };
}

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${publicAnonKey}`
};

// Generic fetch wrapper with error handling
async function fetchWithRetry(url: string, options: RequestInit = {}, retries = 2) {
  try {
    const res = await fetch(url, options);
    if (!res.ok) {
       // Try to parse error message
       let errMsg = res.statusText;
       try {
          const json = await res.json();
          if (json.error) errMsg = json.error;
          else if (json.message) errMsg = json.message;
       } catch {}
       throw new Error(`Request failed (${res.status}): ${errMsg}`);
    }
    return res.json();
  } catch (err) {
    if (retries > 0) {
      console.warn(`Retrying fetch to ${url}... (${retries} left)`);
      await new Promise(r => setTimeout(r, 1000));
      return fetchWithRetry(url, options, retries - 1);
    }
    throw err;
  }
}

export async function getIncidents(): Promise<BackendIncident[]> {
  try {
    return await fetchWithRetry(`${BASE_URL}/incidents`, { headers });
  } catch (error) {
    console.error("getIncidents failed", error);
    // Return empty array to prevent app crash, but log error
    toast.error("Failed to load incidents. Check network connection.");
    return [];
  }
}

export async function createIncident(data: any): Promise<BackendIncident> {
  return await fetchWithRetry(`${BASE_URL}/incidents`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data)
  });
}

export async function updateIncident(id: string, data: any): Promise<BackendIncident> {
  return await fetchWithRetry(`${BASE_URL}/incidents/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(data)
  });
}

export async function getResources(): Promise<Resource[]> {
  try {
    return await fetchWithRetry(`${BASE_URL}/resources`, { headers });
  } catch (error) {
     console.error("getResources failed", error);
     return [];
  }
}

export async function getUsers(): Promise<BackendUser[]> {
  try {
    return await fetchWithRetry(`${BASE_URL}/users`, { headers });
  } catch (error) {
     console.error("getUsers failed", error);
     return [];
  }
}

export async function dispatchUnit(incidentId: string, unitId: string) {
  return await fetchWithRetry(`${BASE_URL}/dispatch`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ incidentId, unitId })
  });
}

export async function createPCR(data: any): Promise<IncidentPCR> {
  return await fetchWithRetry(`${BASE_URL}/pcrs`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data)
  });
}

export async function getPCR(id: string): Promise<{ pcr: IncidentPCR | null, observations: any[], treatments: any[] }> {
  try {
    const data = await fetchWithRetry(`${BASE_URL}/pcrs/${id}`, { headers });
    return data || { pcr: null, observations: [], treatments: [] };
  } catch (error) {
    console.error("Error fetching PCR:", error);
    return { pcr: null, observations: [], treatments: [] };
  }
}

export async function updatePCR(id: string, data: any): Promise<IncidentPCR> {
  return await fetchWithRetry(`${BASE_URL}/pcrs/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(data)
  });
}

export async function sharePCR(id: string, email: string) {
  return await fetchWithRetry(`${BASE_URL}/pcrs/${id}/share`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ email })
  });
}

export async function getConfig(): Promise<BackendConfig> {
  try {
    const config = await fetchWithRetry(`${BASE_URL}/config`, { headers });
    // Ensure nested objects exist to prevent crashes
    return {
      general: config.general || {},
      apiKeys: config.apiKeys || {},
      dispatch: config.dispatch || {},
      walkieFleet: config.walkieFleet || {},
      freePBX: config.freePBX || {},
      imap: config.imap || {}
    } as BackendConfig;
  } catch (error) {
    console.error("getConfig failed", error);
    return {} as BackendConfig;
  }
}

export async function saveConfig(config: BackendConfig) {
  return await fetchWithRetry(`${BASE_URL}/config`, {
    method: 'POST',
    headers,
    body: JSON.stringify(config)
  });
}

// Test Functions

export async function testImapConnection(config: any) {
  try {
    const res = await fetch(`${BASE_URL}/integrations/imap/test`, {
        method: 'POST',
        headers,
        body: JSON.stringify(config)
    });
    return await res.json();
  } catch (e) {
      return { success: false, message: e.message };
  }
}

export async function testWalkieFleet(config: any) {
  try {
    const res = await fetch(`${BASE_URL}/integrations/walkiefleet/test`, {
        method: 'POST',
        headers,
        body: JSON.stringify(config)
    });
    return await res.json();
  } catch (e) {
      return { success: false, message: e.message };
  }
}

export async function testOpenAI(key: string) {
    // Client-side simple check or server proxy
    if (!key) return { success: false, message: "Missing Key" };
    try {
        const res = await fetch(`${BASE_URL}/integrations/openai/test`, {
             method: 'POST', headers, body: JSON.stringify({ key })
        });
        return await res.json();
    } catch(e) { return { success: false, message: e.message }; }
}

export async function testMaps(key: string) {
    if (!key) return { success: false, message: "Missing Key" };
    try {
        const res = await fetch(`${BASE_URL}/integrations/maps/test`, {
             method: 'POST', headers, body: JSON.stringify({ key })
        });
        return await res.json();
    } catch(e) { return { success: false, message: e.message }; }
}

export async function testResend(key: string) {
    if (!key) return { success: false, message: "Missing Key" };
    try {
        const res = await fetch(`${BASE_URL}/integrations/resend/test`, {
             method: 'POST', headers, body: JSON.stringify({ key })
        });
        return await res.json();
    } catch(e) { return { success: false, message: e.message }; }
}
