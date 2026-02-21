import { useState, useEffect } from 'react';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { DispatchHeader } from './components/DispatchHeader';
import { Sidebar } from './components/Sidebar';
import { StatsOverview } from './components/StatsOverview';
import { ActiveCallCard, ActiveCall } from './components/ActiveCallCard';
import { SilentListener } from './components/SilentListener';
import { TacticalMap } from './components/TacticalMap';
import { UnitStatusPanel, Unit } from './components/UnitStatusPanel';
import { CallTriage } from './components/CallTriage';
import { IncidentIntakeForm } from './components/IncidentIntakeForm';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Input } from './components/ui/input';
import { Button } from './components/ui/button';
import { Search, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Toaster } from './components/ui/sonner';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { CallDetailsDialog } from './components/CallDetailsDialog';
import { SettingsPage } from './components/SettingsPage';
import { FreePBXSoftphone } from './components/FreePBXSoftphone';
import * as api from './services/api';

import { GoogleMapsProvider } from './contexts/GoogleMapsContext';

export default function App() {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [configLoaded, setConfigLoaded] = useState(false);

  useEffect(() => {
    api.getConfig().then(config => {
      if (config?.apiKeys?.googleMaps) {
        setApiKey(config.apiKeys.googleMaps);
      }
      setConfigLoaded(true);
    });
  }, []);

  if (!configLoaded) {
    return <div className="flex items-center justify-center h-screen bg-gray-50 text-gray-500">Loading configuration...</div>;
  }

  return (
    <LanguageProvider>
      <DndProvider backend={HTML5Backend}>
        <GoogleMapsProvider apiKey={apiKey} configLoaded={configLoaded}>
          <MainApp />
        </GoogleMapsProvider>
      </DndProvider>
    </LanguageProvider>
  );
}

