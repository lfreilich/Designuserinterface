import { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Phone, PhoneOff, Mic, MicOff, Pause, Play, History, Users, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

interface Call {
  id: string;
  number: string;
  name?: string;
  duration: number; // in seconds
  status: 'active' | 'held' | 'ended';
  type: 'inbound' | 'outbound';
  timestamp: Date;
}

export function FreePBXSoftphone() {
  const [activeCall, setActiveCall] = useState<Call | null>(null);
  const [dialNumber, setDialNumber] = useState('');
  const [history, setHistory] = useState<Call[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isHeld, setIsHeld] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeCall && activeCall.status === 'active') {
      interval = setInterval(() => {
        setActiveCall(prev => prev ? { ...prev, duration: prev.duration + 1 } : null);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeCall?.status]);

  const handleDial = (num: string) => {
    setDialNumber(prev => prev + num);
  };

  const startCall = () => {
    if (!dialNumber) return;
    
    // Simulate call setup
    const newCall: Call = {
      id: Date.now().toString(),
      number: dialNumber,
      name: 'Unknown Caller',
      duration: 0,
      status: 'active',
      type: 'outbound',
      timestamp: new Date(),
    };

    setActiveCall(newCall);
    toast.info('Calling...', { description: `Dialing ${dialNumber}` });
  };

  const endCall = () => {
    if (activeCall) {
      setHistory(prev => [activeCall, ...prev]);
      setActiveCall(null);
      setIsHeld(false);
      setIsMuted(false);
      toast.info('Call Ended', { description: `Duration: ${formatDuration(activeCall.duration)}` });
    }
  };

  const toggleHold = () => {
    if (activeCall) {
      setIsHeld(!isHeld);
      setActiveCall({ ...activeCall, status: isHeld ? 'active' : 'held' });
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="w-[320px] bg-white border border-gray-200 shadow-xl fixed bottom-4 right-4 z-50 overflow-hidden flex flex-col transition-all duration-300 transform translate-y-0">
      {/* Header */}
      <div className="bg-[#1E4A9C] text-white p-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2">
          <Phone className="h-4 w-4" />
          <span className="font-semibold text-sm">FreePBX Softphone</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
          <span className="text-xs opacity-90">Ready</span>
        </div>
      </div>

      {/* Active Call Screen */}
      {activeCall ? (
        <div className="flex-1 bg-gray-50 p-6 flex flex-col items-center justify-center space-y-6 min-h-[300px]">
          <div className="text-center space-y-1">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner">
              <Users className="h-8 w-8 text-gray-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">{activeCall.name || activeCall.number}</h3>
            <p className="text-sm text-gray-500 font-mono tracking-wider">{activeCall.number}</p>
            <Badge variant="secondary" className={`${isHeld ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'} mt-2`}>
              {isHeld ? 'ON HOLD' : formatDuration(activeCall.duration)}
            </Badge>
          </div>

          <div className="grid grid-cols-3 gap-4 w-full px-4">
            <Button
              variant="outline"
              size="icon"
              className={`h-12 w-12 rounded-full border-gray-300 ${isMuted ? 'bg-red-50 text-red-600 border-red-200' : 'text-gray-600 hover:bg-gray-100'}`}
              onClick={() => setIsMuted(!isMuted)}
            >
              {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </Button>
            <Button
              variant="outline"
              size="icon"
              className={`h-12 w-12 rounded-full border-gray-300 ${isHeld ? 'bg-yellow-50 text-yellow-600 border-yellow-200' : 'text-gray-600 hover:bg-gray-100'}`}
              onClick={toggleHold}
            >
              {isHeld ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-12 w-12 rounded-full border-gray-300 text-gray-600 hover:bg-gray-100"
            >
              <MessageSquare className="h-5 w-5" />
            </Button>
          </div>

          <Button 
            variant="destructive" 
            className="w-full h-12 rounded-full text-lg font-medium shadow-lg hover:bg-red-700 transition-colors"
            onClick={endCall}
          >
            <PhoneOff className="h-5 w-5 mr-2" />
            End Call
          </Button>
        </div>
      ) : (
        /* Dialpad Screen */
        <Tabs defaultValue="keypad" className="flex-1 flex flex-col">
          <div className="bg-gray-50 px-4 py-2 border-b">
            <Input 
              value={dialNumber}
              onChange={(e) => setDialNumber(e.target.value)}
              className="text-center text-2xl font-mono h-12 border-none bg-transparent shadow-none focus-visible:ring-0 placeholder:text-gray-300"
              placeholder="Enter Number..."
            />
          </div>

          <TabsContent value="keypad" className="flex-1 p-4 grid grid-cols-3 gap-3 bg-white">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, '*', 0, '#'].map((key) => (
              <button
                key={key}
                className="h-12 rounded-lg bg-gray-50 hover:bg-gray-100 active:bg-gray-200 flex items-center justify-center text-xl font-medium text-gray-700 transition-colors"
                onClick={() => handleDial(key.toString())}
              >
                {key}
              </button>
            ))}
            <div className="col-span-3 mt-2">
              <Button 
                className="w-full h-12 bg-green-500 hover:bg-green-600 text-white rounded-lg text-lg font-medium shadow-md transition-all active:scale-95"
                onClick={startCall}
                disabled={!dialNumber}
              >
                <Phone className="h-5 w-5 mr-2" />
                Call
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="history" className="flex-1 p-0 overflow-y-auto max-h-[300px]">
            {history.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 p-8">
                <History className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">No recent calls</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {history.map((call) => (
                  <div key={call.id} className="p-3 hover:bg-gray-50 flex items-center justify-between group cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${call.type === 'inbound' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'}`}>
                        {call.type === 'inbound' ? <Phone className="h-4 w-4" /> : <Phone className="h-4 w-4 rotate-45" />}
                      </div>
                      <div>
                        <p className="font-medium text-sm text-gray-900">{call.name || call.number}</p>
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          {call.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} • {formatDuration(call.duration)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsList className="grid w-full grid-cols-2 bg-gray-100 p-1 m-0 border-t border-gray-200">
            <TabsTrigger value="keypad" className="data-[state=active]:bg-white shadow-sm">Keypad</TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-white shadow-sm">Recent</TabsTrigger>
          </TabsList>
        </Tabs>
      )}
    </Card>
  );
}
