import { useState, useEffect, useRef } from 'react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Phone, PhoneOff, Mic, MicOff, Pause, Play, History, Users, MessageSquare, RefreshCw, Wifi, WifiOff, Power, PhoneIncoming, AlertTriangle, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { UserAgent, Registerer, Inviter, SessionState, UserAgentOptions, Invitation } from 'sip.js';
import * as api from '../services/api';

interface Call {
  id: string;
  number: string;
  name?: string;
  duration: number; // in seconds
  status: 'active' | 'held' | 'ended' | 'ringing';
  type: 'inbound' | 'outbound';
  timestamp: Date;
}

export function FreePBXSoftphone() {
  const [activeCall, setActiveCall] = useState<Call | null>(null);
  const [incomingCall, setIncomingCall] = useState<{ session: Invitation, number: string, name: string } | null>(null);
  const [dialNumber, setDialNumber] = useState('');
  const [history, setHistory] = useState<Call[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isHeld, setIsHeld] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [lastError, setLastError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  
  // SIP References
  const userAgentRef = useRef<UserAgent | null>(null);
  const registererRef = useRef<Registerer | null>(null);
  const sessionRef = useRef<any>(null); // Inviter | Invitation
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Load config on mount
  const [config, setConfig] = useState<api.BackendConfig['freePBX'] | null>(null);

  useEffect(() => {
    api.getConfig().then(c => {
      if (c && c.freePBX) setConfig(c.freePBX);
    });

    return () => {
      if (userAgentRef.current) {
        userAgentRef.current.stop();
      }
    };
  }, []);

  // Timer for active call
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeCall && activeCall.status === 'active') {
      interval = setInterval(() => {
        setActiveCall(prev => prev ? { ...prev, duration: prev.duration + 1 } : null);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeCall?.status]);

  // Removed passive permission check via navigator.permissions.query because it can return 
  // 'denied' incorrectly in sandboxed iframes or specific browser contexts, leading to false positive UI errors.
  // We will rely strictly on getUserMedia failing or succeeding when the action is taken.

  // Helper to create a silent audio stream for fallback
  const createSilentStream = async (): Promise<MediaStream | null> => {
    try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return null;
        
        const ctx = new AudioContext();
        if (ctx.state === 'suspended') {
            await ctx.resume();
        }
        
        const oscillator = ctx.createOscillator();
        const dst = ctx.createMediaStreamDestination();
        const gain = ctx.createGain();
        gain.gain.value = 0; // Mute it
        oscillator.connect(gain);
        gain.connect(dst);
        oscillator.start();
        
        // Track must be enabled for WebRTC to pick it up
        const track = dst.stream.getAudioTracks()[0];
        track.enabled = true;
        
        // Mock a label so we know it's silent
        Object.defineProperty(track, 'label', { value: 'SilentFallbackStream' });
        
        return dst.stream;
    } catch (e) {
        console.error("Failed to create silent stream:", e);
        return null;
    }
  };

  // Helper to get media stream safely
  const getAudioStream = async (): Promise<MediaStream | null> => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast.error("Audio API not supported", { description: "Falling back to Listen Only mode." });
        return await createSilentStream();
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setPermissionDenied(false);
      return stream;
    } catch (err) {
      console.error("Media Error:", err.name, err.message);
      
      let errorDesc = "Could not access audio device.";
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setPermissionDenied(true);
          errorDesc = "Microphone access blocked. Switching to Listen Only mode.";
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          errorDesc = "No microphone found. Switching to Listen Only mode.";
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
           errorDesc = "Microphone busy. Switching to Listen Only mode.";
      }
      
      toast.warning("Audio Issue", { description: errorDesc });
      
      // Return a silent stream so the call can proceed
      return await createSilentStream();
    }
  };

  const handleDial = (num: string) => {
    setDialNumber(prev => prev + num);
  };

  const handleConnect = async () => {
    setConnectionStatus('connecting');
    setLastError(null);
    toast.info('Fetching configuration...');
    
    // Fetch latest config
    const fullConfig = await api.getConfig();
    const pbxConfig = fullConfig?.freePBX;
    
    if (pbxConfig) {
        setConfig(pbxConfig);
        connect(pbxConfig);
    } else {
        toast.error('Could not load configuration');
        setConnectionStatus('error');
    }
  };

  const connect = async (currentConfig: api.BackendConfig['freePBX']) => {
    if (!currentConfig || !currentConfig.enabled) {
      toast.error('Softphone not configured', { description: 'Please check settings' });
      setConnectionStatus('disconnected');
      return;
    }

    let serverUrl = currentConfig.serverUrl;
    
    // Auto-fix common URL issue
    if (serverUrl.includes('bandtelecom.org') && serverUrl.endsWith('/sipws')) {
        serverUrl = serverUrl.replace('/sipws', '/ws');
        console.log('Corrected SIP URL to use /ws endpoint');
        toast.info('Corrected server URL', { description: 'Switched /sipws to /ws automatically' });
    }

    if (!serverUrl.startsWith('wss://')) {
        toast.error('Invalid Protocol', { description: 'Server URL must start with wss://' });
        setConnectionStatus('error');
        return;
    }

    // 1. Pre-flight Check (Soft Fail)
    toast.info('Checking network...', { description: serverUrl });
    try {
        await new Promise<void>((resolve, reject) => {
            const socket = new WebSocket(serverUrl, 'sip');
            const timer = setTimeout(() => {
                 socket.close();
                 reject(new Error('WebSocket Timeout. Check firewall/network.'));
            }, 10000); // Increased to 10s
            socket.onopen = () => {
                clearTimeout(timer);
                socket.close();
                resolve();
            };
            socket.onerror = (e) => {
                 // Try to guess error
                 reject(new Error('WebSocket connection failed.'));
            };
            socket.onclose = (e) => {
                if (e.code === 1006) {
                    reject(new Error('Certificate Error or Connection Refused (1006).'));
                }
            };
        });
    } catch (wsError) {
        console.error("WebSocket Pre-flight failed:", wsError);
        // Do not block. Just warn.
        toast.warning('Network Check Failed', { 
            description: 'Attempting to connect anyway...',
            duration: 5000
        });
    }

    toast.info('Connecting to PBX...');

    try {
      // Extract domain: wss://domain.com:port/path -> domain.com
      const domain = serverUrl.replace('wss://', '').split(':')[0].split('/')[0];
      const uri = UserAgent.makeURI(`sip:${currentConfig.extension}@${domain}`);
      
      if (!uri) throw new Error('Invalid URI construction');

      const options: UserAgentOptions = {
        uri,
        transportOptions: {
          server: serverUrl,
          keepAliveInterval: 15, // Send keep-alive every 15 seconds
        },
        authorizationUsername: currentConfig.extension,
        authorizationPassword: currentConfig.secret,
        delegate: {
          onConnect: () => {
            setConnectionStatus('connected');
            toast.success('Connected to Server');
            setLastError(null);
          },
          onDisconnect: (error) => {
            setConnectionStatus('disconnected');
            if (error) {
                toast.error('Disconnected with error', { description: error.message });
                setLastError(error.message);
            } else {
                toast.info('Disconnected');
            }
          },
          onInvite: (invitation) => {
             console.log('Incoming invitation:', invitation);
             const remoteNum = invitation.remoteIdentity.uri.user;
             const remoteName = invitation.remoteIdentity.displayName || remoteNum;
             
             setIncomingCall({
                 session: invitation,
                 number: remoteNum,
                 name: remoteName
             });
             
             // Play ringtone if possible
             try {
                 const ringAudio = new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.m4a'); // Generic phone ring
                 ringAudio.loop = true;
                 ringAudio.play().catch(e => console.log('Autoplay blocked for ringtone', e));
                 (invitation as any)._ringAudio = ringAudio;
             } catch (e) {}

             toast.info('Incoming Call', { description: `From ${remoteName}` });
             
             invitation.stateChange.addListener((state) => {
                 if (state === SessionState.Terminated) {
                     setIncomingCall(null);
                     if ((invitation as any)._ringAudio) {
                         (invitation as any)._ringAudio.pause();
                     }
                 }
             });
          }
        }
      };

      const ua = new UserAgent(options);
      userAgentRef.current = ua;

      await ua.start();
      
      const registerer = new Registerer(ua);
      registererRef.current = registerer;
      
      registerer.stateChange.addListener((state) => {
          switch(state) {
              case 'Registered':
                  setConnectionStatus('connected');
                  toast.success('Extension Registered');
                  break;
              case 'Unregistered':
                  setConnectionStatus('disconnected');
                  break;
              case 'Terminated':
                  setConnectionStatus('disconnected');
                  break;
          }
      });

      await registerer.register();

    } catch (error) {
      console.error('SIP Error:', error);
      setConnectionStatus('error');
      setLastError(error.message || 'SIP Registration Failed');
      toast.error('Connection Failed', { description: error.message || 'Check console for details' });
    }
  };

  const handleDisconnect = async () => {
    if (registererRef.current) {
        await registererRef.current.unregister();
    }
    if (userAgentRef.current) {
        await userAgentRef.current.stop();
    }
    setConnectionStatus('disconnected');
    setIncomingCall(null);
    if (activeCall) endCall();
  };

  const acceptCall = async () => {
      if (!incomingCall) return;
      
      // Request media before accepting and pass the stream directly
      const stream = await getAudioStream();
      if (!stream) return; // Error toast already shown

      try {
          // Explicitly turn off constraints so sip.js doesn't try to get media again
          const options: any = {
              sessionDescriptionHandlerOptions: {
                  constraints: { audio: false, video: false },
                  streams: [stream] 
              }
          };

          await incomingCall.session.accept(options);
          
          if ((incomingCall.session as any)._ringAudio) {
               (incomingCall.session as any)._ringAudio.pause();
          }

          sessionRef.current = incomingCall.session;
          
          // Setup state listener
          incomingCall.session.stateChange.addListener((state) => {
              if (state === SessionState.Established) {
                   setupRemoteMedia(incomingCall.session);
              } else if (state === SessionState.Terminated) {
                   endCallCleanup();
              }
          });
          
          const newCall: Call = {
              id: Date.now().toString(),
              number: incomingCall.number,
              name: incomingCall.name,
              duration: 0,
              status: 'active',
              type: 'inbound',
              timestamp: new Date()
          };
          
          setActiveCall(newCall);
          setIncomingCall(null);
          
      } catch (e) {
          toast.error('Failed to answer call');
          console.error(e);
      }
  };

  const rejectCall = async () => {
      if (!incomingCall) return;
      try {
          await incomingCall.session.reject();
          if ((incomingCall.session as any)._ringAudio) {
               (incomingCall.session as any)._ringAudio.pause();
          }
          setIncomingCall(null);
      } catch (e) {
          console.error(e);
      }
  };

  const startCall = async () => {
    if (connectionStatus !== 'connected' || !userAgentRef.current) {
      toast.error('Not Connected');
      return;
    }
    if (!dialNumber) return;

    // Check media permission explicitly and get stream
    const stream = await getAudioStream();
    if (!stream) return; // Error toast already shown

    try {
        const domain = config?.serverUrl.replace('wss://', '').split(':')[0].split('/')[0];
        const target = UserAgent.makeURI(`sip:${dialNumber}@${domain}`); 
        if (!target) {
            toast.error('Invalid Number');
            return;
        }

        const inviter = new Inviter(userAgentRef.current, target);
        sessionRef.current = inviter;

        // Setup session delegates
        inviter.stateChange.addListener((state) => {
            console.log('Session state:', state);
            switch(state) {
                case SessionState.Establishing:
                    toast.info('Calling...');
                    break;
                case SessionState.Established:
                    toast.success('Call Connected');
                    setActiveCall(prev => prev ? { ...prev, status: 'active' } : null);
                    setupRemoteMedia(inviter);
                    break;
                case SessionState.Terminated:
                    endCallCleanup();
                    break;
            }
        });

        const newCall: Call = {
          id: Date.now().toString(),
          number: dialNumber,
          name: 'Unknown',
          duration: 0,
          status: 'active',
          type: 'outbound',
          timestamp: new Date(),
        };
        setActiveCall(newCall);

        const options: any = {
             sessionDescriptionHandlerOptions: {
                 // CRITICAL: Disable internal getUserMedia because we provide our own stream
                 constraints: { audio: false, video: false },
                 streams: [stream]
             }
        };

        await inviter.invite(options);

    } catch (error) {
        console.error('Call Error:', error);
        toast.error('Call Failed', { description: error.message });
    }
  };

  const setupRemoteMedia = (session: any) => {
      if (session.sessionDescriptionHandler && session.sessionDescriptionHandler.peerConnection) {
          const pc = session.sessionDescriptionHandler.peerConnection;
          const remoteStream = new MediaStream();
          pc.getReceivers().forEach((receiver: any) => {
              if (receiver.track) {
                  remoteStream.addTrack(receiver.track);
              }
          });
          if (audioRef.current) {
              audioRef.current.srcObject = remoteStream;
              audioRef.current.play().catch(e => console.error("Audio Play blocked", e));
          }
      }
  };

  const endCallCleanup = () => {
      if (activeCall) {
        setHistory(prev => [activeCall, ...prev]);
        setActiveCall(null);
        setIsHeld(false);
        setIsMuted(false);
        toast.info('Call Ended', { description: `Duration: ${formatDuration(activeCall.duration)}` });
      }
      sessionRef.current = null;
  };

  const endCall = () => {
    if (sessionRef.current) {
        switch(sessionRef.current.state) {
            case SessionState.Establishing:
                if (sessionRef.current.cancel) sessionRef.current.cancel();
                break;
            case SessionState.Established:
                if (sessionRef.current.bye) sessionRef.current.bye();
                break;
        }
    } else {
        endCallCleanup();
    }
  };

  const toggleHold = () => {
    // Basic UI toggle
    if (activeCall) {
      setIsHeld(!isHeld);
      setActiveCall({ ...activeCall, status: isHeld ? 'active' : 'held' });
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const openCertificate = () => {
      if (config?.serverUrl) {
          const httpUrl = config.serverUrl.replace('wss://', 'https://').replace('ws://', 'http://').split('/ws')[0];
          window.open(httpUrl, '_blank');
      }
  };

  return (
    <Card className="w-[320px] bg-white border border-gray-200 shadow-xl fixed bottom-4 right-4 z-50 overflow-hidden flex flex-col transition-all duration-300 transform translate-y-0">
      {/* Hidden Audio Element for WebRTC */}
      <audio ref={audioRef} autoPlay style={{ display: 'none' }} />

      {/* Header */}
      <div className="bg-[#1E4A9C] text-white p-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2">
          <Phone className="h-4 w-4" />
          <span className="font-semibold text-sm">Softphone</span>
        </div>
        
        <div className="flex items-center gap-2">
          {connectionStatus === 'connected' ? (
            <>
              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-green-500/20 rounded-full border border-green-400/30">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                <span className="text-[10px] font-medium tracking-wide">ONLINE</span>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 hover:bg-white/10 text-white/80 hover:text-white rounded-full"
                onClick={handleDisconnect}
                title="Disconnect"
              >
                <Power className="h-3.5 w-3.5" />
              </Button>
            </>
          ) : connectionStatus === 'connecting' ? (
             <div className="flex items-center gap-1.5 px-2 py-0.5 bg-yellow-500/20 rounded-full border border-yellow-400/30">
                <RefreshCw className="h-3 w-3 animate-spin text-yellow-400" />
                <span className="text-[10px] font-medium tracking-wide text-yellow-100">CONNECTING</span>
             </div>
          ) : connectionStatus === 'error' ? (
             <Button 
                size="sm" 
                variant="destructive"
                className="h-6 text-[10px] px-2"
                onClick={handleConnect}
             >
               <AlertTriangle className="h-3 w-3 mr-1.5" />
               Retry
             </Button>
          ) : (
            <Button 
              size="sm" 
              variant="secondary"
              className="h-6 text-[10px] px-2 bg-white/10 hover:bg-white/20 text-white border-none shadow-none"
              onClick={handleConnect}
            >
              <Wifi className="h-3 w-3 mr-1.5" />
              Connect
            </Button>
          )}
        </div>
      </div>

      {/* Permission Denied Panel */}
      {permissionDenied && (
          <div className="bg-orange-50 p-3 text-xs text-orange-800 border-b border-orange-100 flex flex-col gap-2">
              <div className="font-semibold flex items-center gap-1">
                  <ShieldAlert className="h-3 w-3" /> Microphone Issue
              </div>
              <div>Check browser permissions or device connection.</div>
              <Button size="sm" variant="outline" className="w-full h-7 text-xs bg-white border-orange-200" onClick={getAudioStream}>
                  Retry Access
              </Button>
          </div>
      )}

      {/* Error / Diagnostics Panel */}
      {connectionStatus === 'error' && lastError && (
          <div className="bg-red-50 p-3 text-xs text-red-700 border-b border-red-100 flex flex-col gap-2">
              <div className="font-semibold flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> Connection Failed
              </div>
              <div>{lastError}</div>
              {lastError.includes('Certificate') || lastError.includes('1006') ? (
                  <Button size="sm" variant="outline" className="w-full h-7 text-xs bg-white" onClick={openCertificate}>
                      Open Certificate
                  </Button>
              ) : null}
          </div>
      )}

      {/* Incoming Call Screen */}
      {incomingCall ? (
        <div className="flex-1 bg-gray-900 p-6 flex flex-col items-center justify-center space-y-6 min-h-[300px] animate-in fade-in slide-in-from-bottom-5">
           <div className="text-center space-y-2">
              <div className="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                <PhoneIncoming className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white">{incomingCall.name}</h3>
              <p className="text-blue-200 font-mono tracking-wider">{incomingCall.number}</p>
              <Badge variant="outline" className="text-white border-white/20 mt-2">INCOMING CALL</Badge>
           </div>
           
           <div className="grid grid-cols-2 gap-4 w-full mt-8">
               <Button 
                 onClick={rejectCall}
                 className="h-14 rounded-full bg-red-500 hover:bg-red-600 text-white font-bold"
               >
                 Decline
               </Button>
               <Button 
                 onClick={acceptCall}
                 className="h-14 rounded-full bg-green-500 hover:bg-green-600 text-white font-bold animate-bounce"
               >
                 Answer
               </Button>
           </div>
        </div>
      ) : activeCall ? (
        /* Active Call Screen */
        <div className="flex-1 bg-gray-50 p-6 flex flex-col items-center justify-center space-y-6 min-h-[300px]">
          <div className="text-center space-y-1">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner">
              <Users className="h-8 w-8 text-gray-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">{activeCall.name || activeCall.number}</h3>
            <p className="text-sm text-gray-500 font-mono tracking-wider">{activeCall.number}</p>
            <Badge variant="secondary" className={`${isHeld ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'} mt-2`}>
              {isHeld ? 'ON HOLD' : formatDuration(activeCall.duration)}
            </Badge>
          </div>

          <div className="grid grid-cols-3 gap-4 w-full px-4">
            <Button
              variant="outline"
              size="icon"
              className={`h-12 w-12 rounded-full border-gray-300 ${isMuted ? 'bg-red-50 text-red-600 border-red-200' : 'text-gray-600 hover:bg-gray-100'}`}
              onClick={() => setIsMuted(!isMuted)}
            >
              {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </Button>
            <Button
              variant="outline"
              size="icon"
              className={`h-12 w-12 rounded-full border-gray-300 ${isHeld ? 'bg-yellow-50 text-yellow-600 border-yellow-200' : 'text-gray-600 hover:bg-gray-100'}`}
              onClick={toggleHold}
            >
              {isHeld ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-12 w-12 rounded-full border-gray-300 text-gray-600 hover:bg-gray-100"
            >
              <MessageSquare className="h-5 w-5" />
            </Button>
          </div>

          <Button 
            variant="destructive" 
            className="w-full h-12 rounded-full text-lg font-medium shadow-lg hover:bg-red-700 transition-colors"
            onClick={endCall}
          >
            <PhoneOff className="h-5 w-5 mr-2" />
            End Call
          </Button>
        </div>
      ) : (
        /* Dialpad Screen */
        <Tabs defaultValue="keypad" className="flex-1 flex flex-col">
          <div className="bg-gray-50 px-4 py-2 border-b">
            <Input 
              value={dialNumber}
              onChange={(e) => setDialNumber(e.target.value)}
              className="text-center text-2xl font-mono h-12 border-none bg-transparent shadow-none focus-visible:ring-0 placeholder:text-gray-300"
              placeholder="Enter Number..."
            />
          </div>

          <TabsContent value="keypad" className="flex-1 p-4 grid grid-cols-3 gap-3 bg-white">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, '*', 0, '#'].map((key) => (
              <button
                key={key}
                className="h-12 rounded-lg bg-gray-50 hover:bg-gray-100 active:bg-gray-200 flex items-center justify-center text-xl font-medium text-gray-700 transition-colors"
                onClick={() => handleDial(key.toString())}
              >
                {key}
              </button>
            ))}
            <div className="col-span-3 mt-2">
              <Button 
                className="w-full h-12 bg-green-500 hover:bg-green-600 text-white rounded-lg text-lg font-medium shadow-md transition-all active:scale-95"
                onClick={startCall}
                disabled={!dialNumber}
              >
                <Phone className="h-5 w-5 mr-2" />
                Call
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="history" className="flex-1 p-0 overflow-y-auto max-h-[300px]">
            {history.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 p-8">
                <History className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">No recent calls</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {history.map((call) => (
                  <div key={call.id} className="p-3 hover:bg-gray-50 flex items-center justify-between group cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${call.type === 'inbound' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'}`}>
                        {call.type === 'inbound' ? <Phone className="h-4 w-4" /> : <Phone className="h-4 w-4 rotate-45" />}
                      </div>
                      <div>
                        <p className="font-medium text-sm text-gray-900">{call.name || call.number}</p>
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          {call.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} • {formatDuration(call.duration)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsList className="grid w-full grid-cols-2 bg-gray-100 p-1 m-0 border-t border-gray-200">
            <TabsTrigger value="keypad" className="data-[state=active]:bg-white shadow-sm">Keypad</TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-white shadow-sm">Recent</TabsTrigger>
          </TabsList>
        </Tabs>
      )}
    </Card>
  );
}