function MainApp() {
  const { t, language } = useLanguage();
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [calls, setCalls] = useState<ActiveCall[]>([]);
  const [incidents, setIncidents] = useState<api.BackendIncident[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [users, setUsers] = useState<api.BackendUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedIncident, setSelectedIncident] = useState<api.BackendIncident | null>(null);
  const [showIncidentForm, setShowIncidentForm] = useState(false);

  // Load Data
  useEffect(() => {
    async function fetchData() {
      const [fetchedIncidents, resources, fetchedUsers] = await Promise.all([
        api.getIncidents(),
        api.getResources(),
        api.getUsers()
      ]);

      setIncidents(fetchedIncidents);

      // Transform backend data to frontend model
      const mappedCalls: ActiveCall[] = fetchedIncidents.map(inc => ({
        id: inc._id,
        address: inc.addressFormatted,
        type: inc.chiefComplaintText,
        priority: inc.priority === 1 ? 'critical' : inc.priority === 2 ? 'high' : 'medium',
        caller: inc.callerName,
        phone: inc.callerPhone,
        time: new Date(inc.timeCallReceived).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        units: inc.unitsAssigned.map(uid => {
          const u = resources.find(r => r._id === uid);
          return u ? u.name : uid;
        }),
        status: inc.status === 'open' ? 'pending' : inc.status === 'dispatched' ? 'dispatched' : 'active' as any,
        eta: '5 min', // Mock ETA
        location: inc.location?.coordinates ? { lat: inc.location.coordinates[1], lng: inc.location.coordinates[0] } : undefined
      }));

      const mappedUnits: Unit[] = resources.map(res => ({
        id: res._id,
        name: res.name,
        status: res.status as any,
        location: res.location ? `${res.location.coordinates[1]}, ${res.location.coordinates[0]}` : 'Unknown',
        coordinates: res.location?.coordinates ? { lat: res.location.coordinates[1], lng: res.location.coordinates[0] } : undefined,
        members: res.crewMembers || []
      }));

      setCalls(mappedCalls);
      setUnits(mappedUnits);
      setUsers(fetchedUsers);
      setLoading(false);
    }
    
    fetchData();
    // Poll for updates (simulate real-time)
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleNewCall = async (newCallData: ActiveCall) => {
    // This triage quick-add might need to be deprecated or routed to the full form
    // For now, let's open the full form pre-filled
    setSelectedIncident(null);
    setShowIncidentForm(true);
  };

  const handleDispatch = async (callId: string) => {
    // Find available unit (simple logic for demo)
    const availableUnit = units.find(u => u.status === 'available');
    if (availableUnit) {
      const success = await api.dispatchUnit(callId, availableUnit.id);
      if (success) {
        toast.success(`Unit ${availableUnit.name} dispatched successfully`);
        // State will update on next poll or manual update
        setCalls(calls.map(c => c.id === callId ? { ...c, status: 'dispatched', units: [...c.units, availableUnit.name] } : c));
        setUnits(units.map(u => u.id === availableUnit.id ? { ...u, status: 'dispatched' } : u));
      } else {
        toast.error('Dispatch failed');
      }
    } else {
      toast.error('No available units');
    }
  };

  const handleViewDetails = (callId: string) => {
    const incident = incidents.find(i => i._id === callId);
    if (incident) {
      setSelectedIncident(incident);
      setShowIncidentForm(true);
    }
  };


  const handleNewIncidentSave = (incident: api.BackendIncident) => {
    // Refresh list locally
    setIncidents(prev => {
        const existingIndex = prev.findIndex(i => i._id === incident._id);
        if (existingIndex >= 0) {
            const updated = [...prev];
            updated[existingIndex] = incident;
            return updated;
        }
        return [incident, ...prev];
    });
    
    // Also update mapped calls
    const newCallData: ActiveCall = {
        id: incident._id,
        address: incident.addressFormatted,
        type: incident.chiefComplaintText,
        priority: incident.priority === 1 ? 'critical' : incident.priority === 2 ? 'high' : 'medium',
        caller: incident.callerName,
        phone: incident.callerPhone,
        time: new Date(incident.timeCallReceived).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        units: incident.unitsAssigned || [],
        status: incident.status === 'open' ? 'pending' : incident.status === 'dispatched' ? 'dispatched' : 'active' as any,
        eta: '',
        location: incident.location?.coordinates ? { lat: incident.location.coordinates[1], lng: incident.location.coordinates[0] } : undefined
    };
    
    setCalls(prev => {
        const existingIndex = prev.findIndex(c => c.id === incident._id);
        if (existingIndex >= 0) {
            const updated = [...prev];
            updated[existingIndex] = newCallData;
            return updated;
        }
        return [newCallData, ...prev];
    });
  };

  const filteredCalls = calls.filter(call =>
    call.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
    call.caller.toLowerCase().includes(searchQuery.toLowerCase()) ||
    call.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeCalls = calls.filter(c => c.status !== 'pending');
  const completedCalls = 15; // Mock data

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col" dir={language === 'he' ? 'rtl' : 'ltr'}>
      <DispatchHeader />
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />
        
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6 space-y-6">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 uppercase tracking-tight">
                {currentPage.replace('_', ' ')}
              </h2>
              <p className="text-muted-foreground">{t('real_time_ops')}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={() => { setSelectedIncident(null); setShowIncidentForm(true); }} className="bg-[#DC1E2E] hover:bg-[#b91926] text-white gap-2">
                <Plus className="h-4 w-4" /> New Incident
              </Button>
              <span className="text-sm font-medium text-gray-500 bg-white px-3 py-1 rounded-full shadow-sm border">
                {new Date().toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
            </div>
          </div>

          {currentPage === 'dashboard' && (
            <>
              <StatsOverview
                totalCalls={calls.length + completedCalls}
                activeCalls={activeCalls.length}
                completedCalls={completedCalls}
                avgResponseTime="4:32"
              />

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2 space-y-4">
                  <div className="flex items-center justify-between gap-4 bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                    <div className="relative flex-1 max-w-md">
                      <Search className={`absolute ${language === 'he' ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground`} />
                      <Input
                        placeholder={t('search_placeholder')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={`${language === 'he' ? 'pr-10' : 'pl-10'} border-gray-200 focus:ring-[#1E4A9C]`}
                      />
                    </div>
                    {/* CallTriage is now redundant or can be kept as a "Quick Entry". 
                        For now, hiding it to favor the main New Incident button or keeping it as a widget. 
                        Let's keep it as a widget but maybe the main button is preferred. */}
                    <CallTriage onSubmit={handleNewCall} />
                  </div>

                  <Tabs defaultValue="all" className="w-full">
                    <TabsList className="grid w-full grid-cols-4 bg-gray-100 p-1">
                      <TabsTrigger 
                        value="all"
                        className="data-[state=active]:bg-white data-[state=active]:text-[#1E4A9C] data-[state=active]:shadow-sm"
                      >
                        {t('all_calls')}
                      </TabsTrigger>
                      <TabsTrigger 
                        value="pending"
                        className="data-[state=active]:bg-white data-[state=active]:text-[#1E4A9C] data-[state=active]:shadow-sm"
                      >
                        {t('pending')}
                      </TabsTrigger>
                      <TabsTrigger 
                        value="active"
                        className="data-[state=active]:bg-white data-[state=active]:text-[#1E4A9C] data-[state=active]:shadow-sm"
                      >
                        {t('active')}
                      </TabsTrigger>
                      <TabsTrigger 
                        value="critical"
                        className="data-[state=active]:bg-white data-[state=active]:text-[#DC1E2E] data-[state=active]:font-bold data-[state=active]:shadow-sm"
                      >
                        {t('critical')}
                      </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="all" className="space-y-3 mt-4">
                      {loading ? (
                         <div className="p-8 text-center text-gray-400">Loading incidents from server...</div>
                      ) : filteredCalls.length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-lg border border-dashed border-gray-200">
                          <p className="text-muted-foreground">No calls found matching your criteria</p>
                        </div>
                      ) : (
                        filteredCalls.map((call) => (
                          <ActiveCallCard
                            key={call.id}
                            call={call}
                            onDispatch={handleDispatch}
                            onView={handleViewDetails}
                          />
                        ))
                      )}
                    </TabsContent>
                    
                    <TabsContent value="pending" className="space-y-3 mt-4">
                      {filteredCalls.filter(c => c.status === 'pending').map((call) => (
                        <ActiveCallCard
                          key={call.id}
                          call={call}
                          onDispatch={handleDispatch}
                          onView={handleViewDetails}
                        />
                      ))}
                    </TabsContent>
                    
                    <TabsContent value="active" className="space-y-3 mt-4">
                      {filteredCalls.filter(c => c.status !== 'pending').map((call) => (
                        <ActiveCallCard
                          key={call.id}
                          call={call}
                          onDispatch={handleDispatch}
                          onView={handleViewDetails}
                        />
                      ))}
                    </TabsContent>
                    
                    <TabsContent value="critical" className="space-y-3 mt-4">
                      {filteredCalls.filter(c => c.priority === 'critical').map((call) => (
                        <ActiveCallCard
                          key={call.id}
                          call={call}
                          onDispatch={handleDispatch}
                          onView={handleViewDetails}
                        />
                      ))}
                    </TabsContent>
                  </Tabs>
                </div>

                <div className="space-y-6">
                  {/* Live Map View */}
                  <div className="h-[400px]">
                    <TacticalMap incidents={activeCalls} units={units} />
                  </div>

                  <SilentListener />
                  <UnitStatusPanel units={units} />
                </div>
              </div>
            </>
          )}

          {currentPage === 'active_calls' && (
             <div className="space-y-4">
                {filteredCalls.map((call) => (
                  <ActiveCallCard
                    key={call.id}
                    call={call}
                    onDispatch={handleDispatch}
                    onView={handleViewDetails}
                  />
                ))}
             </div>
          )}

          {currentPage === 'units_status' && (
             <UnitStatusPanel units={units} />
          )}

          {currentPage === 'live_map' && (
             <div className="h-[calc(100vh-200px)]">
               <TacticalMap incidents={activeCalls} units={units} />
             </div>
          )}

          {currentPage === 'personnel' && (
             <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                   <thead className="bg-gray-50">
                      <tr>
                         <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                         <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                         <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Branch</th>
                         <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                      </tr>
                   </thead>
                   <tbody className="bg-white divide-y divide-gray-200">
                      {users.length > 0 ? users.map((u) => (
                         <tr key={u._id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                               <div className="flex items-center">
                                  <div className="flex-shrink-0 h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center font-bold text-gray-600">
                                     {u.name.charAt(0)}
                                  </div>
                                  <div className="ml-4">
                                     <div className="text-sm font-medium text-gray-900">{u.name}</div>
                                  </div>
                                </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{u.role}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{u.branch}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{u.email}</td>
                         </tr>
                      )) : (
                         <tr><td colSpan={4} className="px-6 py-4 text-center text-gray-500">No personnel found</td></tr>
                      )}
                   </tbody>
                </table>
             </div>
          )}

          {currentPage === 'reports' && (
             <div className="p-8 text-center text-gray-500 bg-white rounded-lg border border-dashed">
                <h3 className="text-lg font-medium">Reports Module</h3>
                <p>Select a report type to generate.</p>
                <div className="mt-4 flex justify-center gap-4">
                   <Button variant="outline">Daily Incident Log</Button>
                   <Button variant="outline">Response Time Analysis</Button>
                   <Button variant="outline">Unit Activity</Button>
                </div>
             </div>
          )}

          {currentPage === 'call_history' && (
             <div className="space-y-4">
                <h3 className="font-medium text-gray-700">Recent Incidents History</h3>
                {/* Reuse ActiveCallCard but filtered for closed */}
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                   <p className="text-gray-500 italic text-center">History archive access requires admin privileges.</p>
                </div>
             </div>
          )}

          {currentPage === 'configuration' && (
             <SettingsPage />
          )}

        </main>
      </div>

      <IncidentIntakeForm 
        open={showIncidentForm}
        onClose={() => setShowIncidentForm(false)}
        incident={selectedIncident}
        onSave={handleNewIncidentSave}
        units={units}
      />

      <FreePBXSoftphone />
      <Toaster />
    </div>
  );
}
