import { Clock, MapPin, Phone, User, Navigation, AlertTriangle, ChevronRight } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';

export interface ActiveCall {
  id: string;
  address: string;
  type: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  caller: string;
  phone: string;
  time: string;
  units: string[];
  status: 'pending' | 'dispatched' | 'en-route' | 'on-scene';
  eta?: string;
}

interface ActiveCallCardProps {
  call: ActiveCall;
  onDispatch?: (id: string) => void;
  onView?: (id: string) => void;
}

const priorityConfig = {
  critical: { color: 'bg-[#DC1E2E]', text: 'CRITICAL', border: 'border-[#DC1E2E]', bg: 'bg-red-50' },
  high: { color: 'bg-orange-500', text: 'HIGH', border: 'border-orange-500', bg: 'bg-orange-50' },
  medium: { color: 'bg-yellow-500', text: 'MEDIUM', border: 'border-yellow-500', bg: 'bg-yellow-50' },
  low: { color: 'bg-green-500', text: 'LOW', border: 'border-green-500', bg: 'bg-green-50' },
};

const statusConfig = {
  pending: { color: 'bg-gray-500', text: 'PENDING' },
  dispatched: { color: 'bg-[#D4AF37]', text: 'DISPATCHED' },
  'en-route': { color: 'bg-[#1E4A9C]', text: 'EN ROUTE' },
  'on-scene': { color: 'bg-green-600', text: 'ON SCENE' },
};

export function ActiveCallCard({ call, onDispatch, onView }: ActiveCallCardProps) {
  const config = priorityConfig[call.priority];
  const status = statusConfig[call.status];

  return (
    <Card className={`overflow-hidden border-l-[6px] shadow-sm hover:shadow-md transition-all group ${config.border}`}>
      <div className="p-4 space-y-3">
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge className={`${config.color} text-white hover:${config.color} font-bold tracking-wider`}>
              {config.text}
            </Badge>
            <span className="text-xs font-mono text-muted-foreground">#{call.id}</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
            <Clock className="h-3.5 w-3.5" />
            {call.time}
          </div>
        </div>

        {/* Main Info */}
        <div>
          <h3 className="text-lg font-bold text-gray-900 leading-tight flex items-start justify-between">
            {call.type}
            <Badge variant="outline" className={`${status.color} text-white border-none font-semibold text-[10px] tracking-wide`}>
              {status.text}
            </Badge>
          </h3>
          <div className="flex items-start gap-2 mt-2 text-gray-700">
            <MapPin className="h-5 w-5 text-[#DC1E2E] shrink-0 mt-0.5" />
            <p className="text-base font-medium leading-snug">{call.address}</p>
          </div>
        </div>

        <Separator className="bg-gray-100" />

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-y-2 text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <User className="h-4 w-4 text-[#1E4A9C]" />
            <span className="truncate">{call.caller}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <Phone className="h-4 w-4 text-[#1E4A9C]" />
            <span dir="ltr" className="font-mono">{call.phone}</span>
          </div>
          {call.eta && (
            <div className="col-span-2 flex items-center gap-2 text-[#D4AF37] font-medium bg-yellow-50 px-2 py-1 rounded w-fit mt-1">
              <Clock className="h-4 w-4" />
              <span>ETA: {call.eta}</span>
            </div>
          )}
        </div>

        {/* Footer / Actions */}
        <div className="pt-2 flex items-center justify-between gap-3">
          {call.units.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 flex-1">
              <span className="text-xs font-medium text-muted-foreground self-center mr-1">Units:</span>
              {call.units.map((unit) => (
                <Badge key={unit} variant="secondary" className="bg-[#1E4A9C]/10 text-[#1E4A9C] border border-[#1E4A9C]/20 hover:bg-[#1E4A9C]/20">
                  {unit}
                </Badge>
              ))}
            </div>
          ) : (
             <div className="flex-1 text-sm text-gray-400 italic">No units assigned</div>
          )}

          <div className="flex gap-2 shrink-0">
             {call.status === 'pending' && (
              <Button 
                onClick={() => onDispatch?.(call.id)}
                size="sm"
                className="bg-[#DC1E2E] hover:bg-[#B01825] text-white shadow-sm"
              >
                <Navigation className="h-3.5 w-3.5 mr-1.5" />
                Dispatch
              </Button>
            )}
            <Button 
              onClick={() => onView?.(call.id)}
              variant="ghost"
              size="sm"
              className="text-gray-500 hover:text-[#1E4A9C] hover:bg-blue-50"
            >
              Details
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
