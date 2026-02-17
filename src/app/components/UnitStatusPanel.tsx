import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Activity, Radio, MapPin, Users, Wifi, WifiOff, Clock } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';

export interface Unit {
  id: string;
  name: string;
  status: 'available' | 'dispatched' | 'busy' | 'offline';
  location?: string;
  members: string[];
  lastUpdate?: string;
}

interface UnitStatusPanelProps {
  units: Unit[];
}

const statusConfig = {
  available: { color: 'bg-green-500', text: 'Available', bg: 'bg-green-50', border: 'border-green-200' },
  dispatched: { color: 'bg-[#D4AF37]', text: 'Dispatched', bg: 'bg-yellow-50', border: 'border-yellow-200' },
  busy: { color: 'bg-[#DC1E2E]', text: 'Busy', bg: 'bg-red-50', border: 'border-red-200' },
  offline: { color: 'bg-gray-400', text: 'Offline', bg: 'bg-gray-50', border: 'border-gray-200' },
};

export function UnitStatusPanel({ units }: UnitStatusPanelProps) {
  const availableCount = units.filter(u => u.status === 'available').length;
  const dispatchedCount = units.filter(u => u.status === 'dispatched').length;
  const busyCount = units.filter(u => u.status === 'busy').length;

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3 bg-white border border-green-100 shadow-sm flex flex-col items-center justify-center hover:border-green-300 transition-colors">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Available</span>
          <span className="text-2xl font-bold text-green-600 mt-1">{availableCount}</span>
        </Card>
        <Card className="p-3 bg-white border border-yellow-100 shadow-sm flex flex-col items-center justify-center hover:border-yellow-300 transition-colors">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Dispatched</span>
          <span className="text-2xl font-bold text-[#D4AF37] mt-1">{dispatchedCount}</span>
        </Card>
        <Card className="p-3 bg-white border border-red-100 shadow-sm flex flex-col items-center justify-center hover:border-red-300 transition-colors">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Busy</span>
          <span className="text-2xl font-bold text-[#DC1E2E] mt-1">{busyCount}</span>
        </Card>
      </div>

      {/* Main List */}
      <Card className="flex-1 border-gray-200 shadow-sm overflow-hidden flex flex-col bg-white">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-2">
            <Radio className="h-5 w-5 text-[#1E4A9C]" />
            <h3 className="font-semibold text-gray-900">Unit Status</h3>
          </div>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Updated 1m ago
          </span>
        </div>
        
        <ScrollArea className="flex-1 p-0">
          <div className="divide-y divide-gray-100">
            {units.map((unit) => {
              const status = statusConfig[unit.status];
              return (
                <div 
                  key={unit.id} 
                  className={`group p-4 hover:bg-gray-50 transition-colors cursor-pointer border-l-4 ${status.border.replace('border-', 'border-l-')}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900">{unit.name}</span>
                      {unit.status === 'offline' ? (
                        <WifiOff className="h-3.5 w-3.5 text-gray-400" />
                      ) : (
                        <Wifi className="h-3.5 w-3.5 text-green-500" />
                      )}
                    </div>
                    <Badge variant="outline" className={`${status.bg} ${status.color.replace('bg-', 'text-')} border-none font-semibold text-xs`}>
                      {status.text}
                    </Badge>
                  </div>
                  
                  <div className="space-y-1.5">
                    <div className="flex items-start gap-2 text-sm text-gray-600">
                      <Users className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                      <span className="truncate">{unit.members.join(', ')}</span>
                    </div>
                    
                    {unit.location && (
                      <div className="flex items-start gap-2 text-xs text-gray-500">
                        <MapPin className="h-3.5 w-3.5 text-gray-400 mt-0.5 shrink-0" />
                        <span className="truncate">{unit.location}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </Card>
    </div>
  );
}
