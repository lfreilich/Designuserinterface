import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import { ScrollArea } from './ui/scroll-area';
import { Phone, MapPin, User, Clock, Trash2, X, Plus, FileText, Search, GripVertical, Check, ChevronsUpDown, Mic, MicOff, Sparkles, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import { PCRForm } from './PCRForm';
import * as api from '../services/api';
import { useDrag, useDrop } from 'react-dnd';
import { cn } from './ui/utils';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./ui/popover"

interface Unit {
  id: string;
  name: string;
  status: 'available' | 'dispatched' | 'enroute' | 'arrived' | 'cleared' | 'offline';
  location: string;
  members: string[];
}

interface IncidentIntakeFormProps {
  open: boolean;
  onClose: () => void;
  incident?: api.BackendIncident | null;
  onSave?: (incident: api.BackendIncident) => void;
  units?: Unit[];
}

const ItemType = {
  UNIT: 'unit',
};

// Expanded Chief Complaint List (36 Headings based on MPDS)
const CHIEF_COMPLAINTS = [
  {
    category: "Abdominal Pain",
    items: ["Abdominal Pain", "Flank Pain (Non-Traumatic)", "Groin Pain"]
  },
  {
    category: "Allergies / Envenomations",
    items: ["Allergic Reaction", "Anaphylaxis", "Bee/Insect Sting", "Snake Bite", "Medication Reaction"]
  },
  {
    category: "Animal Bites / Attacks",
    items: ["Animal Bite", "Animal Attack"]
  },
  {
    category: "Assault / Sexual Assault",
    items: ["Assault", "Sexual Assault", "Domestic Violence"]
  },
  {
    category: "Back Pain",
    items: ["Back Pain (Non-Traumatic)", "Non-Traumatic Back Injury"]
  },
  {
    category: "Breathing Problems",
    items: ["Difficulty Breathing", "Asthma Attack", "COPD Exacerbation", "Ineffective Breathing"]
  },
  {
    category: "Burns / Explosion",
    items: ["Thermal Burn", "Chemical Burn", "Electrical Burn", "Explosion"]
  },
  {
    category: "Carbon Monoxide / Inhalation / HazMat",
    items: ["CO Alarm", "Gas Leak", "HazMat Exposure", "Inhalation"]
  },
  {
    category: "Cardiac or Respiratory Arrest / Death",
    items: ["Cardiac Arrest", "Respiratory Arrest", "Obvious Death", "Expected Death"]
  },
  {
    category: "Chest Pain (Non-Traumatic)",
    items: ["Chest Pain", "Heart Attack Symptoms", "Discomfort (Cardiac)"]
  },
  {
    category: "Choking",
    items: ["Choking (Partial Obstruction)", "Choking (Complete Obstruction)"]
  },
  {
    category: "Convulsions / Seizures",
    items: ["Active Seizure", "Post-Seizure", "History of Seizures"]
  },
  {
    category: "Diabetic Problems",
    items: ["Hyperglycemia", "Hypoglycemia", "Diabetic Ketoacidosis"]
  },
  {
    category: "Drowning / Diving / Scuba Accident",
    items: ["Drowning", "Near Drowning", "Diving Accident"]
  },
  {
    category: "Electrocution / Lightning",
    items: ["Electrocution", "Lightning Strike"]
  },
  {
    category: "Eye Problems / Injuries",
    items: ["Eye Injury", "Foreign Body in Eye", "Chemical in Eye"]
  },
  {
    category: "Falls",
    items: ["Fall (Ground Level)", "Fall (From Height)"]
  },
  {
    category: "Headache",
    items: ["Headache", "Migraine", "Sudden Onset Severe Headache"]
  },
  {
    category: "Heart Problems / A.I.C.D.",
    items: ["Palpitations", "Fast Heart Rate", "A.I.C.D. Firing"]
  },
  {
    category: "Heat / Cold Exposure",
    items: ["Heat Exhaustion", "Heat Stroke", "Hypothermia", "Frostbite"]
  },
  {
    category: "Hemorrhage / Lacerations",
    items: ["Hemorrhage (Bleeding)", "Laceration", "Epistaxis (Nosebleed)"]
  },
  {
    category: "Inaccessible Incident / Other Entrapments",
    items: ["Entrapment (Non-Vehicle)", "Locked In", "Structural Collapse"]
  },
  {
    category: "Overdose / Poisoning (Ingestion)",
    items: ["Overdose (Accidental)", "Overdose (Intentional)", "Poisoning"]
  },
  {
    category: "Pregnancy / Childbirth / Miscarriage",
    items: ["Active Labor", "Imminent Delivery", "Miscarriage", "Vaginal Bleeding (Pregnant)"]
  },
  {
    category: "Psychiatric / Abnormal Behavior / Suicide Attempt",
    items: ["Abnormal Behavior", "Suicide Attempt", "Suicidal Ideation", "Psychiatric Problem"]
  },
  {
    category: "Sick Person (Specific Diagnosis)",
    items: ["Sick Person", "Fever", "Nausea/Vomiting", "Dizziness/Vertigo", "General Weakness"]
  },
  {
    category: "Stab / Gunshot / Penetrating Trauma",
    items: ["Stab Wound", "Gunshot Wound", "Penetrating Trauma"]
  },
  {
    category: "Stroke (CVA)",
    items: ["Stroke Symptoms", "CVA", "TIA"]
  },
  {
    category: "Traffic / Transportation Accidents",
    items: ["MVA", "MVA with Entrapment", "Motorcycle Accident", "Pedestrian Struck"]
  },
  {
    category: "Traumatic Injuries (Specific)",
    items: ["Traumatic Injury", "Fracture", "Dislocation", "Head Injury"]
  },
  {
    category: "Unconscious / Fainting (Near)",
    items: ["Unconscious", "Fainting / Syncope", "Near Fainting"]
  },
  {
    category: "Unknown Problem (Man Down)",
    items: ["Unknown Problem", "Man Down", "Medical Alarm"]
  },
  {
    category: "Inter-Facility Transfer / Palliative Care",
    items: ["Transfer", "Palliative Care"]
  }
];

// Draggable Unit Component
function DraggableUnit({ unit }: { unit: Unit }) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemType.UNIT,
    item: { id: unit.id, name: unit.name },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

  // Match style from screenshot: 
  // Icon (dots) | Unit Name + Status Text | Status Badge
  return (
    <div
      ref={drag}
      className={`p-3 mb-2 bg-white border border-gray-200 rounded-lg shadow-sm flex items-center justify-between cursor-move hover:bg-gray-50 group transition-all ${isDragging ? 'opacity-50 scale-95' : ''}`}
    >
      <div className="flex items-center gap-3">
        <GripVertical className="h-5 w-5 text-gray-300 group-hover:text-gray-500" />
        <div className="flex flex-col">
          <span className="font-bold text-sm text-gray-900 leading-tight">{unit.name}</span>
          <span className="text-[11px] text-gray-500 capitalize">{unit.status}</span>
        </div>
      </div>
      <Badge variant="outline" className={`
        uppercase text-[10px] font-bold px-2 py-0.5 rounded-full border
        ${unit.status === 'available' ? 'bg-green-50 text-green-600 border-green-200' : ''}
        ${unit.status === 'dispatched' || unit.status === 'responding' ? 'bg-blue-50 text-blue-600 border-blue-200' : ''}
        ${unit.status === 'on scene' || unit.status === 'arrived' ? 'bg-gray-100 text-gray-600 border-gray-300' : ''}
      `}>
        {unit.status}
      </Badge>
    </div>
  );
}

