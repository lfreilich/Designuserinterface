import { useState, useEffect, useRef } from 'react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { Input } from './ui/input';
import { useLanguage } from '../contexts/LanguageContext';
import { 
  Mic, MicOff, Phone, PhoneOff, Radio, Brain, 
  MessageSquare, ShieldAlert, Activity, User, 
  Signal, Volume2, Play, Pause, AlertTriangle, Check,
  X, Minus, GripHorizontal, Delete
} from 'lucide-react';
import { toast } from 'sonner';

// --- Types ---

interface Transcript {
  id: string;
  source: 'radio' | 'phone';
  sender: string;
  text: string;
  timestamp: string;
  sentiment: 'neutral' | 'urgent' | 'distress';
  aiAnalysis?: string;
  actionRequired?: boolean;
}

interface RadioChannel {
  id: string;
  name: string;
  status: 'idle' | 'rx' | 'tx';
  members: number;
}

// --- Mock Data Generators ---

const MOCK_TRANSCRIPTS: Partial<Transcript>[] = [
  { source: 'radio', sender: 'Unit 4 (David)', text: 'Arrived at location. Scene is safe.', sentiment: 'neutral', aiAnalysis: 'Unit On-Scene: Nahar Hayarden 45' },
  { source: 'phone', sender: 'Caller (054-123-4567)', text: 'He is not breathing! I think he collapsed!', sentiment: 'distress', aiAnalysis: 'Cardiac Arrest Protocol Initiated', actionRequired: true },
  { source: 'radio', sender: 'Dispatch (You)', text: 'Copy Unit 4. ALS is en-route.', sentiment: 'neutral' },
  { source: 'phone', sender: 'Caller', text: 'Please hurry, he is turning blue.', sentiment: 'distress', aiAnalysis: 'Cyanosis reported - Priority Critical' },
];

