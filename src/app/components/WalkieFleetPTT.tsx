import { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Volume2, VolumeX, Mic, MicOff, Users, Radio, Signal, Power } from 'lucide-react';

interface TalkGroup {
  id: string;
  name: string;
  status: 'idle' | 'rx' | 'tx';
  members: number;
  activeMember?: string;
}

export function WalkieFleetPTT() {
  const [groups, setGroups] = useState<TalkGroup[]>([
    { id: '1', name: 'Main Dispatch', status: 'idle', members: 12 },
    { id: '2', name: 'Medical Ops', status: 'rx', members: 8, activeMember: 'Unit 4 (David)' },
    { id: '3', name: 'Tactical 1', status: 'idle', members: 5 },
    { id: '4', name: 'Regional HQ', status: 'idle', members: 3 },
  ]);

  const [selectedGroup, setSelectedGroup] = useState<string>('1');
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(80);

  // Mock audio visualization
  const [audioLevel, setAudioLevel] = useState<number[]>(new Array(16).fill(5));

  useEffect(() => {
    const interval = setInterval(() => {
      // Animate bars if receiving or transmitting
      const active = groups.some(g => g.status === 'rx') || isTransmitting;
      if (active) {
        setAudioLevel(prev => prev.map(() => Math.random() * 80 + 10));
      } else {
        setAudioLevel(new Array(16).fill(5));
      }
    }, 100);
    return () => clearInterval(interval);
  }, [groups, isTransmitting]);

  const handlePTTStart = () => {
    setIsTransmitting(true);
    setGroups(groups.map(g => 
      g.id === selectedGroup ? { ...g, status: 'tx', activeMember: 'Dispatch (You)' } : g
    ));
  };

  const handlePTTEnd = () => {
    setIsTransmitting(false);
    setGroups(groups.map(g => 
      g.id === selectedGroup ? { ...g, status: 'idle', activeMember: undefined } : g
    ));
  };

  return (
    <Card className="flex flex-col h-[400px] bg-[#1a1f2c] text-white border-0 overflow-hidden shadow-xl">
      {/* Header */}
      <div className="p-3 bg-[#11151d] flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-2">
          <img src="https://walkiefleet.com/images/logo.png" alt="WalkieFleet" className="h-5 opacity-80" onError={(e) => e.currentTarget.style.display = 'none'} />
          <span className="font-semibold tracking-wide text-sm">WalkieFleet PTT</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 text-[10px] px-1.5 gap-1">
            <Signal className="h-3 w-3" />
            ONLINE
          </Badge>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-white" onClick={() => setIsMuted(!isMuted)}>
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Main Display Area */}
      <div className="flex-1 p-4 flex flex-col items-center justify-center relative bg-gradient-to-b from-[#1a1f2c] to-[#11151d]">
        <div className="absolute top-2 right-2 flex gap-1">
          {audioLevel.map((level, i) => (
            <div 
              key={i} 
              className={`w-1 rounded-full transition-all duration-75 ${
                isTransmitting ? 'bg-red-500' : 'bg-[#1E4A9C]'
              }`}
              style={{ height: `${level}px`, opacity: level > 10 ? 1 : 0.2 }}
            />
          ))}
        </div>

        <div className="text-center space-y-2 z-10">
          <h2 className="text-2xl font-bold text-white tracking-tight">
            {groups.find(g => g.id === selectedGroup)?.name}
          </h2>
          
          <div className="h-8 flex items-center justify-center">
            {isTransmitting ? (
              <Badge className="bg-red-600 animate-pulse px-3 py-1 text-sm border-none">TRANSMITTING</Badge>
            ) : groups.find(g => g.id === selectedGroup)?.status === 'rx' ? (
              <Badge className="bg-[#1E4A9C] px-3 py-1 text-sm border-none flex items-center gap-2">
                <Radio className="h-3 w-3" />
                {groups.find(g => g.id === selectedGroup)?.activeMember}
              </Badge>
            ) : (
              <span className="text-gray-500 text-sm font-mono">IDLE - READY TO TRANSMIT</span>
            )}
          </div>
        </div>

        {/* PTT Button */}
        <button
          className={`mt-6 w-32 h-32 rounded-full flex items-center justify-center border-4 transition-all transform active:scale-95 shadow-2xl ${
            isTransmitting 
              ? 'bg-red-600 border-red-800 shadow-[0_0_50px_rgba(220,30,46,0.5)]' 
              : 'bg-gray-700 border-gray-600 hover:bg-gray-600 hover:border-gray-500'
          }`}
          onMouseDown={handlePTTStart}
          onMouseUp={handlePTTEnd}
          onMouseLeave={handlePTTEnd}
        >
          <Mic className={`h-12 w-12 ${isTransmitting ? 'text-white' : 'text-gray-400'}`} />
        </button>
        <p className="text-xs text-gray-500 mt-3 font-medium">HOLD TO TALK</p>
      </div>

      {/* Channel List */}
      <div className="h-[140px] bg-[#161b26] border-t border-white/5">
        <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider flex justify-between">
          <span>Talk Groups</span>
          <Users className="h-3 w-3" />
        </div>
        <ScrollArea className="h-[100px]">
          <div className="space-y-1 px-2 pb-2">
            {groups.map(group => (
              <button
                key={group.id}
                onClick={() => setSelectedGroup(group.id)}
                className={`w-full flex items-center justify-between p-2 rounded text-left transition-colors ${
                  selectedGroup === group.id 
                    ? 'bg-white/10 text-white' 
                    : 'text-gray-400 hover:bg-white/5 hover:text-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    group.status === 'tx' ? 'bg-red-500' :
                    group.status === 'rx' ? 'bg-[#1E4A9C]' :
                    'bg-gray-600'
                  }`} />
                  <span className="text-sm font-medium">{group.name}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  {group.status === 'rx' && <Volume2 className="h-3 w-3 text-[#1E4A9C]" />}
                  <span className="bg-white/5 px-1.5 rounded">{group.members}</span>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>
    </Card>
  );
}