// Droppable Area Component
function DroppableArea({ assignedUnits, allUnits, onDrop, onRemove }: { assignedUnits: string[], allUnits: Unit[], onDrop: (item: any) => void, onRemove: (id: string) => void }) {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: ItemType.UNIT,
    drop: (item) => onDrop(item),
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  }));

  const getUnitName = (id: string) => {
    const unit = allUnits.find(u => u.id === id);
    return unit ? unit.name : id;
  };

  return (
    <div
      ref={drop}
      className={`min-h-[140px] border-2 border-dashed rounded-xl p-4 transition-all duration-200 relative ${
        isOver ? 'bg-blue-50 border-blue-400 scale-[1.01]' : 'bg-gray-50 border-gray-200'
      }`}
    >
      {assignedUnits.length === 0 ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 text-sm italic pointer-events-none p-4 text-center">
           <span className="mb-1">Drag available units here to dispatch</span>
        </div>
      ) : (
        <div className="space-y-2 relative z-10">
          {assignedUnits.map((unitId) => (
            <div key={unitId} className="p-2 pl-3 bg-white border border-blue-200 rounded-lg shadow-sm flex items-center justify-between animate-in fade-in slide-in-from-top-1">
              <div className="flex items-center gap-3">
                 <div className="h-2 w-2 rounded-full bg-blue-600 animate-pulse shadow-sm shadow-blue-200"></div>
                 <span className="font-bold text-sm text-gray-800">{getUnitName(unitId)}</span>
              </div>
              <Button 
                size="icon" 
                variant="ghost" 
                className="h-7 w-7 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors" 
                onClick={() => onRemove(unitId)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function IncidentIntakeForm({ open, onClose, incident, onSave, units = [] }: IncidentIntakeFormProps) {
  const [loading, setLoading] = useState(false);
  const [showPCR, setShowPCR] = useState(false);
  const [unitSearch, setUnitSearch] = useState('');
  const [openCombobox, setOpenCombobox] = useState(false);
  const [isListenerActive, setIsListenerActive] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    // Call Details
    callTaker: 'Dispatcher One',
    backupCallTaker: '',
    callTime: new Date().toISOString(),
    
    // Caller
    callerName: '',
    callerPhone: '',
    secondCallerPhone: '',
    
    // Address
    addressFormatted: '',
    addressCity: 'Beit Shemesh',
    addressStreet: '',
    addressEntrance: '',
    addressFloor: '',
    addressApt: '',
    addressType: 'home',
    
    // Patient
    patientAge: '',
    patientAgeUnit: 'years',
    patientGender: 'unknown',
    chiefComplaint: '',
    description: '',
    
    // Risk
    isSafetyRisk: false,
    isInfectionRisk: false,
    
    priority: '2',
    
    // Dispatch
    unitsAssigned: [] as string[],
  });

  // Load incident data if editing
  useEffect(() => {
    if (open && incident) {
      setFormData({
        callTaker: incident.callTaker || 'Dispatcher One',
        backupCallTaker: incident.backupCallTaker || '',
        callTime: incident.timeCallReceived || new Date().toISOString(),
        callerName: incident.callerName || '',
        callerPhone: incident.callerPhone || '',
        secondCallerPhone: incident.secondCallerPhone || '',
        addressFormatted: incident.addressFormatted || '',
        addressCity: incident.addressCity || 'Beit Shemesh',
        addressStreet: incident.addressStreet || '',
        addressEntrance: incident.addressEntrance || '',
        addressFloor: incident.addressFloor || '',
        addressApt: incident.addressApt || '',
        addressType: incident.addressType || 'home',
        patientAge: incident.patientAge?.toString() || '',
        patientAgeUnit: incident.patientAgeUnit || 'years',
        patientGender: incident.patientGender || 'unknown',
        chiefComplaint: incident.chiefComplaintText || '',
        description: incident.description || '',
        isSafetyRisk: incident.isSafetyRisk || false,
        isInfectionRisk: incident.isInfectionRisk || false,
        priority: incident.priority.toString() || '2',
        unitsAssigned: incident.unitsAssigned || [],
      });
    } else if (open && !incident) {
      // Reset form for new incident
      setFormData(prev => ({
        ...prev,
        callTime: new Date().toISOString(),
        callerName: '',
        callerPhone: '',
        chiefComplaint: '',
        addressFormatted: '',
        unitsAssigned: [],
      }));
    }
  }, [open, incident]);

  // Simulate AI Listener
  useEffect(() => {
    if (!isListenerActive) return;

    const timeouts: ReturnType<typeof setTimeout>[] = [];

    // Only auto-fill if fields are empty to avoid overwriting user input
    // Simulate finding address after 2 seconds
    if (!formData.addressStreet && !formData.addressFormatted) {
      timeouts.push(setTimeout(() => {
        setFormData(prev => ({ 
          ...prev, 
          addressStreet: 'Nachal Dolev', 
          addressCity: 'Beit Shemesh',
          addressFormatted: 'Nachal Dolev, Beit Shemesh' 
        }));
        toast.info("📍 Listener detected address: Nachal Dolev", {
          icon: <Sparkles className="h-4 w-4 text-yellow-400" />,
          duration: 3000
        });
      }, 2000));
    }

    // Simulate finding caller info after 3.5 seconds
    if (!formData.callerName && !formData.callerPhone) {
      timeouts.push(setTimeout(() => {
        setFormData(prev => ({ 
          ...prev, 
          callerName: 'Yossi Levi',
          callerPhone: '052-555-1234'
        }));
        toast.info("👤 Listener identified caller: Yossi Levi", {
          icon: <Sparkles className="h-4 w-4 text-blue-400" />,
          duration: 3000
        });
      }, 3500));
    }

    // Simulate finding chief complaint after 5 seconds
    if (!formData.chiefComplaint) {
      timeouts.push(setTimeout(() => {
        setFormData(prev => ({ 
          ...prev, 
          chiefComplaint: 'Chest Pain',
          description: 'Patient reporting severe chest pressure radiating to left arm. History of cardiac issues.',
          patientAge: '65',
          patientGender: 'male',
          priority: '1'
        }));
        toast.error("🚨 Listener detected emergency: Chest Pain (Priority 1)", {
          icon: <Wand2 className="h-4 w-4 text-white" />,
          duration: 4000,
          style: { background: '#DC1E2E', color: 'white', border: 'none' }
        });
      }, 5000));
    }

    return () => timeouts.forEach(clearTimeout);
  }, [isListenerActive, formData.addressStreet, formData.callerName, formData.chiefComplaint]);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleDropUnit = (item: { id: string, name: string }) => {
    if (!formData.unitsAssigned.includes(item.id)) {
      setFormData(prev => ({ ...prev, unitsAssigned: [...prev.unitsAssigned, item.id] }));
      toast.success(`Unit ${item.name} assigned`);
    }
  };

  const handleRemoveUnit = (id: string) => {
    setFormData(prev => ({ ...prev, unitsAssigned: prev.unitsAssigned.filter(u => u !== id) }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    
    const payload = {
      ...formData,
      priority: parseInt(formData.priority),
      patientAge: formData.patientAge ? parseInt(formData.patientAge) : undefined,
      chiefComplaintText: formData.chiefComplaint,
      timeCallReceived: formData.callTime,
      addressFormatted: formData.addressFormatted || `${formData.addressStreet} ${formData.addressApt ? 'Apt ' + formData.addressApt : ''}, ${formData.addressCity}`
    };

    let result;
    if (incident) {
      // Mock update
      result = incident; 
      toast.info("Incident updated locally (mock)");
    } else {
      result = await api.createIncident(payload);
    }

    setLoading(false);
    
    if (result) {
      toast.success(incident ? 'Incident updated' : 'Incident created');
      if (onSave) onSave(result);
      onClose();
    } else {
      toast.error('Failed to save incident');
    }
  };

  // Filter available units
  const availableUnits = units.filter(u => 
    !formData.unitsAssigned.includes(u.id) &&
    (u.name.toLowerCase().includes(unitSearch.toLowerCase()) || u.status.includes(unitSearch.toLowerCase()))
  );

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-[1000px] h-[90vh] flex flex-col p-0 gap-0 bg-white overflow-hidden shadow-2xl rounded-xl border-0">
        <DialogDescription className="sr-only">Incident Intake Form</DialogDescription>
        
        {/* Header - Red Bar */}
        <div className="bg-[#E60000] text-white px-6 py-4 flex justify-between items-center shrink-0">
          <DialogTitle className="text-xl font-extrabold tracking-wide flex items-center gap-3">
            {incident ? 'EDIT INCIDENT' : 'NEW INCIDENT'}
            {isListenerActive && (
               <Badge className="bg-white text-red-600 animate-pulse border-none ml-2 flex items-center gap-1">
                 <Mic className="h-3 w-3" /> Listening...
               </Badge>
            )}
          </DialogTitle>
          <div className="flex items-center gap-4">
             {/* Silent Listener Toggle */}
             <Button 
               size="sm" 
               variant="secondary" 
               className={`
                 border-none font-bold h-8 transition-all gap-2 shadow-sm
                 ${isListenerActive 
                   ? 'bg-red-950 text-white shadow-[0_0_15px_rgba(255,255,255,0.3)] ring-1 ring-white/30' 
                   : 'bg-white/10 hover:bg-white/20 text-white'}
               `}
               onClick={() => setIsListenerActive(!isListenerActive)}
               title="Toggle AI Listener"
             >
               {isListenerActive ? <Sparkles className="h-4 w-4 animate-spin-slow" /> : <MicOff className="h-4 w-4 opacity-70" />}
               {isListenerActive ? 'AI ACTIVE' : 'AI ASSIST'}
             </Button>

             <div className="w-px h-6 bg-white/20"></div>

             <div className="flex items-center gap-2 text-sm font-medium opacity-90">
                <Clock className="h-4 w-4" />
                {new Date().toLocaleTimeString()}
             </div>
             {incident && (
               <Button size="sm" variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-none font-semibold h-8" onClick={() => setShowPCR(true)}>
                 <FileText className="h-4 w-4 mr-2" /> PCR
               </Button>
             )}
          </div>
        </div>

        {/* Main Content - Two Column Layout */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Left Column: Call Intake */}
          <div className="w-[500px] flex flex-col bg-white border-r border-gray-200">
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
                <div className="flex justify-between items-center mb-1">
                  <h3 className="text-[#E60000] font-bold text-base flex items-center gap-2 uppercase tracking-wide">
                    <Phone className="h-5 w-5" /> Call Take
                  </h3>
                  {isListenerActive && (
                    <span className="text-xs font-medium text-blue-600 flex items-center gap-1 animate-in fade-in">
                      <Sparkles className="h-3 w-3" /> Auto-filling from audio...
                    </span>
                  )}
                </div>
                
                {/* Dispatcher Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold text-gray-500 uppercase">Call Taker</Label>
                    <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-md text-sm font-bold text-blue-900 shadow-sm truncate">
                      {formData.callTaker}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold text-gray-500 uppercase">Backup Taker</Label>
                    <Input 
                      value={formData.backupCallTaker} 
                      onChange={(e) => handleChange('backupCallTaker', e.target.value)}
                      placeholder="Optional"
                      className="bg-gray-50 border-gray-200 text-sm h-[38px]"
                    />
                  </div>
                </div>

                {/* Phone Numbers */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold text-gray-500 uppercase">Primary Phone</Label>
                    <Input 
                      value={formData.callerPhone} 
                      onChange={(e) => handleChange('callerPhone', e.target.value)}
                      className={cn(
                        "border-l-[4px] border-l-[#1E4A9C] bg-white h-[42px] text-base font-bold shadow-sm transition-colors",
                        isListenerActive && formData.callerPhone === '052-555-1234' && "bg-blue-50/50"
                      )}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold text-gray-500 uppercase">Secondary Phone</Label>
                    <Input 
                      value={formData.secondCallerPhone} 
                      onChange={(e) => handleChange('secondCallerPhone', e.target.value)}
                      className="bg-gray-50 border-gray-200 h-[42px] shadow-sm"
                    />
                  </div>
                </div>

                {/* Caller Name */}
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold text-gray-500 uppercase">Caller Name</Label>
                  <Input 
                    value={formData.callerName} 
                    onChange={(e) => handleChange('callerName', e.target.value)}
                    className={cn(
                      "bg-gray-50 border-gray-200 h-[42px] shadow-sm font-medium text-gray-800 transition-colors",
                      isListenerActive && formData.callerName === 'Yossi Levi' && "bg-blue-50/50"
                    )}
                  />
                </div>

                {/* Location Box */}
                <div className="p-4 rounded-lg border border-gray-200 shadow-sm bg-white space-y-4 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-gray-200"></div>
                  <h4 className="text-[11px] font-bold text-[#1E4A9C] uppercase flex items-center gap-1.5 ml-1">
                    <MapPin className="h-3.5 w-3.5" /> Location
                  </h4>
                  
                  <div className="space-y-1 ml-1">
                    <Label className="text-[10px] font-semibold text-gray-400 uppercase">Search Address</Label>
                    <Input 
                      value={formData.addressFormatted} 
                      onChange={(e) => handleChange('addressFormatted', e.target.value)}
                      placeholder="Start typing to search..."
                      className={cn(
                        "bg-white border-gray-300 h-[38px] transition-colors",
                        isListenerActive && formData.addressFormatted.includes('Nachal Dolev') && "bg-yellow-50"
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3 ml-1">
                     <div className="col-span-2 space-y-1">
                       <Label className="text-[10px] font-semibold text-gray-400 uppercase">Street</Label>
                       <Input 
                         value={formData.addressStreet} 
                         onChange={(e) => handleChange('addressStreet', e.target.value)} 
                         className="bg-white border-gray-300 h-[38px] font-medium"
                       />
                     </div>
                     <div className="space-y-1">
                       <Label className="text-[10px] font-semibold text-gray-400 uppercase">City</Label>
                       <Select value={formData.addressCity} onValueChange={(v) => handleChange('addressCity', v)}>
                         <SelectTrigger className="bg-white border-gray-300 h-[38px] font-medium text-xs">
                           <SelectValue />
                         </SelectTrigger>
                         <SelectContent>
                           <SelectItem value="Beit Shemesh">Beit Shemesh</SelectItem>
                           <SelectItem value="Jerusalem">Jerusalem</SelectItem>
                         </SelectContent>
                       </Select>
                     </div>
                  </div>

                  <div className="grid grid-cols-4 gap-3 ml-1">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-semibold text-gray-400 uppercase">Entrance</Label>
                      <Input 
                        value={formData.addressEntrance} 
                        onChange={(e) => handleChange('addressEntrance', e.target.value)}
                        className="bg-white border-gray-300 h-[38px] text-center font-medium" 
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-semibold text-gray-400 uppercase">Floor</Label>
                      <Input 
                        value={formData.addressFloor} 
                        onChange={(e) => handleChange('addressFloor', e.target.value)}
                        className="bg-white border-gray-300 h-[38px] text-center font-medium" 
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-semibold text-gray-400 uppercase">Apt</Label>
                      <Input 
                        value={formData.addressApt} 
                        onChange={(e) => handleChange('addressApt', e.target.value)}
                        className="bg-white border-gray-300 h-[38px] text-center font-medium" 
                      />
                    </div>
                    <div className="space-y-1">
                       <Label className="text-[10px] font-semibold text-gray-400 uppercase">Type</Label>
                       <Select value={formData.addressType} onValueChange={(v) => handleChange('addressType', v)}>
                         <SelectTrigger className="bg-white border-gray-300 h-[38px] text-xs px-2">
                           <SelectValue />
                         </SelectTrigger>
                         <SelectContent>
                           <SelectItem value="home">Home</SelectItem>
                           <SelectItem value="business">Business</SelectItem>
                           <SelectItem value="public">Public</SelectItem>
                         </SelectContent>
                       </Select>
                    </div>
                  </div>
                </div>

                {/* Risks */}
                <div className="grid grid-cols-2 gap-4">
                   <div className="bg-[#FFF0F0] p-3 rounded-lg border border-[#FFE0E0] flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
                      <Label className="text-[#D60000] font-bold text-sm cursor-pointer" htmlFor="safety-switch">Safety Risk?</Label>
                      <Switch 
                        id="safety-switch"
                        checked={formData.isSafetyRisk} 
                        onCheckedChange={(c) => handleChange('isSafetyRisk', c)} 
                        className="data-[state=checked]:bg-[#D60000]"
                      />
                   </div>
                   <div className="bg-[#FFFDF0] p-3 rounded-lg border border-[#FFF8CC] flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
                      <Label className="text-[#B38F00] font-bold text-sm cursor-pointer" htmlFor="infect-switch">Infection Risk?</Label>
                      <Switch 
                        id="infect-switch"
                        checked={formData.isInfectionRisk} 
                        onCheckedChange={(c) => handleChange('isInfectionRisk', c)}
                        className="data-[state=checked]:bg-[#E6B800]" 
                      />
                   </div>
                </div>

                {/* Chief Complaint */}
                <div className="space-y-4">
                   <div className="space-y-1.5">
                     <div className="flex justify-between">
                       <Label className="text-[11px] font-bold text-gray-500 uppercase">Chief Complaint</Label>
                       {isListenerActive && formData.chiefComplaint === 'Chest Pain' && (
                         <span className="text-[10px] font-bold text-red-600 animate-pulse">DETECTED: PRIORITY 1</span>
                       )}
                     </div>
                     <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                       <PopoverTrigger asChild>
                         <Button
                           variant="outline"
                           role="combobox"
                           aria-expanded={openCombobox}
                           className={cn(
                             "w-full justify-between border-l-[4px] border-l-[#DC1E2E] bg-white h-[48px] text-lg font-bold text-gray-800 shadow-sm hover:bg-white",
                             isListenerActive && formData.chiefComplaint === 'Chest Pain' && "bg-red-50"
                           )}
                         >
                           {formData.chiefComplaint
                             ? formData.chiefComplaint
                             : "Select emergency type..."}
                           <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                         </Button>
                       </PopoverTrigger>
                       <PopoverContent className="w-[450px] p-0" align="start">
                         <Command>
                           <CommandInput placeholder="Search emergency type..." />
                           <CommandList className="max-h-[300px]">
                             <CommandEmpty>No complaint found.</CommandEmpty>
                             {CHIEF_COMPLAINTS.map((group) => (
                               <CommandGroup key={group.category} heading={group.category}>
                                 {group.items.map((item) => (
                                   <CommandItem
                                     key={item}
                                     value={item}
                                     onSelect={(currentValue) => {
                                       handleChange('chiefComplaint', currentValue);
                                       setOpenCombobox(false);
                                     }}
                                   >
                                     <Check
                                       className={cn(
                                         "mr-2 h-4 w-4",
                                         formData.chiefComplaint === item ? "opacity-100" : "opacity-0"
                                       )}
                                     />
                                     {item}
                                   </CommandItem>
                                 ))}
                               </CommandGroup>
                             ))}
                           </CommandList>
                         </Command>
                       </PopoverContent>
                     </Popover>
                   </div>

                   <div className="grid grid-cols-4 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-[11px] font-bold text-gray-500 uppercase">Age</Label>
                        <Input 
                          type="number" 
                          value={formData.patientAge} 
                          onChange={(e) => handleChange('patientAge', e.target.value)}
                          className="bg-white border-gray-200 h-[38px] font-medium"
                        />
                      </div>
                      <div className="space-y-1.5 col-span-1">
                         <Label className="text-[11px] font-bold text-gray-500 uppercase">Unit</Label>
                         <Select value={formData.patientAgeUnit} onValueChange={(v) => handleChange('patientAgeUnit', v)}>
                           <SelectTrigger className="bg-white border-gray-200 h-[38px] text-xs"><SelectValue /></SelectTrigger>
                           <SelectContent>
                             <SelectItem value="years">Years</SelectItem>
                             <SelectItem value="months">Months</SelectItem>
                           </SelectContent>
                         </Select>
                      </div>
                      <div className="space-y-1.5 col-span-2">
                         <Label className="text-[11px] font-bold text-gray-500 uppercase">Gender</Label>
                         <Select value={formData.patientGender} onValueChange={(v) => handleChange('patientGender', v)}>
                           <SelectTrigger className="bg-white border-gray-200 h-[38px] text-xs"><SelectValue /></SelectTrigger>
                           <SelectContent>
                             <SelectItem value="male">Male</SelectItem>
                             <SelectItem value="female">Female</SelectItem>
                             <SelectItem value="unknown">Unknown</SelectItem>
                           </SelectContent>
                         </Select>
                      </div>
                   </div>

                   <div className="space-y-1.5">
                     <Label className="text-[11px] font-bold text-gray-500 uppercase">Description / Notes</Label>
                     <Textarea 
                       value={formData.description} 
                       onChange={(e) => handleChange('description', e.target.value)}
                       className={cn(
                         "min-h-[100px] resize-none bg-white border-gray-200 shadow-sm p-3 transition-colors",
                         isListenerActive && formData.description.includes('reporting severe') && "bg-yellow-50/30"
                       )}
                       placeholder="Detailed situation report..."
                     />
                   </div>
                </div>
            </div>

            {/* Footer Buttons */}
            <div className="p-4 border-t border-gray-200 bg-gray-50 flex gap-3 shrink-0">
              <Button 
                onClick={handleSubmit} 
                className="flex-1 bg-[#00C853] hover:bg-[#00A844] text-white font-extrabold h-12 text-base shadow-md transition-all active:scale-[0.99]"
                disabled={loading}
              >
                {loading ? 'SAVING...' : 'NOTIFY & DISPATCH'}
              </Button>
              <Button 
                variant="destructive" 
                className="w-12 h-12 p-0 bg-[#FF0000] hover:bg-[#D60000] shadow-md rounded-lg"
                title="Discard"
                onClick={onClose}
              >
                <Trash2 className="h-5 w-5" />
              </Button>
              <div className="w-4 bg-[#FFC107] rounded-r-lg shadow-sm"></div>
            </div>
          </div>

          {/* Right Column: Dispatch Resources */}
          <div className="flex-1 flex flex-col bg-gray-50 border-l border-gray-200 h-full overflow-hidden">
             
             <div className="flex-1 p-6 flex flex-col overflow-hidden">
               <h3 className="text-[#1E4A9C] font-bold text-base mb-6 flex items-center gap-2 uppercase tracking-wide">
                 <User className="h-5 w-5" /> Dispatch Resources
               </h3>

               {/* Droppable Assigned Units Area */}
               <div className="shrink-0 mb-6">
                 <Label className="text-[11px] font-bold text-gray-400 mb-2 block uppercase tracking-wider">ASSIGNED UNITS ({formData.unitsAssigned.length})</Label>
                 <DroppableArea 
                   assignedUnits={formData.unitsAssigned} 
                   allUnits={units}
                   onDrop={handleDropUnit}
                   onRemove={handleRemoveUnit}
                 />
               </div>
               
               {/* Available Units (Draggable) */}
               <div className="flex-1 flex flex-col min-h-0">
                 <Label className="text-[11px] font-bold text-gray-400 mb-2 block uppercase tracking-wider">AVAILABLE RESOURCES</Label>
                 <div className="relative mb-3 shrink-0">
                   <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                   <Input 
                     placeholder="Search or type unit number..." 
                     className="pl-9 bg-white border-gray-200 h-10 shadow-sm rounded-lg"
                     value={unitSearch}
                     onChange={(e) => setUnitSearch(e.target.value)}
                   />
                 </div>
                 
                 <div className="flex-1 overflow-y-auto min-h-0 pr-1 space-y-2 pb-4 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
                   {availableUnits.length === 0 ? (
                     <div className="text-center text-gray-400 text-sm py-8 bg-gray-100/50 rounded-lg border border-dashed border-gray-200 mx-1">
                       {unitSearch ? 'No matching units found' : 'No available units'}
                     </div>
                   ) : (
                     availableUnits.map(unit => (
                       <DraggableUnit key={unit.id} unit={unit} />
                     ))
                   )}
                 </div>
               </div>
             </div>
             
             {/* Map Preview - Stick to bottom */}
             <div className="h-[280px] bg-gray-200 border-t border-gray-200 shrink-0 relative shadow-inner">
                 <div className="absolute inset-0 bg-[url('https://upload.wikimedia.org/wikipedia/commons/b/bd/Google_Maps_2014_icon.png')] bg-cover bg-center opacity-60 mix-blend-multiply grayscale-[0.2]"></div>
                 <div className="absolute bottom-6 left-6 right-6 bg-white/95 p-4 rounded-xl shadow-lg backdrop-blur-sm text-center border border-gray-200/50 transform transition-transform hover:scale-[1.02]">
                   <p className="font-bold text-gray-800 text-base mb-1">Map Preview</p>
                   <p className="text-xs text-gray-500">Live location data would appear here</p>
                 </div>
             </div>
          </div>
        </div>
      </DialogContent>
      
      {incident && (
        <PCRForm 
          open={showPCR} 
          onClose={() => setShowPCR(false)} 
          incidentId={incident._id}
        />
      )}
    </Dialog>
  );
}
