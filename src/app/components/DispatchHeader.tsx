import { useState } from 'react';
import { Bell, Settings, User, Globe } from 'lucide-react';
import { Button } from './ui/button';
import { useLanguage } from '../contexts/LanguageContext';
import hatzalaLogo from 'figma:asset/dc8e251968d56ddb4b8ec86487edfb8a9cc43a4e.png';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu"
import { SettingsDialog } from './SettingsDialog';
import { UserProfileDialog } from './UserProfileDialog';
import { NotificationsDialog } from './NotificationsDialog';

export function DispatchHeader() {
  const { language, setLanguage } = useLanguage();
  const [showSettings, setShowSettings] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <header className="bg-[#1E4A9C] text-white shadow-lg">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-4">
          <img 
            src={hatzalaLogo} 
            alt="Hatzala Beit Shemesh" 
            className="h-16 w-16 object-contain"
          />
          <div>
            <h1 className="text-white">Hatzala Beit Shemesh</h1>
            <p className="text-sm text-white/80">Emergency Dispatch System</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm"
                className="text-white hover:bg-white/10 gap-2 px-3"
              >
                <Globe className="h-4 w-4" />
                <span className="uppercase">{language}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setLanguage('en')}>
                🇺🇸 English
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLanguage('he')}>
                🇮🇱 עברית
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button 
            variant="ghost" 
            size="icon"
            className="text-white hover:bg-white/10"
            onClick={() => setShowNotifications(true)}
            title="Notifications"
          >
            <Bell className="h-5 w-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon"
            className="text-white hover:bg-white/10"
            onClick={() => setShowSettings(true)}
            title="Settings"
          >
            <Settings className="h-5 w-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon"
            className="text-white hover:bg-white/10"
            onClick={() => setShowProfile(true)}
            title="User Profile"
          >
            <User className="h-5 w-5" />
          </Button>
        </div>
      </div>
      
      <SettingsDialog open={showSettings} onClose={() => setShowSettings(false)} />
      <UserProfileDialog open={showProfile} onClose={() => setShowProfile(false)} />
      <NotificationsDialog open={showNotifications} onClose={() => setShowNotifications(false)} />
    </header>
  );
}