export function SilentListener() {
  const { t } = useLanguage();
  // --- State ---
  const [activeTab, setActiveTab] = useState<'live' | 'radio'>('live');
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  
  // Radio State (WalkieFleet Integration)
  const [selectedChannel, setSelectedChannel] = useState('1');
  const [isPTT, setIsPTT] = useState(false);
  const [radioChannels] = useState<RadioChannel[]>([
    { id: '1', name: 'Main Dispatch', status: 'idle', members: 12 },
    { id: '2', name: 'Medical Ops', status: 'rx', members: 8 },
    { id: '3', name: 'Tactical 1', status: 'idle', members: 5 },
  ]);

  // Phone State (FreePBX Integration) - Now as an Overlay
  const [showPhone, setShowPhone] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);
  const [dialPadNumber, setDialPadNumber] = useState('');
  const [isPhoneMuted, setIsPhoneMuted] = useState(false);
  
  // Audio Viz
  const [audioLevels, setAudioLevels] = useState<number[]>(new Array(12).fill(10));

  // --- Effects ---

  // Simulate incoming live transcripts
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    
    const addMockTranscript = (index: number) => {
      if (index >= MOCK_TRANSCRIPTS.length) return;
      
      const mock = MOCK_TRANSCRIPTS[index];
      const newTranscript: Transcript = {
        id: Date.now().toString(),
        source: mock.source!,
        sender: mock.sender!,
        text: mock.text!,
        sentiment: mock.sentiment || 'neutral',
        aiAnalysis: mock.aiAnalysis,
        actionRequired: mock.actionRequired,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      };

      setTranscripts(prev => [newTranscript, ...prev]);
      
      // Schedule next mock
      timeout = setTimeout(() => addMockTranscript(index + 1), 4000);
    };

    // Start simulation after 2s
    timeout = setTimeout(() => addMockTranscript(0), 2000);

    return () => clearTimeout(timeout);
  }, []);

  // Audio visualizer animation
  useEffect(() => {
    const interval = setInterval(() => {
      const isActive = isPTT || isCallActive || radioChannels.some(c => c.status === 'rx');
      if (isActive) {
        setAudioLevels(prev => prev.map(() => Math.random() * 80 + 20));
      } else {
        setAudioLevels(new Array(12).fill(5));
      }
    }, 100);
    return () => clearInterval(interval);
  }, [isPTT, isCallActive, radioChannels]);

  // --- Handlers ---

  const handlePTTStart = () => {
    setIsPTT(true);
    toast('Transmitting on Main Dispatch...', { icon: '🎙️' });
  };
  
  const handlePTTEnd = () => setIsPTT(false);

  const toggleCall = () => {
    if (isCallActive) {
      setIsCallActive(false);
      toast.success('Call Ended');
    } else {
      if (!dialPadNumber) {
        toast.error('Please enter a number');
        return;
      }
      setIsCallActive(true);
      toast.info('Calling...', { description: dialPadNumber });
    }
  };

  const handleAiAction = (action: string) => {
    toast.success('AI Action Executed', { description: action });
  };

  const handleDialKey = (key: string | number) => {
    setDialPadNumber(prev => prev + key.toString());
  };

  // --- Render Helpers ---

  const renderVisualizer = () => (
    <div className="flex items-center justify-center gap-1 h-8 opacity-80">
      {audioLevels.map((level, i) => (
        <div 
          key={i}
          className={`w-1 rounded-full transition-all duration-75 ${
            isPTT ? 'bg-red-500' : isCallActive ? 'bg-green-500' : 'bg-[#1E4A9C]'
          }`}
          style={{ height: `${level}%` }}
        />
      ))}
    </div>
  );

  return (
    <Card className="flex flex-col h-[600px] bg-white border border-gray-200 shadow-lg overflow-hidden relative group">
      {/* Header */}
      <div className="bg-[#1a1f2c] text-white p-3 flex items-center justify-between shadow-md z-10 shrink-0">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-[#D4AF37]" />
          <div>
            <h3 className="font-bold text-sm tracking-wide">{t('silent_listener')}</h3>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
              <span className="text-[10px] text-gray-400 uppercase tracking-wider">{t('monitoring_comms')}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <div className="flex bg-white/10 rounded-lg p-0.5 mr-2">
            <Button 
              variant="ghost" 
              size="sm" 
              className={`h-7 px-3 text-xs ${activeTab === 'live' ? 'bg-[#1E4A9C] text-white' : 'text-gray-400 hover:text-white'}`}
              onClick={() => setActiveTab('live')}
            >
              {t('live_feed')}
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className={`h-7 px-3 text-xs ${activeTab === 'radio' ? 'bg-[#1E4A9C] text-white' : 'text-gray-400 hover:text-white'}`}
              onClick={() => setActiveTab('radio')}
            >
              {t('radio')}
            </Button>
          </div>
          
          <Button 
            variant={showPhone ? "secondary" : "ghost"}
            size="sm"
            className={`h-8 w-8 p-0 rounded-full transition-colors ${showPhone ? 'bg-green-500 text-white hover:bg-green-600' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
            onClick={() => setShowPhone(!showPhone)}
            title="Toggle Smartphone"
          >
            <Phone className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 bg-gray-50 flex flex-col overflow-hidden relative">
        
        {/* AI Audio Visualizer Overlay (Always visible at top) */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#1E4A9C] to-transparent opacity-20 z-0" />
        
        {activeTab === 'live' && (
          <ScrollArea className="flex-1 p-4 pb-16">
            <div className="space-y-4">
              {transcripts.length === 0 && (
                <div className="text-center py-12 text-gray-400 text-sm">
                  <Activity className="h-8 w-8 mx-auto mb-2 opacity-20" />
                  Listening for communications...
                </div>
              )}
              {transcripts.map((t) => (
                <div key={t.id} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-full shrink-0 ${
                      t.source === 'radio' ? 'bg-blue-100 text-[#1E4A9C]' : 'bg-green-100 text-green-600'
                    }`}>
                      {t.source === 'radio' ? <Radio className="h-4 w-4" /> : <Phone className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm text-gray-900">{t.sender}</span>
                        <span className="text-[10px] text-gray-400">{t.timestamp}</span>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm text-sm text-gray-700 leading-relaxed">
                        {t.text}
                      </div>
                      
                      {/* AI Analysis Card */}
                      {t.aiAnalysis && (
                        <div className={`mt-2 p-2 rounded-md border text-xs flex items-center justify-between gap-2 ${
                          t.sentiment === 'distress' 
                            ? 'bg-red-50 border-red-100 text-red-700' 
                            : 'bg-indigo-50 border-indigo-100 text-indigo-700'
                        }`}>
                          <div className="flex items-center gap-2">
                            <Brain className="h-3.5 w-3.5" />
                            <span className="font-medium">{t.aiAnalysis}</span>
                          </div>
                          {t.actionRequired && (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="h-6 text-[10px] bg-white border-red-200 hover:bg-red-50 text-red-600"
                              onClick={() => handleAiAction(t.aiAnalysis!)}
                            >
                              Execute
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {/* Radio Tab Integration (WalkieFleet Style) */}
        {activeTab === 'radio' && (
          <div className="flex-1 p-4 flex flex-col items-center justify-center bg-[#1a1f2c] text-white">
            <div className="w-full mb-4 flex justify-between items-center text-xs text-gray-400 uppercase tracking-wider">
              <span>WalkieFleet Integrated</span>
              <Signal className="h-4 w-4 text-green-500" />
            </div>
            
            <div className="text-center space-y-4 mb-8">
              <div className="text-4xl font-bold tracking-tighter text-white">
                {radioChannels.find(c => c.id === selectedChannel)?.name}
              </div>
              <Badge className={`${isPTT ? 'bg-red-600' : 'bg-[#1E4A9C]'} border-none px-3 py-1`}>
                {isPTT ? t('transmitting') : t('monitoring')}
              </Badge>
              {renderVisualizer()}
            </div>

            <button
              className={`w-32 h-32 rounded-full flex items-center justify-center border-8 transition-all shadow-2xl ${
                isPTT 
                  ? 'bg-red-600 border-red-800 scale-95 shadow-red-900/50' 
                  : 'bg-gray-700 border-gray-600 hover:bg-gray-600'
              }`}
              onMouseDown={handlePTTStart}
              onMouseUp={handlePTTEnd}
              onMouseLeave={handlePTTEnd}
            >
              <Mic className={`h-12 w-12 ${isPTT ? 'text-white' : 'text-gray-400'}`} />
            </button>
            <p className="mt-4 text-xs font-mono text-gray-500">{t('push_to_talk')}</p>
          </div>
        )}

        {/* Smartphone Overlay Window */}
        {showPhone && (
          <div className="absolute bottom-1 right-1 sm:bottom-4 sm:right-4 w-[280px] bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col animate-in slide-in-from-bottom-5 zoom-in-95 duration-200 z-50">
            {/* Phone Header */}
            <div className="bg-gray-900 text-white p-2 px-3 flex items-center justify-between cursor-move">
              <div className="flex items-center gap-2 text-xs font-medium">
                <GripHorizontal className="h-3 w-3 opacity-50" />
                <span>{t('softphone')}</span>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-5 w-5 hover:bg-white/20 text-gray-400 hover:text-white"
                onClick={() => setShowPhone(false)}
              >
                <Minus className="h-3 w-3" />
              </Button>
            </div>

            {/* Phone Body */}
            <div className="p-4 bg-gray-50">
              {/* Dial Display (Typeable) */}
              <div className="mb-4 relative">
                 <Input 
                   type="text" 
                   value={dialPadNumber}
                   onChange={(e) => setDialPadNumber(e.target.value)}
                   className="text-center text-xl font-mono h-10 border-gray-200 bg-white shadow-sm focus-visible:ring-1 focus-visible:ring-green-500 pr-8"
                   placeholder={t('enter_number')}
                 />
                 {dialPadNumber && (
                   <button 
                     onClick={() => setDialPadNumber(prev => prev.slice(0, -1))}
                     className="absolute right-2 top-2.5 text-gray-400 hover:text-red-500"
                   >
                     <Delete className="h-4 w-4" />
                   </button>
                 )}
              </div>

              {/* Keypad */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, '*', 0, '#'].map((key) => (
                  <button
                    key={key}
                    onClick={() => handleDialKey(key)}
                    className="h-10 rounded bg-white border border-gray-200 hover:bg-gray-100 active:bg-gray-200 text-lg font-medium text-gray-700 shadow-sm transition-colors"
                  >
                    {key}
                  </button>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button 
                  className={`flex-1 h-12 rounded-lg font-bold shadow-md transition-all ${
                    isCallActive 
                      ? 'bg-red-500 hover:bg-red-600 text-white' 
                      : 'bg-green-500 hover:bg-green-600 text-white'
                  }`}
                  onClick={toggleCall}
                >
                  {isCallActive ? <PhoneOff className="h-5 w-5" /> : <Phone className="h-5 w-5" />}
                </Button>
                {isCallActive && (
                  <Button
                    variant="outline"
                    className={`h-12 w-12 rounded-lg border-gray-200 ${isPhoneMuted ? 'bg-red-50 text-red-600' : 'bg-white text-gray-600'}`}
                    onClick={() => setIsPhoneMuted(!isPhoneMuted)}
                  >
                    {isPhoneMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                  </Button>
                )}
              </div>
            </div>

            {/* Status Footer */}
            <div className="bg-gray-100 p-1.5 text-[10px] text-center text-gray-500 font-medium border-t border-gray-200">
               {isCallActive ? (
                 <span className="text-green-600 flex items-center justify-center gap-1">
                   <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"/>
                   Connected: 00:42
                 </span>
               ) : (
                 "Ready to dial"
               )}
            </div>
          </div>
        )}

      </div>

      {/* Footer / Quick Controls */}
      <div className="bg-white border-t border-gray-200 p-2 flex items-center justify-between text-xs text-gray-500 shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 cursor-pointer hover:text-[#1E4A9C]" onClick={() => setActiveTab('radio')}>
            <div className={`w-2 h-2 rounded-full ${isPTT ? 'bg-red-500' : 'bg-green-500'}`} />
            Radio: {radioChannels.find(c => c.id === selectedChannel)?.name}
          </div>
          <div className="h-3 w-[1px] bg-gray-300" />
          <div 
            className="flex items-center gap-1.5 cursor-pointer hover:text-[#1E4A9C]" 
            onClick={() => setShowPhone(true)}
          >
            <Phone className={`h-3 w-3 ${isCallActive ? 'text-green-500' : 'text-gray-400'}`} />
            {t('phone')}: {isCallActive ? t('active') : t('available')}
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400">
          <Activity className="h-3.5 w-3.5" />
        </Button>
      </div>
    </Card>
  );
}
