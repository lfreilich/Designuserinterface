import { LayoutDashboard, Radio, Phone, Map, History, Settings, Users, FileText } from 'lucide-react';
import { Button } from './ui/button';
import { useLanguage } from '../contexts/LanguageContext';

export function Sidebar() {
  const { t } = useLanguage();
  
  return (
    <div className="w-64 bg-[#1E4A9C] text-white flex flex-col h-[calc(100vh-64px)] border-r border-[#1a4088]">
      <div className="flex-1 py-6 space-y-2 px-3">
        <div className="px-3 mb-2 text-xs font-semibold text-white/50 uppercase tracking-wider">
          {t('dispatch_section')}
        </div>
        <Button variant="ghost" className="w-full justify-start gap-3 text-white hover:bg-white/10 hover:text-white bg-white/10">
          <LayoutDashboard className="h-5 w-5 text-[#D4AF37]" />
          {t('dashboard')}
        </Button>
        <Button variant="ghost" className="w-full justify-start gap-3 text-white hover:bg-white/10 hover:text-white">
          <Phone className="h-5 w-5" />
          {t('active_calls_menu')}
        </Button>
        <Button variant="ghost" className="w-full justify-start gap-3 text-white hover:bg-white/10 hover:text-white">
          <Radio className="h-5 w-5" />
          {t('units_status_menu')}
        </Button>
        <Button variant="ghost" className="w-full justify-start gap-3 text-white hover:bg-white/10 hover:text-white">
          <Map className="h-5 w-5" />
          {t('live_map_menu')}
        </Button>

        <div className="px-3 mt-8 mb-2 text-xs font-semibold text-white/50 uppercase tracking-wider">
          {t('management_section')}
        </div>
        <Button variant="ghost" className="w-full justify-start gap-3 text-white hover:bg-white/10 hover:text-white">
          <Users className="h-5 w-5" />
          {t('personnel_menu')}
        </Button>
        <Button variant="ghost" className="w-full justify-start gap-3 text-white hover:bg-white/10 hover:text-white">
          <FileText className="h-5 w-5" />
          {t('reports_menu')}
        </Button>
        <Button variant="ghost" className="w-full justify-start gap-3 text-white hover:bg-white/10 hover:text-white">
          <History className="h-5 w-5" />
          {t('call_history_menu')}
        </Button>
      </div>

      <div className="p-4 border-t border-[#1a4088]">
        <Button variant="ghost" className="w-full justify-start gap-3 text-white hover:bg-white/10 hover:text-white">
          <Settings className="h-5 w-5" />
          {t('system_settings_menu')}
        </Button>
      </div>
    </div>
  );
}
