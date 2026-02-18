import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Bell, Volume2, Monitor, Shield, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import * as api from '../services/api';

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsDialog({ open, onClose }: SettingsDialogProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [sound, setSound] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    if (open) {
      setLoading(true);
      api.getSettings().then((settings) => {
        if (settings) {
          setNotifications(settings.notifications);
          setSound(settings.sound);
          setDarkMode(settings.darkMode);
        }
        setLoading(false);
      });
    }
  }, [open]);

  const handleSave = async () => {
    setSaving(true);
    const success = await api.updateSettings({
      notifications,
      sound,
      darkMode
    });
    setSaving(false);
    
    if (success) {
      toast.success('Settings saved successfully');
      onClose();
    } else {
      toast.error('Failed to save settings');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>System Settings</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-10 text-gray-400">
            <Loader2 className="h-8 w-8 animate-spin mb-2" />
            Loading settings...
          </div>
        ) : (
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="notifications">Alerts</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Monitor className="h-4 w-4 text-gray-500" />
                  <Label htmlFor="dark-mode">Dark Mode</Label>
                </div>
                <Switch id="dark-mode" checked={darkMode} onCheckedChange={setDarkMode} />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Volume2 className="h-4 w-4 text-gray-500" />
                  <Label htmlFor="sound">System Sounds</Label>
                </div>
                <Switch id="sound" checked={sound} onCheckedChange={setSound} />
              </div>
            </TabsContent>

            <TabsContent value="notifications" className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-gray-500" />
                  <Label htmlFor="notifications">Push Notifications</Label>
                </div>
                <Switch id="notifications" checked={notifications} onCheckedChange={setNotifications} />
              </div>
            </TabsContent>

            <TabsContent value="security" className="space-y-4">
              <div className="p-3 bg-yellow-50 rounded-md border border-yellow-200 text-sm text-yellow-800 flex gap-2">
                <Shield className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  Two-Factor Authentication is currently <strong>Enabled</strong> by your administrator.
                </div>
              </div>
              <div className="space-y-2">
                 <Label>Session Timeout</Label>
                 <Input type="number" defaultValue="60" disabled />
                 <p className="text-xs text-muted-foreground">Managed by organization policy</p>
              </div>
            </TabsContent>
          </Tabs>
        )}

        <DialogFooter>
          <Button onClick={handleSave} disabled={loading || saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
