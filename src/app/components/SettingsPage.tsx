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
import { Save, Loader2, Shield, Map as MapIcon, Globe, MessageSquare, Mail, Radio, Phone, Inbox } from 'lucide-react';
import * as api from '../services/api';

export function SettingsPage() {
  const { t, language } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testingImap, setTestingImap] = useState(false);
  const [testingOpenAI, setTestingOpenAI] = useState(false);
  const [testingMaps, setTestingMaps] = useState(false);
  const [testingResend, setTestingResend] = useState(false);
  const [testingWalkieFleet, setTestingWalkieFleet] = useState(false);
  const [testingFreePBX, setTestingFreePBX] = useState(false);
  
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
      resend: ''
    },
    dispatch: {
      autoDispatch: false,
      priorityThreshold: 'critical',
      maxUnitsPerCall: 3
    },
    walkieFleet: {
      serverUrl: '',
      username: '',
      password: '',
      enabled: false
    },
    freePBX: {
      serverUrl: '',
      extension: '',
      secret: '',
      enabled: false
    },
    imap: {
      host: '',
      port: 993,
      user: '',
      password: '',
      tls: true,
      enabled: false
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
          dispatch: { ...prev.dispatch, ...data.dispatch },
          walkieFleet: { ...prev.walkieFleet, ...data.walkieFleet },
          freePBX: { ...prev.freePBX, ...data.freePBX },
          imap: { ...prev.imap, ...data.imap }
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

  const handleTestImap = async () => {
    setTestingImap(true);
    try {
      const result = await api.testImapConnection(config.imap);
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Connection test failed');
    } finally {
      setTestingImap(false);
    }
  };

  const handleTestOpenAI = async () => {
    setTestingOpenAI(true);
    try {
      const result = await api.testOpenAI(config.apiKeys.openai);
      if (result.success) toast.success(result.message); else toast.error(result.message);
    } catch { toast.error('Test failed'); } finally { setTestingOpenAI(false); }
  };

  const handleTestMaps = async () => {
    setTestingMaps(true);
    try {
      const result = await api.testMaps(config.apiKeys.googleMaps);
      if (result.success) toast.success(result.message); else toast.error(result.message);
    } catch { toast.error('Test failed'); } finally { setTestingMaps(false); }
  };

  const handleTestResend = async () => {
    setTestingResend(true);
    try {
      const result = await api.testResend(config.apiKeys.resend);
      if (result.success) toast.success(result.message); else toast.error(result.message);
    } catch { toast.error('Test failed'); } finally { setTestingResend(false); }
  };

  const handleTestWalkieFleet = async () => {
    setTestingWalkieFleet(true);
    try {
      const result = await api.testWalkieFleet(config.walkieFleet);
      if (result.success) toast.success(result.message); else toast.error(result.message);
    } catch { toast.error('Test failed'); } finally { setTestingWalkieFleet(false); }
  };

  const handleTestFreePBX = async () => {
    setTestingFreePBX(true);
    try {
      const { serverUrl, extension, secret } = config.freePBX;
      
      if (!serverUrl || !extension || !secret) {
        toast.error('Missing FreePBX configuration');
        return;
      }

      // Check for UserAgent availability
      if (typeof window === 'undefined') {
        toast.error('Test must run in browser');
        return;
      }

      // Pre-check WebSocket connectivity with a native WebSocket to diagnose certificate issues
      try {
        console.log(`Pre-checking WebSocket connection to ${serverUrl}`);
        await new Promise<void>((resolve, reject) => {
            const socket = new WebSocket(serverUrl, 'sip'); // Try 'sip' subprotocol as most PBX support it
            
            const timer = setTimeout(() => {
                socket.close();
                reject(new Error('Timeout connecting to WebSocket'));
            }, 5000);

            socket.onopen = () => {
                clearTimeout(timer);
                socket.close();
                resolve();
            };

            socket.onerror = (e) => {
                // WebSocket errors are generic in JS, rely on onclose code
                // console.warn("WebSocket pre-check error", e);
            };

            socket.onclose = (e) => {
                clearTimeout(timer);
                if (e.code === 1006) {
                    reject(new Error('WebSocket closed abnormally (Code 1006). This usually indicates a certificate error.'));
                } else if (e.code !== 1000 && e.code !== 1005) { // 1000/1005 are normal closures
                    reject(new Error(`WebSocket closed with code ${e.code}`));
                }
            };
        });
        toast.success('Server reachable via WebSocket');
      } catch (wsError) {
          // console.error("WebSocket pre-check failed:", wsError);
          const isCertError = wsError.message?.includes('1006') || wsError.message?.includes('certificate');
          
          if (isCertError) {
              const checkUrl = serverUrl.replace('wss://', 'https://').replace('ws://', 'http://');
              toast.error(
                  <div className="flex flex-col gap-2">
                      <span className="font-semibold">Connection Failed (Certificate Issue)</span>
                      <span className="text-xs">Your browser blocked the connection to {serverUrl}. Open the URL below in a new tab and accept the certificate, then try again.</span>
                      <Button 
                          variant="destructive" 
                          size="sm" 
                          className="w-full mt-1"
                          onClick={() => window.open(checkUrl, '_blank')}
                      >
                          Check Certificate
                      </Button>
                  </div>,
                  { duration: 10000 }
              );
              return; // Stop execution here
          } else {
             console.error("WebSocket pre-check failed:", wsError);
             toast.error(`Connection failed: ${wsError.message}`);
             return; // Stop execution here
          }
      }
      
      const sip = await import('sip.js');
      const { UserAgent } = sip;

      // Parse domain from WSS URL or assume from input
      // WSS: wss://bandtelecom.org:6443/sipws
      // Domain likely: bandtelecom.org
      let domain = serverUrl.replace('wss://', '').replace('ws://', '').split('/')[0].split(':')[0];
      
      // If extension includes domain (e.g. sip:999@bandtelecom.org) use that
      let user = extension;
      if (extension.includes('@')) {
        const parts = extension.replace('sip:', '').split('@');
        user = parts[0];
        domain = parts[1];
      }

      const uriStr = `sip:${user}@${domain}`;
      const uri = UserAgent.makeURI(uriStr);
      
      if (!uri) {
        toast.error('Invalid SIP URI construction');
        return;
      }

      console.log(`Testing SIP connection to ${serverUrl} as ${uriStr}`);

      const userAgent = new UserAgent({
        uri,
        transportOptions: {
          server: serverUrl,
          connectionTimeout: 5,
        },
        authorizationUsername: user,
        authorizationPassword: secret,
        register: false, // We just want to test transport connectivity first
        logLevel: 'error'
      });
      
      try {
          // Pre-check succeeded, now try SIP registration
          await userAgent.start(); // This attempts to connect transport
          
          if (userAgent.transport.isConnected()) {
              toast.success(`SIP Transport Connected (${domain})`);
              await userAgent.stop();
          } else {
              throw new Error('Could not establish transport connection');
          }
      } catch (wsError) {
          console.error("SIP Transport failed:", wsError);
          // We already pre-checked for certificate issues, so this is likely a SIP protocol issue or timeout
          toast.error(`SIP Connection failed: ${wsError.message}`);
          try { await userAgent.stop(); } catch {}
      }

    } catch (error) {
      console.error('SIP Test Error:', error);
      toast.error('Connection failed: ' + (error.message || 'Unknown error'));
    } finally {
      setTestingFreePBX(false);
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
                  <Button 
                    onClick={handleTestOpenAI} 
                    disabled={testingOpenAI || !config.apiKeys.openai}
                    variant="secondary"
                    size="sm"
                    className="mt-2"
                  >
                    {testingOpenAI ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Shield className="h-4 w-4 mr-2" />}
                    Test OpenAI Key
                  </Button>
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
                  <Button 
                    onClick={handleTestMaps} 
                    disabled={testingMaps || !config.apiKeys.googleMaps}
                    variant="secondary"
                    size="sm"
                    className="mt-2"
                  >
                    {testingMaps ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <MapIcon className="h-4 w-4 mr-2" />}
                    Test Maps Key
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-2">
                  <Mail className="h-5 w-5 text-purple-500" />
                  <h3 className="font-medium">Email Gateway (Resend)</h3>
                </div>
                <div className="grid gap-2 pl-7">
                  <Label htmlFor="resend_key">API Key</Label>
                  <Input 
                    id="resend_key" 
                    type="password"
                    placeholder="re_..." 
                    value={config.apiKeys.resend}
                    onChange={(e) => handleChange('apiKeys', 'resend', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Used for sending verification codes and system alerts via email.</p>
                  <Button 
                    onClick={handleTestResend} 
                    disabled={testingResend || !config.apiKeys.resend}
                    variant="secondary"
                    size="sm"
                    className="mt-2"
                  >
                    {testingResend ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
                    Test Resend Key
                  </Button>
                </div>
              </div>

              {/* IMAP Integration */}
              <div className="space-y-4 pt-6 border-t">
                <div className="flex items-center gap-2 mb-2">
                  <Inbox className="h-5 w-5 text-teal-500" />
                  <h3 className="font-medium">Email Monitoring (IMAP)</h3>
                </div>
                <div className="grid gap-4 pl-7">
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="imap_enabled" 
                      checked={config.imap?.enabled || false}
                      onCheckedChange={(c) => handleChange('imap', 'enabled', c)}
                    />
                    <Label htmlFor="imap_enabled">Enable Email Monitoring</Label>
                  </div>

                  {config.imap?.enabled && (
                    <div className="grid gap-3 p-4 bg-muted/50 rounded-lg">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="grid gap-1.5">
                          <Label htmlFor="imap_host">IMAP Host</Label>
                          <Input 
                            id="imap_host" 
                            placeholder="imap.gmail.com" 
                            value={config.imap.host || ''}
                            onChange={(e) => handleChange('imap', 'host', e.target.value)}
                          />
                        </div>
                        <div className="grid gap-1.5">
                          <Label htmlFor="imap_port">Port</Label>
                          <Input 
                            id="imap_port" 
                            type="number"
                            placeholder="993"
                            value={config.imap.port || 993}
                            onChange={(e) => handleChange('imap', 'port', parseInt(e.target.value))}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="grid gap-1.5">
                          <Label htmlFor="imap_user">Username</Label>
                          <Input 
                            id="imap_user" 
                            placeholder="dispatcher@domain.com" 
                            value={config.imap.user || ''}
                            onChange={(e) => handleChange('imap', 'user', e.target.value)}
                          />
                        </div>
                        <div className="grid gap-1.5">
                          <Label htmlFor="imap_pass">Password</Label>
                          <Input 
                            id="imap_pass" 
                            type="password"
                            placeholder="••••••"
                            value={config.imap.password || ''}
                            onChange={(e) => handleChange('imap', 'password', e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 pt-1">
                        <Switch 
                          id="imap_tls" 
                          checked={config.imap.tls !== false} // Default to true
                          onCheckedChange={(c) => handleChange('imap', 'tls', c)}
                        />
                        <Label htmlFor="imap_tls" className="text-sm font-normal">Use TLS/SSL</Label>
                      </div>
                      
                      <Button 
                        onClick={handleTestImap} 
                        disabled={testingImap || !config.imap.host || !config.imap.user}
                        variant="secondary"
                        size="sm"
                        className="mt-2 w-full sm:w-auto"
                      >
                        {testingImap ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Inbox className="h-4 w-4 mr-2" />}
                        Test IMAP Connection
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* WalkieFleet Integration */}
              <div className="space-y-4 pt-6 border-t">
                <div className="flex items-center gap-2 mb-2">
                  <Radio className="h-5 w-5 text-orange-500" />
                  <h3 className="font-medium">Radio Integration (WalkieFleet)</h3>
                </div>
                <div className="grid gap-4 pl-7">
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="wf_enabled" 
                      checked={config.walkieFleet?.enabled || false}
                      onCheckedChange={(c) => handleChange('walkieFleet', 'enabled', c)}
                    />
                    <Label htmlFor="wf_enabled">Enable WalkieFleet Integration</Label>
                  </div>
                  
                  {config.walkieFleet?.enabled && (
                    <div className="grid gap-3 p-4 bg-muted/50 rounded-lg">
                      <div className="grid gap-1.5">
                        <Label htmlFor="wf_url">Server URL</Label>
                        <Input 
                          id="wf_url" 
                          placeholder="https://server.walkiefleet.com" 
                          value={config.walkieFleet.serverUrl || ''}
                          onChange={(e) => handleChange('walkieFleet', 'serverUrl', e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">Enter the base URL of your WalkieFleet server (must start with http:// or https://).</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="grid gap-1.5">
                          <Label htmlFor="wf_user">Username</Label>
                          <Input 
                            id="wf_user" 
                            placeholder="dispatcher_01" 
                            value={config.walkieFleet.username || ''}
                            onChange={(e) => handleChange('walkieFleet', 'username', e.target.value)}
                          />
                        </div>
                        <div className="grid gap-1.5">
                          <Label htmlFor="wf_pass">Password</Label>
                          <Input 
                            id="wf_pass" 
                            type="password"
                            placeholder="••••••"
                            value={config.walkieFleet.password || ''}
                            onChange={(e) => handleChange('walkieFleet', 'password', e.target.value)}
                          />
                        </div>
                      </div>
                      <Button 
                        onClick={handleTestWalkieFleet} 
                        disabled={testingWalkieFleet || !config.walkieFleet.serverUrl || !config.walkieFleet.username}
                        variant="secondary"
                        size="sm"
                        className="mt-2 w-full sm:w-auto"
                      >
                        {testingWalkieFleet ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Radio className="h-4 w-4 mr-2" />}
                        Test WalkieFleet Connection
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* FreePBX Integration */}
              <div className="space-y-4 pt-6 border-t">
                <div className="flex items-center gap-2 mb-2">
                  <Phone className="h-5 w-5 text-indigo-500" />
                  <h3 className="font-medium">Telephony (FreePBX)</h3>
                </div>
                <div className="grid gap-4 pl-7">
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="fpbx_enabled" 
                      checked={config.freePBX?.enabled || false}
                      onCheckedChange={(c) => handleChange('freePBX', 'enabled', c)}
                    />
                    <Label htmlFor="fpbx_enabled">Enable FreePBX Integration</Label>
                  </div>

                  {config.freePBX?.enabled && (
                    <div className="grid gap-3 p-4 bg-muted/50 rounded-lg">
                      <div className="grid gap-1.5">
                        <Label htmlFor="fpbx_url">Asterisk WSS URL</Label>
                        <Input 
                          id="fpbx_url" 
                          placeholder="wss://bandtelecom.org:6443/ws" 
                          value={config.freePBX.serverUrl || ''}
                          onChange={(e) => handleChange('freePBX', 'serverUrl', e.target.value)}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="grid gap-1.5">
                          <Label htmlFor="fpbx_ext">SIP User / Extension</Label>
                          <Input 
                            id="fpbx_ext" 
                            placeholder="999" 
                            value={config.freePBX.extension || ''}
                            onChange={(e) => handleChange('freePBX', 'extension', e.target.value)}
                          />
                        </div>
                        <div className="grid gap-1.5">
                          <Label htmlFor="fpbx_sec">Password / Secret</Label>
                          <Input 
                            id="fpbx_sec" 
                            type="password"
                            placeholder="Hatzbs..." 
                            value={config.freePBX.secret || ''}
                            onChange={(e) => handleChange('freePBX', 'secret', e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950 p-2 rounded mt-2">
                          <p><strong>Note:</strong> If you see "WebSocket closed abnormally (Code 1006)", it means your browser does not trust the certificate. Click "Check Certificate" in the error toast.</p>
                      </div>
                      <Button 
                        onClick={handleTestFreePBX} 
                        disabled={testingFreePBX || !config.freePBX.serverUrl}
                        variant="secondary"
                        size="sm"
                        className="mt-2 w-full sm:w-auto"
                      >
                        {testingFreePBX ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Phone className="h-4 w-4 mr-2" />}
                        Test FreePBX Connection
                      </Button>
                    </div>
                  )}
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
