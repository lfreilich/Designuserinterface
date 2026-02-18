import { LayoutDashboard, Phone, Signal, Map, History, Users, FileText, Settings } from 'lucide-react';
import { Button } from './ui/button';
import { useLanguage } from '../contexts/LanguageContext';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  const { t } = useLanguage();
  
  const menuItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', section: 'dispatch' },
    { id: 'active_calls', icon: Phone, label: 'Active Calls', section: 'dispatch' },
    { id: 'units_status', icon: Signal, label: 'Units Status', section: 'dispatch' },
    { id: 'live_map', icon: Map, label: 'Live Map', section: 'dispatch' },
    { id: 'personnel', icon: Users, label: 'Personnel', section: 'management' },
    { id: 'reports', icon: FileText, label: 'Reports', section: 'management' },
    { id: 'call_history', icon: History, label: 'Call History', section: 'management' },
    { id: 'configuration', icon: Settings, label: 'Configuration', section: 'management' },
  ];

  return (
    <div className="w-64 bg-[#0047AB] text-white flex flex-col h-full border-r border-[#003380] shadow-xl z-20">
      <div className="flex-1 py-6 space-y-1 px-3">
        <div className="px-3 mb-2 text-xs font-bold text-white/60 uppercase tracking-wider">
          DISPATCH
        </div>
        
        {menuItems.filter(i => i.section === 'dispatch').map(item => (
          <Button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            variant="ghost" 
            className={`w-full justify-start gap-3 text-white hover:bg-white/10 hover:text-white mb-1 font-medium ${
              currentPage === item.id ? 'bg-white/20 text-white shadow-sm' : 'text-white/80'
            }`}
          >
            <item.icon className={`h-5 w-5 ${currentPage === item.id ? 'text-[#FFC107]' : ''}`} />
            {item.label}
          </Button>
        ))}

        <div className="px-3 mt-8 mb-2 text-xs font-bold text-white/60 uppercase tracking-wider">
          MANAGEMENT
        </div>
        
        {menuItems.filter(i => i.section === 'management').map(item => (
          <Button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            variant="ghost" 
            className={`w-full justify-start gap-3 text-white hover:bg-white/10 hover:text-white mb-1 font-medium ${
              currentPage === item.id ? 'bg-white/20 text-white shadow-sm' : 'text-white/80'
            }`}
          >
            <item.icon className={`h-5 w-5 ${currentPage === item.id ? 'text-[#FFC107]' : ''}`} />
            {item.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
