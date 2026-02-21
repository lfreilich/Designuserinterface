import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Navigation, AlertTriangle, Radio, ShieldAlert, Loader2 } from 'lucide-react';
import { GoogleMap, InfoWindowF } from '@react-google-maps/api';
import { useLanguage } from '../contexts/LanguageContext';
import { useGoogleMaps } from '../contexts/GoogleMapsContext';
import { ActiveCall } from './ActiveCallCard';
import { Unit } from './UnitStatusPanel';

// --- Types ---
interface MapEntity {
  id: string;
  type: 'unit' | 'incident';
  lat: number;
  lng: number;
  status?: string;
  name: string;
  details?: string;
  priority?: string;
  raw?: any;
}

interface TacticalMapProps {
  incidents?: ActiveCall[];
  units?: Unit[];
}

// --- Constants ---
const containerStyle = { width: '100%', height: '100%' };
const defaultCenter = { lat: 31.75, lng: 34.99 }; // Default to Beit Shemesh area
const mapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: true,
  mapId: 'DEMO_MAP_ID', // Required for AdvancedMarkerElement
};

// --- Sub-components ---

interface AdvancedMarkerProps {
  map: google.maps.Map | null;
  position: google.maps.LatLngLiteral;
  title: string;
  type: 'unit' | 'incident';
  priority?: string;
  isActive?: boolean;
  onClick: () => void;
}

const AdvancedMarker = ({ map, position, title, type, priority, isActive, onClick }: AdvancedMarkerProps) => {
    const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);

    useEffect(() => {
        if (!map) return;

        // Create container
        const container = document.createElement('div');
        container.className = 'marker-container group cursor-pointer';

        // Create inner visual
        const inner = document.createElement('div');
        const isIncident = type === 'incident';
        
        let bgColor = isIncident ? 'bg-red-600' : 'bg-blue-600';
        let borderColor = isIncident ? 'border-red-400' : 'border-blue-400';
        
        if (isIncident && priority === 'critical') {
            bgColor = 'bg-red-700';
            borderColor = 'border-red-500';
        }

        // We use inline styles for dynamic properties that are hard to orchestrate with just classes in created elements
        inner.className = `relative h-8 w-8 rounded-full flex items-center justify-center border-2 shadow-lg transition-transform hover:scale-110 ${bgColor} ${borderColor} text-white`;
        
        if (isActive) {
            inner.style.transform = "scale(1.2)";
            inner.style.borderColor = "white";
            inner.style.borderWidth = "2px";
        }

        // Add icon SVG content
        inner.innerHTML = isIncident 
            ? '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><path d="M12 9v4"></path><path d="M12 17h.01"></path></svg>'
            : '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>';

        // Add ping animation for critical incidents
        if (isIncident) {
            const ping = document.createElement('span');
            ping.className = `absolute -inset-2 rounded-full animate-ping opacity-75 ${priority === 'critical' ? 'bg-red-500' : 'bg-red-400'}`;
            container.appendChild(ping);
        }

        container.appendChild(inner);

        // Tooltip
        const tooltip = document.createElement('div');
        tooltip.className = 'absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 bg-black/80 text-white text-[10px] rounded whitespace-nowrap opacity-0 transition-opacity duration-200 pointer-events-none group-hover:opacity-100 z-50';
        tooltip.innerHTML = `<div class="font-bold">${title}</div>`;
        container.appendChild(tooltip);

        const marker = new google.maps.marker.AdvancedMarkerElement({
            map,
            position,
            title,
            content: container,
            gmpClickable: true,
        });

        marker.addEventListener("gmp-click", onClick);
        markerRef.current = marker;

        return () => {
            marker.removeEventListener("gmp-click", onClick);
            marker.map = null;
        };
    }, [map, position, title, type, priority, isActive, onClick]);

    return null;
};

