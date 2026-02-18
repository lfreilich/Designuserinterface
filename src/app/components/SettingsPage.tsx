import { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Switch } from './ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner';
import { Save, Loader2, Shield, Map as MapIcon, Globe, MessageSquare } from 'lucide-react';
import * as api from '../services/api';

export function SettingsPage() {
  const { t, language } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [config, setConfig] = useState({
    general: {
      centerName: 'Hatzala Beit Shemesh',
      defaultLanguage: 'en',
      theme: 'system',
      refreshRate: 5
    },
    apiKeys: {
      openai: '',
      googleMaps: '',
      twilio: ''
    },
    dispatch: {
      autoDispatch: false,
      priorityThreshold: 'critical',
      maxUnitsPerCall: 3
    }
  });

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const data = await api.getConfig();
      if (data && Object.keys(data).length > 0) {
        // Merge with defaults to ensure structure
        setConfig(prev => ({
          ...prev,
          ...data,
          general: { ...prev.general, ...data.general },
          apiKeys: { ...prev.apiKeys, ...data.apiKeys },
          dispatch: { ...prev.dispatch, ...data.dispatch }
        }));
      }
    } catch (error) {
      console.error('Failed to load config:', error);
      toast.error('Failed to load configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.saveConfig(config);
      toast.success('Configuration saved successfully');
    } catch (error) {
      console.error('Failed to save config:', error);
      toast.error('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (section: keyof typeof config, field: string, value: any) => {
    setConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">System Configuration</h2>
          <p className="text-muted-foreground">Manage system settings, API keys, and integrations.</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Changes
        </Button>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="dispatch">Dispatch Logic</TabsTrigger>
        </TabsList>
        
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>
                Configure basic display and localization settings for the dispatch console.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="centerName">Dispatch Center Name</Label>
                <Input 
                  id="centerName" 
                  value={config.general.centerName} 
                  onChange={(e) => handleChange('general', 'centerName', e.target.value)}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="language">Default Language</Label>
                  <Select 
                    value={config.general.defaultLanguage} 
                    onValueChange={(val) => handleChange('general', 'defaultLanguage', val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English (US)</SelectItem>
                      <SelectItem value="he">Hebrew (IL)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="refreshRate">Data Refresh Rate (seconds)</Label>
                  <Input 
                    id="refreshRate" 
                    type="number" 
                    min={1} 
                    max={60}
                    value={config.general.refreshRate}
                    onChange={(e) => handleChange('general', 'refreshRate', parseInt(e.target.value))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="integrations">
          <Card>
            <CardHeader>
              <CardTitle>API Integrations</CardTitle>
              <CardDescription>
                Manage API keys for external services. These keys are stored securely in the database.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="h-5 w-5 text-blue-500" />
                  <h3 className="font-medium">AI Services (OpenAI)</h3>
                </div>
                <div className="grid gap-2 pl-7">
                  <Label htmlFor="openai_key">API Key</Label>
                  <Input 
                    id="openai_key" 
                    type="password"
                    placeholder="sk-..." 
                    value={config.apiKeys.openai}
                    onChange={(e) => handleChange('apiKeys', 'openai', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Used for "Silent Listener" transcription and intent analysis.</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-2">
                  <MapIcon className="h-5 w-5 text-green-500" />
                  <h3 className="font-medium">Mapping (Google Maps / Mapbox)</h3>
                </div>
                <div className="grid gap-2 pl-7">
                  <Label htmlFor="maps_key">API Key</Label>
                  <Input 
                    id="maps_key" 
                    type="password"
                    placeholder="Enter API key" 
                    value={config.apiKeys.googleMaps}
                    onChange={(e) => handleChange('apiKeys', 'googleMaps', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Required for geocoding, routing, and map tiles.</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-5 w-5 text-purple-500" />
                  <h3 className="font-medium">SMS Gateway (Twilio)</h3>
                </div>
                <div className="grid gap-2 pl-7">
                  <Label htmlFor="twilio_key">Auth Token / API Key</Label>
                  <Input 
                    id="twilio_key" 
                    type="password"
                    placeholder="Enter token" 
                    value={config.apiKeys.twilio}
                    onChange={(e) => handleChange('apiKeys', 'twilio', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="dispatch">
           <Card>
            <CardHeader>
              <CardTitle>Dispatch Automation</CardTitle>
              <CardDescription>
                Configure rules for automated dispatch recommendations.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between space-x-2">
                <Label htmlFor="auto-dispatch" className="flex flex-col space-y-1">
                  <span>Enable Auto-Dispatch Recommendations</span>
                  <span className="font-normal text-xs text-muted-foreground">
                    Automatically suggest units based on proximity and capability.
                  </span>
                </Label>
                <Switch 
                  id="auto-dispatch" 
                  checked={config.dispatch.autoDispatch}
                  onCheckedChange={(checked) => handleChange('dispatch', 'autoDispatch', checked)}
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="priority">Auto-Dispatch Priority Threshold</Label>
                <Select 
                  value={config.dispatch.priorityThreshold}
                  onValueChange={(val) => handleChange('dispatch', 'priorityThreshold', val)}
                >
                   <SelectTrigger>
                      <SelectValue />
                   </SelectTrigger>
                   <SelectContent>
                      <SelectItem value="critical">Critical Only</SelectItem>
                      <SelectItem value="high">High & Critical</SelectItem>
                      <SelectItem value="medium">All Priorities</SelectItem>
                   </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="maxUnits">Max Units to Recommend</Label>
                <Input 
                    id="maxUnits" 
                    type="number" 
                    min={1} 
                    max={10}
                    value={config.dispatch.maxUnitsPerCall}
                    onChange={(e) => handleChange('dispatch', 'maxUnitsPerCall', parseInt(e.target.value))}
                  />
              </div>
            </CardContent>
           </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
