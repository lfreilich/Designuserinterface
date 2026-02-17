import { Card } from './ui/card';
import { Phone, Clock, CheckCircle, AlertCircle, Activity } from 'lucide-react';

interface StatsOverviewProps {
  totalCalls: number;
  activeCalls: number;
  completedCalls: number;
  avgResponseTime: string;
}

export function StatsOverview({ totalCalls, activeCalls, completedCalls, avgResponseTime }: StatsOverviewProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="p-4 bg-white border-l-4 border-[#1E4A9C] shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Total Calls</p>
            <div className="flex items-baseline gap-2 mt-1">
              <p className="text-3xl font-bold text-gray-900">{totalCalls}</p>
              <span className="text-xs font-medium text-green-600 bg-green-50 px-1.5 py-0.5 rounded">+12%</span>
            </div>
          </div>
          <div className="p-3 bg-blue-50 rounded-full">
            <Phone className="h-6 w-6 text-[#1E4A9C]" />
          </div>
        </div>
      </Card>

      <Card className="p-4 bg-white border-l-4 border-[#DC1E2E] shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Active Calls</p>
            <div className="flex items-baseline gap-2 mt-1">
              <p className="text-3xl font-bold text-gray-900">{activeCalls}</p>
              <span className="text-xs font-medium text-red-600 bg-red-50 px-1.5 py-0.5 rounded animate-pulse">Live</span>
            </div>
          </div>
          <div className="p-3 bg-red-50 rounded-full">
            <Activity className="h-6 w-6 text-[#DC1E2E]" />
          </div>
        </div>
      </Card>

      <Card className="p-4 bg-white border-l-4 border-green-500 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Completed</p>
            <div className="flex items-baseline gap-2 mt-1">
              <p className="text-3xl font-bold text-gray-900">{completedCalls}</p>
            </div>
          </div>
          <div className="p-3 bg-green-50 rounded-full">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
        </div>
      </Card>

      <Card className="p-4 bg-white border-l-4 border-[#D4AF37] shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Avg Response</p>
            <div className="flex items-baseline gap-2 mt-1">
              <p className="text-3xl font-bold text-gray-900">{avgResponseTime}</p>
              <span className="text-xs font-medium text-green-600 bg-green-50 px-1.5 py-0.5 rounded">-30s</span>
            </div>
          </div>
          <div className="p-3 bg-yellow-50 rounded-full">
            <Clock className="h-6 w-6 text-[#D4AF37]" />
          </div>
        </div>
      </Card>
    </div>
  );
}