function RealGoogleMap({ incidents, units }: TacticalMapProps) {
  const { t } = useLanguage();
  const { isLoaded, loadError } = useGoogleMaps();
  const [selectedEntity, setSelectedEntity] = useState<MapEntity | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);

  const onLoad = useCallback((map: google.maps.Map) => setMap(map), []);
  const onUnmount = useCallback(() => setMap(null), []);

  const entities = useMemo(() => {
    const mapEntities: MapEntity[] = [];
    const safeIncidents = incidents || [];
    const safeUnits = units || [];

    safeIncidents.forEach(inc => {
      if (inc.location) {
        mapEntities.push({
          id: `inc-${inc.id}`,
          type: 'incident',
          lat: inc.location.lat,
          lng: inc.location.lng,
          status: inc.status,
          name: inc.type,
          details: inc.address,
          priority: inc.priority,
          raw: inc
        });
      }
    });

    safeUnits.forEach(unit => {
      let lat: number | undefined;
      let lng: number | undefined;

      if (unit.coordinates) {
        lat = unit.coordinates.lat;
        lng = unit.coordinates.lng;
      } else if (unit.location && unit.location.includes(',')) {
        const [l, g] = unit.location.split(',').map(s => parseFloat(s.trim()));
        if (!isNaN(l) && !isNaN(g)) {
          lat = l;
          lng = g;
        }
      }

      if (lat !== undefined && lng !== undefined) {
          mapEntities.push({
            id: `unit-${unit.id}`,
            type: 'unit',
            lat,
            lng,
            status: unit.status,
            name: unit.name,
            details: unit.members.join(', '),
            raw: unit
          });
      }
    });
    return mapEntities;
  }, [incidents, units]);

  if (loadError) {
    return <MockTacticalMap incidents={incidents} units={units} error={loadError.message} />;
  }

  if (!isLoaded) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="bg-white p-1 rounded-lg shadow-sm border border-gray-100 h-full flex flex-col relative">
       <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur px-3 py-1.5 rounded-md shadow-sm border border-gray-200 flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
          </span>
          <span className="text-sm font-semibold text-gray-800">{t('live_map_view')}</span>
       </div>

      <GoogleMap
        mapContainerStyle={containerStyle}
        center={defaultCenter}
        zoom={13}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={mapOptions}
      >
        {entities.map(entity => (
          <AdvancedMarker
            key={entity.id}
            map={map}
            position={{ lat: entity.lat, lng: entity.lng }}
            title={entity.name}
            type={entity.type}
            priority={entity.priority}
            isActive={selectedEntity?.id === entity.id}
            onClick={() => setSelectedEntity(entity)}
          />
        ))}

        {selectedEntity && (
          <InfoWindowF
            position={{ lat: selectedEntity.lat, lng: selectedEntity.lng }}
            onCloseClick={() => setSelectedEntity(null)}
          >
            <div className="p-1 min-w-[200px]">
              <div className="flex items-center gap-2 mb-2">
                 <div className={`p-1.5 rounded-full ${selectedEntity.type === 'incident' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                   {selectedEntity.type === 'incident' ? <AlertTriangle className="h-4 w-4" /> : <Navigation className="h-4 w-4" />}
                 </div>
                 <div>
                   <h4 className="font-bold text-sm text-gray-900">{selectedEntity.name}</h4>
                   <span className="text-xs text-gray-500 capitalize">{selectedEntity.status}</span>
                 </div>
              </div>
              <p className="text-xs text-gray-600 mb-2">{selectedEntity.details}</p>
              {selectedEntity.type === 'incident' && selectedEntity.priority === 'critical' && (
                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">
                  CRITICAL
                </span>
              )}
            </div>
          </InfoWindowF>
        )}
      </GoogleMap>
    </div>
  );
}

function MockTacticalMap({ incidents, units, error }: { incidents?: ActiveCall[], units?: Unit[], error?: string }) {
    const { t } = useLanguage();
    const [selectedEntity, setSelectedEntity] = useState<string | null>(null);
    const [entities, setEntities] = useState<any[]>([]);
  
    // Simple projection for demo
    const LAT_MIN = 31.74;
    const LAT_MAX = 31.76;
    const LON_MIN = 34.97;
    const LON_MAX = 35.00;
  
    const project = (lat: number, lng: number) => {
      const y = 100 - ((lat - LAT_MIN) / (LAT_MAX - LAT_MIN)) * 100;
      const x = ((lng - LON_MIN) / (LON_MAX - LON_MIN)) * 100;
      return { x: Math.max(5, Math.min(95, x)), y: Math.max(5, Math.min(95, y)) };
    };
  
    useEffect(() => {
      if (!incidents && !units) return;
      
      const safeIncidents = incidents || [];
      const safeUnits = units || [];
      const mapEntities: any[] = [];
  
      safeIncidents.forEach(inc => {
        let pos = { x: 50, y: 50 };
        if (inc.location) {
          pos = project(inc.location.lat, inc.location.lng);
        } else {
           const hash = inc.id.split('').reduce((a,b)=>a+b.charCodeAt(0),0);
           pos = { x: (hash % 80) + 10, y: ((hash * 13) % 80) + 10 };
        }
  
        mapEntities.push({
          id: `inc-${inc.id}`,
          type: 'incident',
          x: pos.x,
          y: pos.y,
          status: inc.status,
          name: inc.type,
          details: inc.address,
          priority: inc.priority
        });
      });
  
      safeUnits.forEach(unit => {
        let pos = { x: 50, y: 50 };
        if (unit.location && unit.location.includes(',')) {
          const [lat, lng] = unit.location.split(',').map(s => parseFloat(s.trim()));
          if (!isNaN(lat) && !isNaN(lng)) {
             pos = project(lat, lng);
          }
        } else {
          const hash = unit.id.split('').reduce((a,b)=>a+b.charCodeAt(0),0);
           pos = { x: (hash % 80) + 10, y: ((hash * 7) % 80) + 10 };
        }
  
        mapEntities.push({
          id: `unit-${unit.id}`,
          type: 'unit',
          x: pos.x,
          y: pos.y,
          status: unit.status,
          name: unit.name,
          details: unit.members.join(', ')
        });
      });
  
      setEntities(mapEntities);
  
    }, [incidents, units]);
  
    return (
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 h-full flex flex-col">
        <h3 className="font-semibold mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            {t('live_map_view')}
            {error && <span className="text-xs text-red-500 ml-2">(Map Key Error: {error})</span>}
          </div>
          <div className="flex gap-2 text-xs">
             <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span>{t('units')}</span>
             <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span>{t('incidents')}</span>
          </div>
        </h3>
        
        <div className="flex-1 relative bg-[#0f172a] rounded-lg overflow-hidden border border-slate-800 shadow-inner group">
          
          <div className="absolute inset-0 opacity-20" 
            style={{ 
              backgroundImage: 'linear-gradient(#334155 1px, transparent 1px), linear-gradient(90deg, #334155 1px, transparent 1px)', 
              backgroundSize: '40px 40px' 
            }} 
          />
          
          <div className="absolute inset-0 opacity-30 bg-[url('https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&q=80&w=800&h=600')] bg-cover bg-center grayscale mix-blend-overlay pointer-events-none" />
  
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-1/2 left-1/2 w-[150%] h-[150%] -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-transparent via-green-500/10 to-transparent animate-[spin_4s_linear_infinite]" 
                 style={{ clipPath: 'conic-gradient(from 0deg, transparent 0deg, transparent 270deg, rgba(34, 197, 94, 0.2) 360deg)' }}
            />
          </div>
  
          <AnimatePresence>
            {entities.map((entity) => (
              <motion.button
                key={entity.id}
                layout
                initial={{ scale: 0, opacity: 0 }}
                animate={{ 
                  left: `${entity.x}%`, 
                  top: `${entity.y}%`, 
                  scale: 1, 
                  opacity: 1 
                }}
                transition={{ 
                  type: "spring", 
                  stiffness: 50, 
                  damping: 20,
                  layout: { duration: 1 } 
                }}
                className="absolute -translate-x-1/2 -translate-y-1/2 z-10 focus:outline-none"
                onClick={() => setSelectedEntity(entity.id === selectedEntity ? null : entity.id)}
              >
                <div className="relative group/marker">
                  {entity.type === 'incident' && (
                    <span className={`absolute -inset-2 rounded-full animate-ping duration-1000 ${
                      entity.priority === 'critical' ? 'bg-red-500/50' : 'bg-red-500/30'
                    }`} />
                  )}
                  
                  <div className={`
                    relative h-8 w-8 rounded-full flex items-center justify-center border-2 shadow-lg transition-transform hover:scale-110
                    ${entity.type === 'incident' 
                      ? entity.priority === 'critical' ? 'bg-red-700 border-red-500 text-white' : 'bg-red-600 border-red-400 text-white' 
                      : 'bg-blue-600 border-blue-400 text-white'}
                    ${selectedEntity === entity.id ? 'ring-2 ring-white scale-110' : ''}
                  `}>
                    {entity.type === 'incident' ? <AlertTriangle className="h-4 w-4" /> : <Navigation className="h-4 w-4" />}
                  </div>
  
                  <div className={`
                    absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 bg-black/80 text-white text-[10px] rounded whitespace-nowrap pointer-events-none
                    transition-all duration-200 z-20
                    ${selectedEntity === entity.id ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1 group-hover/marker:opacity-100 group-hover/marker:translate-y-0'}
                  `}>
                    <div className="font-bold">{entity.name}</div>
                    <div className="text-gray-300">{entity.details}</div>
                  </div>
                </div>
              </motion.button>
            ))}
          </AnimatePresence>
          
          <AnimatePresence>
            {selectedEntity && (
              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 20, opacity: 0 }}
                className="absolute bottom-4 left-4 right-4 bg-slate-900/90 backdrop-blur-md border border-slate-700 p-3 rounded-lg text-white shadow-xl z-30"
              >
                {(() => {
                   const e = entities.find(ent => ent.id === selectedEntity);
                   if (!e) return null;
                   return (
                     <div className="flex items-start justify-between">
                       <div className="flex items-center gap-3">
                         <div className={`p-2 rounded-full ${e.type === 'incident' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
                           {e.type === 'incident' ? <ShieldAlert className="h-5 w-5" /> : <Radio className="h-5 w-5" />}
                         </div>
                         <div>
                           <h4 className="font-bold text-sm">{e.name}</h4>
                           <p className="text-xs text-slate-400">{e.details}</p>
                           <div className="flex items-center gap-2 mt-1">
                             <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold ${
                               e.status === 'critical' ? 'bg-red-900/50 text-red-400 border border-red-800' : 
                               e.status === 'moving' ? 'bg-blue-900/50 text-blue-400 border border-blue-800' : 
                               'bg-slate-800 text-slate-400 border border-slate-700'
                             }`}>
                               {e.status}
                             </span>
                           </div>
                         </div>
                       </div>
                       <button onClick={() => setSelectedEntity(null)} className="text-slate-500 hover:text-white">
                         <span className="sr-only">Close</span>
                         &times;
                       </button>
                     </div>
                   );
                })()}
              </motion.div>
            )}
          </AnimatePresence>
  
        </div>
      </div>
    );
}

// --- Main Container ---

export function TacticalMap(props: TacticalMapProps) {
  const { isLoaded, apiKey, configLoaded } = useGoogleMaps();

  // If configuration is still loading, show spinner
  if (!configLoaded) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  // If configuration loaded but no API key, fallback to mock
  if (!apiKey) {
    return <MockTacticalMap {...props} />;
  }

  // If we have an API key, rely on isLoaded from GoogleMapsContext.
  // RealGoogleMap will also handle !isLoaded state by showing a spinner if needed, 
  // but since we checked apiKey, isLoaded should eventually be true.
  return <RealGoogleMap {...props} />;
}
