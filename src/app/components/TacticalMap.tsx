import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Map, Navigation, Shield, AlertTriangle, User, Clock, Radio } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface MapEntity {
  id: string;
  type: 'unit' | 'incident';
  x: number; // Percentage 0-100
  y: number; // Percentage 0-100
  status?: 'idle' | 'moving' | 'critical' | 'active';
  name: string;
  details?: string;
}

export function TacticalMap() {
  const { t, language } = useLanguage();
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null);
  const [radarAngle, setRadarAngle] = useState(0);

  // Mock initial state
  const [entities, setEntities] = useState<MapEntity[]>([
    { id: 'inc1', type: 'incident', x: 30, y: 40, status: 'critical', name: 'Cardiac Arrest', details: 'Nahar Hayarden 45' },
    { id: 'inc2', type: 'incident', x: 75, y: 20, status: 'active', name: 'MVA', details: 'RBS Gimmel Main Rd' },
    { id: 'u1', type: 'unit', x: 25, y: 45, status: 'moving', name: 'Unit 4', details: 'ALS Ambulance' },
    { id: 'u2', type: 'unit', x: 60, y: 60, status: 'idle', name: 'Unit 2', details: 'Motorcycle Unit' },
    { id: 'u3', type: 'unit', x: 80, y: 25, status: 'moving', name: 'Unit 7', details: 'First Responder' },
  ]);

  // Simulate movement
  useEffect(() => {
    const interval = setInterval(() => {
      setEntities(prev => prev.map(entity => {
        if (entity.type === 'unit' && entity.status === 'moving') {
          // Simple random movement
          const dx = (Math.random() - 0.5) * 2;
          const dy = (Math.random() - 0.5) * 2;
          return {
            ...entity,
            x: Math.max(5, Math.min(95, entity.x + dx)),
            y: Math.max(5, Math.min(95, entity.y + dy)),
          };
        }
        return entity;
      }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Radar animation loop
  useEffect(() => {
    const animation = requestAnimationFrame(() => {
      setRadarAngle(prev => (prev + 2) % 360);
    });
    // This is just a trigger, actual animation handled by Framer Motion or CSS usually, 
    // but for continuous rotation state updates might be heavy. 
    // Let's use CSS animation for the radar scan instead.
  }, []);

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 h-full flex flex-col">
      <h3 className="font-semibold mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
          {t('live_map_view')}
        </div>
        <div className="flex gap-2 text-xs">
           <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span>{t('units')}</span>
           <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span>{t('incidents')}</span>
        </div>
      </h3>
      
      <div className="flex-1 relative bg-[#0f172a] rounded-lg overflow-hidden border border-slate-800 shadow-inner group">
        
        {/* Map Grid Background */}
        <div className="absolute inset-0 opacity-20" 
          style={{ 
            backgroundImage: 'linear-gradient(#334155 1px, transparent 1px), linear-gradient(90deg, #334155 1px, transparent 1px)', 
            backgroundSize: '40px 40px' 
          }} 
        />
        
        {/* Mock Map Texture (Abstract City) */}
        <div className="absolute inset-0 opacity-30 bg-[url('https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&q=80&w=800&h=600')] bg-cover bg-center grayscale mix-blend-overlay pointer-events-none" />

        {/* Radar Sweep Effect */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/2 left-1/2 w-[150%] h-[150%] -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-transparent via-green-500/10 to-transparent animate-[spin_4s_linear_infinite]" 
               style={{ clipPath: 'conic-gradient(from 0deg, transparent 0deg, transparent 270deg, rgba(34, 197, 94, 0.2) 360deg)' }}
          />
        </div>

        {/* Entities */}
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
                layout: { duration: 1 } // Smooth movement
              }}
              className="absolute -translate-x-1/2 -translate-y-1/2 z-10 focus:outline-none"
              onClick={() => setSelectedEntity(entity.id === selectedEntity ? null : entity.id)}
            >
              <div className="relative group/marker">
                {/* Ping Animation for incidents */}
                {entity.type === 'incident' && (
                  <span className="absolute -inset-2 rounded-full bg-red-500/30 animate-ping duration-1000" />
                )}
                
                {/* Icon Circle */}
                <div className={`
                  relative h-8 w-8 rounded-full flex items-center justify-center border-2 shadow-lg transition-transform hover:scale-110
                  ${entity.type === 'incident' ? 'bg-red-600 border-red-400 text-white' : 'bg-blue-600 border-blue-400 text-white'}
                  ${selectedEntity === entity.id ? 'ring-2 ring-white scale-110' : ''}
                `}>
                  {entity.type === 'incident' ? <AlertTriangle className="h-4 w-4" /> : <Navigation className="h-4 w-4" />}
                </div>

                {/* Tooltip Label (Visible on hover or selection) */}
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
        
        {/* Info Overlay for Selected Entity */}
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
                           {e.type === 'unit' && (
                             <span className="text-[10px] text-slate-500 flex items-center gap-1">
                               <Clock className="h-3 w-3" /> ETA: 2m
                             </span>
                           )}
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
