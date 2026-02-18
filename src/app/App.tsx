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
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Input } from './components/ui/input';
import { Search } from 'lucide-react';
import { toast } from 'sonner';
import { Toaster } from './components/ui/sonner';
import { CallDetailsDialog } from './components/CallDetailsDialog';
import * as api from './services/api';

export default function App() {
  return (
    <LanguageProvider>
      <MainApp />
    </LanguageProvider>
  );
}

function MainApp() {
  const { t, language } = useLanguage();
  const [calls, setCalls] = useState<ActiveCall[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedCall, setSelectedCall] = useState<ActiveCall | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Load Data
  useEffect(() => {
    async function fetchData() {
      const [incidents, resources] = await Promise.all([
        api.getIncidents(),
        api.getResources()
      ]);

      // Transform backend data to frontend model
      const mappedCalls: ActiveCall[] = incidents.map(inc => ({
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
        eta: '5 min' // Mock ETA
      }));

      const mappedUnits: Unit[] = resources.map(res => ({
        id: res._id,
        name: res.name,
        status: res.status as any,
        location: res.location ? `${res.location.coordinates[1]}, ${res.location.coordinates[0]}` : 'Unknown',
        members: res.crewMembers || []
      }));

      setCalls(mappedCalls);
      setUnits(mappedUnits);
      setLoading(false);
    }
    
    fetchData();
    // Poll for updates (simulate real-time)
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleNewCall = async (newCallData: ActiveCall) => {
    // Optimistic Update
    setCalls([newCallData, ...calls]);
    
    // Send to backend
    const incident = await api.createIncident({
      type: newCallData.type,
      priority: newCallData.priority === 'critical' ? 1 : 2,
      address: newCallData.address,
      caller: newCallData.caller,
      phone: newCallData.phone,
      notes: ''
    });

    if (incident) {
      toast.success('New emergency call created', {
        description: `${incident.chiefComplaintText} at ${incident.addressFormatted}`,
      });
    } else {
       toast.error('Failed to create incident on server');
    }
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
    const call = calls.find(c => c.id === callId);
    if (call) {
      setSelectedCall(call);
      setShowDetails(true);
    }
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
        <Sidebar />
        
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6 space-y-6">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{t('dashboard_overview')}</h2>
              <p className="text-muted-foreground">{t('real_time_ops')}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-500 bg-white px-3 py-1 rounded-full shadow-sm border">
                {new Date().toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
            </div>
          </div>

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
        </main>
      </div>

      <CallDetailsDialog 
        open={showDetails} 
        call={selectedCall} 
        onClose={() => setShowDetails(false)} 
      />

      <Toaster />
    </div>
  );
}
