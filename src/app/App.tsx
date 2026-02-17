import { useState } from 'react';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { DispatchHeader } from './components/DispatchHeader';
import { Sidebar } from './components/Sidebar';
import { StatsOverview } from './components/StatsOverview';
import { ActiveCallCard, ActiveCall } from './components/ActiveCallCard';
import { SilentListener } from './components/SilentListener';
import { UnitStatusPanel, Unit } from './components/UnitStatusPanel';
import { CallTriage } from './components/CallTriage';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Input } from './components/ui/input';
import { Search } from 'lucide-react';
import { toast } from 'sonner';
import { Toaster } from './components/ui/sonner';

// Mock data
const initialCalls: ActiveCall[] = [
  {
    id: '1',
    address: 'Nahar Hayarden 45, RBS Alef',
    type: 'Medical Emergency',
    priority: 'critical',
    caller: 'Moshe Cohen',
    phone: '054-123-4567',
    time: '14:23',
    units: ['Unit 1', 'Unit 3'],
    status: 'en-route',
    eta: '3 min',
  },
  {
    id: '2',
    address: 'Sorek 12, RBS Gimmel',
    type: 'Cardiac Arrest',
    priority: 'critical',
    caller: 'Sarah Levy',
    phone: '052-987-6543',
    time: '14:18',
    units: ['Unit 2'],
    status: 'on-scene',
  },
  {
    id: '3',
    address: 'Dolev 8, RBS Bet',
    type: 'Trauma',
    priority: 'high',
    caller: 'David Goldstein',
    phone: '053-456-7890',
    time: '14:15',
    units: [],
    status: 'pending',
  },
  {
    id: '4',
    address: 'Lachish 23, Ramat Beit Shemesh',
    type: 'Pediatric Emergency',
    priority: 'medium',
    caller: 'Rachel Green',
    phone: '050-234-5678',
    time: '14:10',
    units: ['Unit 5'],
    status: 'dispatched',
    eta: '5 min',
  },
];

const initialUnits: Unit[] = [
  {
    id: 'u1',
    name: 'Unit 1',
    status: 'dispatched',
    location: 'Nahar Hayarden',
    members: ['Yossi K.', 'Eli M.'],
  },
  {
    id: 'u2',
    name: 'Unit 2',
    status: 'busy',
    location: 'Sorek',
    members: ['David L.', 'Chaim S.'],
  },
  {
    id: 'u3',
    name: 'Unit 3',
    status: 'dispatched',
    location: 'Nahar Hayarden',
    members: ['Moshe R.'],
  },
  {
    id: 'u4',
    name: 'Unit 4',
    status: 'available',
    members: ['Avi C.', 'Shlomo G.'],
  },
  {
    id: 'u5',
    name: 'Unit 5',
    status: 'dispatched',
    location: 'Lachish',
    members: ['Yakov B.'],
  },
  {
    id: 'u6',
    name: 'Unit 6',
    status: 'available',
    members: ['Meir D.', 'Yisroel F.'],
  },
];

export default function App() {
  return (
    <LanguageProvider>
      <MainApp />
    </LanguageProvider>
  );
}

function MainApp() {
  const { t, language } = useLanguage();
  const [calls, setCalls] = useState<ActiveCall[]>(initialCalls);
  const [units] = useState<Unit[]>(initialUnits);
  const [searchQuery, setSearchQuery] = useState('');

  const handleNewCall = (newCall: ActiveCall) => {
    setCalls([newCall, ...calls]);
    toast.success('New emergency call created', {
      description: `${newCall.type} at ${newCall.address}`,
    });
  };

  const handleDispatch = (callId: string) => {
    setCalls(calls.map(call => 
      call.id === callId 
        ? { ...call, status: 'dispatched' as const, units: ['Unit 4'] }
        : call
    ));
    toast.success('Unit dispatched successfully');
  };

  const handleViewDetails = (callId: string) => {
    const call = calls.find(c => c.id === callId);
    toast.info('Call Details', {
      description: `${call?.type} - ${call?.address}`,
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
                  {filteredCalls.length === 0 ? (
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
              {/* Map Placeholder - Common in CAD systems */}
              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#D4AF37]"></span>
                  {t('live_map_view')}
                </h3>
                <div className="aspect-video bg-gray-100 rounded border border-gray-200 flex items-center justify-center text-gray-400 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&q=80&w=800&h=600')] bg-cover bg-center opacity-50 group-hover:opacity-60 transition-opacity" />
                  <span className="relative bg-white/80 px-3 py-1 rounded backdrop-blur-sm text-sm font-medium">{t('interactive_map')}</span>
                </div>
              </div>

              <SilentListener />
              <UnitStatusPanel units={units} />
            </div>
          </div>
        </main>
      </div>

      <Toaster />
    </div>
  );
}
