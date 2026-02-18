import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Switch } from '../components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { FileText, Save, CheckCircle, Clock, Plus, Trash2, Printer, Share2, AlertTriangle, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import * as api from '../services/api';
import { projectId } from '/utils/supabase/info';

interface PCRFormProps {
  open: boolean;
  onClose: () => void;
  incidentId: string;
}

interface Vitals {
  time: string;
  bpSystolic: string;
  bpDiastolic: string;
  hr: string;
  rr: string;
  spo2: string;
  gcs: string;
}

interface Treatment {
  time: string;
  name: string;
  dose: string;
  route: string;
}

export function PCRForm({ open, onClose, incidentId }: PCRFormProps) {
  const [loading, setLoading] = useState(false);
  const [pcrData, setPcrData] = useState<api.IncidentPCR | null>(null);
  const [activeTab, setActiveTab] = useState('patient');
  
  // Form State
  const [patientInfo, setPatientInfo] = useState({
    firstName: '',
    lastName: '',
    age: '',
    gender: 'unknown',
    complaint: '',
    history: '',
    allergies: '',
    medications: '',
  });

  const [vitals, setVitals] = useState<Vitals[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  
  const [outcome, setOutcome] = useState({
    clinicalImpression: '',
    triageCategory: 'Urgent',
    disposition: 'Transported',
    destination: '',
    narrative: '',
  });

  // Load PCR data if exists
  useEffect(() => {
    if (open && incidentId) {
      loadPCR();
    }
  }, [open, incidentId]);

  const loadPCR = async () => {
    setLoading(true);
    try {
      // Check if incident already has a PCR
      // We don't have a direct "get PCR by Incident ID" endpoint, but we can assume incident stores pcrId
      // For now, let's just try to fetch via a convention or create new
      // In a real app, we'd fetch the incident first to get pcrId
      
      // Simulating fetch or create logic:
      const pcrId = `pcr_${incidentId}`; // Simple deterministic ID for demo
      const result = await api.getPCR(pcrId);

      // Now api.getPCR returns an object { pcr, observations, treatments } even if null.
      const pcr = result.pcr;

      if (pcr) {
        setPcrData(pcr);
        setPatientInfo({
          firstName: pcr.patientFirstName || '',
          lastName: pcr.patientLastName || '',
          age: pcr.patientAge || '',
          gender: pcr.patientGender || 'unknown',
          complaint: pcr.chiefComplaintText || '',
          history: pcr.history || '',
          allergies: pcr.allergies || '',
          medications: pcr.medications || '',
        });
        setOutcome({
          clinicalImpression: pcr.clinicalImpression || '',
          triageCategory: pcr.triageCategory || 'Urgent',
          disposition: pcr.outcome || 'Transported',
          destination: pcr.transportDestination || '',
          narrative: '', // Assuming narrative not stored on main object for now
        });
      } else {
        // Prepare new form
        setPcrData(null);
      }
    } catch (error) {
      console.error("Error loading PCR:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (submit = false) => {
    setLoading(true);
    try {
      const payload = {
        incidentId,
        id: `pcr_${incidentId}`, // Deterministic ID for demo
        patientFirstName: patientInfo.firstName,
        patientLastName: patientInfo.lastName,
        patientAge: patientInfo.age,
        patientGender: patientInfo.gender,
        chiefComplaintText: patientInfo.complaint,
        history: patientInfo.history,
        allergies: patientInfo.allergies,
        medications: patientInfo.medications,
        clinicalImpression: outcome.clinicalImpression,
        triageCategory: outcome.triageCategory,
        outcome: outcome.disposition,
        transportDestination: outcome.destination,
        status: submit ? 'submitted' : 'active',
        submittedAt: submit ? new Date().toISOString() : undefined,
      };

      let result;
      if (pcrData) {
        result = await api.updatePCR(payload.id, payload);
      } else {
        result = await api.createPCR(payload);
      }
      
      setPcrData(result);
      toast.success(submit ? "PCR Submitted Successfully" : "Draft Saved");
      
      if (submit) {
        // Maybe close or switch to view mode
      }
    } catch (error) {
      toast.error("Failed to save PCR");
    } finally {
      setLoading(false);
    }
  };

  const addVital = () => {
    setVitals([...vitals, { time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}), bpSystolic: '', bpDiastolic: '', hr: '', rr: '', spo2: '', gcs: '' }]);
  };

  const removeVital = (index: number) => {
    setVitals(vitals.filter((_, i) => i !== index));
  };

  const updateVital = (index: number, field: keyof Vitals, value: string) => {
    const newVitals = [...vitals];
    newVitals[index] = { ...newVitals[index], [field]: value };
    setVitals(newVitals);
  };

  const isSubmitted = pcrData?.status === 'submitted';

  // --- RENDER COMPLETED VIEW ---
  if (isSubmitted) {
    return (
       <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
         <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 gap-0 bg-gray-50">
            <DialogDescription className="sr-only">PCR Submission Summary</DialogDescription>
            <div className="bg-[#1E4A9C] text-white px-6 py-4 flex justify-between items-center shrink-0">
               <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                  <CheckCircle className="h-6 w-6 text-green-400" /> 
                  PCR SUBMITTED
               </DialogTitle>
               <Button variant="ghost" className="text-white hover:bg-white/10" onClick={onClose}>Close</Button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8">
               <Card className="max-w-3xl mx-auto shadow-lg border-t-4 border-t-green-500">
                  <CardHeader className="text-center border-b pb-6">
                     <div className="mx-auto bg-green-100 text-green-700 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                        <FileText className="h-8 w-8" />
                     </div>
                     <CardTitle className="text-2xl text-gray-800">Patient Care Report Completed</CardTitle>
                     <CardDescription>
                        Reference ID: {pcrData?._id} • Submitted: {new Date(pcrData?.submittedAt || '').toLocaleString()}
                     </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-8 pb-8 space-y-6">
                     
                     <div className="grid grid-cols-2 gap-8 text-sm">
                        <div>
                           <h4 className="font-bold text-gray-500 uppercase text-xs mb-2">Patient Details</h4>
                           <p className="text-lg font-medium text-gray-900">{pcrData?.patientFirstName} {pcrData?.patientLastName}</p>
                           <p className="text-gray-600">{pcrData?.patientAge} {pcrData?.patientGender}</p>
                        </div>
                        <div>
                           <h4 className="font-bold text-gray-500 uppercase text-xs mb-2">Incident</h4>
                           <p className="text-lg font-medium text-gray-900">{pcrData?.chiefComplaintText}</p>
                           <p className="text-gray-600">Transported to {pcrData?.transportDestination || 'N/A'}</p>
                        </div>
                     </div>

                     <div className="bg-gray-50 rounded-lg p-6 border border-gray-100 flex flex-col items-center gap-4">
                        <p className="text-sm text-gray-500 text-center max-w-md">
                           The official medical record has been generated and archived. You can download a copy or share it with the receiving facility.
                        </p>
                        <div className="flex gap-3 w-full max-w-sm">
                           <Button className="flex-1 gap-2" variant="outline" onClick={() => window.open(`https://${projectId}.supabase.co/functions/v1/make-server-2750c780/pcrs/${pcrData?._id}/pdf`, '_blank')}>
                              <Printer className="h-4 w-4" /> Download PDF
                           </Button>
                           <Button className="flex-1 gap-2" onClick={() => toast.success("Sent to hospital portal")}>
                              <Share2 className="h-4 w-4" /> Share
                           </Button>
                        </div>
                     </div>

                  </CardContent>
               </Card>
            </div>
         </DialogContent>
       </Dialog>
    );
  }

  // --- RENDER EDIT FORM ---
  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-5xl h-[95vh] flex flex-col p-0 gap-0 bg-gray-50 overflow-hidden">
        <DialogDescription className="sr-only">Incident ePCR Form</DialogDescription>
        
        {/* Header */}
        <div className="bg-[#1E4A9C] text-white px-6 py-4 flex justify-between items-center shrink-0 shadow-md z-10">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <FileText className="h-5 w-5 opacity-80" /> 
            ePCR <span className="text-blue-200 font-normal mx-1">/</span> {patientInfo.firstName ? `${patientInfo.firstName} ${patientInfo.lastName}` : 'New Report'}
          </DialogTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-blue-900/50 text-blue-100 border-blue-400/30">
              {pcrData ? 'DRAFT SAVED' : 'UNSAVED'}
            </Badge>
            <Button size="sm" variant="secondary" className="bg-white/10 hover:bg-white/20 text-white border-none" onClick={() => handleSave(false)}>
              <Save className="h-4 w-4 mr-2" /> Save Draft
            </Button>
            <Button size="sm" className="bg-green-500 hover:bg-green-600 text-white font-bold" onClick={() => handleSave(true)}>
              Submit Report <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>

        {/* Tabs & Content */}
        <div className="flex-1 flex overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            
            <div className="bg-white border-b border-gray-200 px-6 py-2">
              <TabsList className="bg-gray-100 p-1">
                <TabsTrigger value="patient" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">Patient Info</TabsTrigger>
                <TabsTrigger value="assessment" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">Assessment</TabsTrigger>
                <TabsTrigger value="vitals" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">Vitals & Obs</TabsTrigger>
                <TabsTrigger value="treatment" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">Treatments</TabsTrigger>
                <TabsTrigger value="outcome" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">Outcome</TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
              
              {/* PATIENT INFO TAB */}
              <TabsContent value="patient" className="m-0 space-y-6 max-w-4xl mx-auto">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Demographics</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>First Name</Label>
                      <Input value={patientInfo.firstName} onChange={e => setPatientInfo({...patientInfo, firstName: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Last Name</Label>
                      <Input value={patientInfo.lastName} onChange={e => setPatientInfo({...patientInfo, lastName: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Age</Label>
                        <Input type="number" value={patientInfo.age} onChange={e => setPatientInfo({...patientInfo, age: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <Label>Gender</Label>
                        <Select value={patientInfo.gender} onValueChange={v => setPatientInfo({...patientInfo, gender: v})}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                            <SelectItem value="unknown">Unknown</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Medical History</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Chief Complaint</Label>
                      <Input value={patientInfo.complaint} onChange={e => setPatientInfo({...patientInfo, complaint: e.target.value})} placeholder="e.g. Chest Pain" />
                    </div>
                    <div className="space-y-2">
                      <Label>Past Medical History</Label>
                      <Textarea value={patientInfo.history} onChange={e => setPatientInfo({...patientInfo, history: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label>Allergies</Label>
                        <Textarea value={patientInfo.allergies} onChange={e => setPatientInfo({...patientInfo, allergies: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <Label>Current Medications</Label>
                        <Textarea value={patientInfo.medications} onChange={e => setPatientInfo({...patientInfo, medications: e.target.value})} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* VITALS TAB */}
              <TabsContent value="vitals" className="m-0 space-y-6 max-w-5xl mx-auto">
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                       <CardTitle>Vital Signs Log</CardTitle>
                       <Button size="sm" onClick={addVital}><Plus className="h-4 w-4 mr-2" /> Add Set</Button>
                    </CardHeader>
                    <CardContent>
                       {vitals.length === 0 ? (
                         <div className="text-center py-10 text-gray-400 border-2 border-dashed rounded-lg">
                           No vitals recorded. Click "Add Set" to begin.
                         </div>
                       ) : (
                         <div className="space-y-2">
                            <div className="grid grid-cols-8 gap-2 font-bold text-xs uppercase text-gray-500 mb-2 px-2">
                               <div className="col-span-1">Time</div>
                               <div className="col-span-1">BP Sys</div>
                               <div className="col-span-1">BP Dia</div>
                               <div className="col-span-1">HR</div>
                               <div className="col-span-1">RR</div>
                               <div className="col-span-1">SpO2 %</div>
                               <div className="col-span-1">GCS</div>
                               <div className="col-span-1"></div>
                            </div>
                            {vitals.map((v, i) => (
                               <div key={i} className="grid grid-cols-8 gap-2 items-center bg-white p-2 rounded-md border shadow-sm">
                                  <Input className="h-8" value={v.time} onChange={(e) => updateVital(i, 'time', e.target.value)} />
                                  <Input className="h-8" value={v.bpSystolic} onChange={(e) => updateVital(i, 'bpSystolic', e.target.value)} placeholder="120" />
                                  <Input className="h-8" value={v.bpDiastolic} onChange={(e) => updateVital(i, 'bpDiastolic', e.target.value)} placeholder="80" />
                                  <Input className="h-8" value={v.hr} onChange={(e) => updateVital(i, 'hr', e.target.value)} placeholder="72" />
                                  <Input className="h-8" value={v.rr} onChange={(e) => updateVital(i, 'rr', e.target.value)} placeholder="16" />
                                  <Input className="h-8" value={v.spo2} onChange={(e) => updateVital(i, 'spo2', e.target.value)} placeholder="98" />
                                  <Input className="h-8" value={v.gcs} onChange={(e) => updateVital(i, 'gcs', e.target.value)} placeholder="15" />
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => removeVital(i)}><Trash2 className="h-4 w-4" /></Button>
                               </div>
                            ))}
                         </div>
                       )}
                    </CardContent>
                 </Card>
              </TabsContent>

              {/* OUTCOME TAB */}
              <TabsContent value="outcome" className="m-0 space-y-6 max-w-4xl mx-auto">
                 <Card>
                    <CardHeader>
                       <CardTitle>Disposition & Transport</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                       <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-2">
                             <Label>Clinical Impression</Label>
                             <Input value={outcome.clinicalImpression} onChange={e => setOutcome({...outcome, clinicalImpression: e.target.value})} />
                          </div>
                          <div className="space-y-2">
                             <Label>Triage Category</Label>
                             <Select value={outcome.triageCategory} onValueChange={v => setOutcome({...outcome, triageCategory: v})}>
                               <SelectTrigger><SelectValue /></SelectTrigger>
                               <SelectContent>
                                 <SelectItem value="Critical">Critical (Red)</SelectItem>
                                 <SelectItem value="Urgent">Urgent (Yellow)</SelectItem>
                                 <SelectItem value="Non-Urgent">Non-Urgent (Green)</SelectItem>
                                 <SelectItem value="Dead">Deceased (Black)</SelectItem>
                               </SelectContent>
                             </Select>
                          </div>
                       </div>
                       
                       <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-2">
                             <Label>Disposition</Label>
                             <Select value={outcome.disposition} onValueChange={v => setOutcome({...outcome, disposition: v})}>
                               <SelectTrigger><SelectValue /></SelectTrigger>
                               <SelectContent>
                                 <SelectItem value="Transported">Transported by Ambulance</SelectItem>
                                 <SelectItem value="Refused">Patient Refused Care</SelectItem>
                                 <SelectItem value="Treated">Treated & Released</SelectItem>
                                 <SelectItem value="Cancelled">Cancelled on Scene</SelectItem>
                               </SelectContent>
                             </Select>
                          </div>
                          <div className="space-y-2">
                             <Label>Destination Hospital</Label>
                             <Select value={outcome.destination} onValueChange={v => setOutcome({...outcome, destination: v})}>
                               <SelectTrigger><SelectValue /></SelectTrigger>
                               <SelectContent>
                                 <SelectItem value="Hadassah Ein Kerem">Hadassah Ein Kerem</SelectItem>
                                 <SelectItem value="Shaare Zedek">Shaare Zedek</SelectItem>
                                 <SelectItem value="Hadassah Mt Scopus">Hadassah Mt Scopus</SelectItem>
                                 <SelectItem value="Assuta Ashdod">Assuta Ashdod</SelectItem>
                                 <SelectItem value="Kaplan">Kaplan</SelectItem>
                               </SelectContent>
                             </Select>
                          </div>
                       </div>

                       <div className="space-y-2">
                          <Label>Narrative / Notes</Label>
                          <Textarea 
                            className="min-h-[150px]" 
                            placeholder="Detailed narrative of events..." 
                            value={outcome.narrative}
                            onChange={e => setOutcome({...outcome, narrative: e.target.value})}
                          />
                       </div>
                    </CardContent>
                 </Card>
              </TabsContent>

              {/* Placeholder tabs for demo completeness */}
              <TabsContent value="assessment" className="m-0 max-w-4xl mx-auto text-center py-20 text-gray-400">
                 Assessment forms (Trauma/Medical/Burns) would go here.
              </TabsContent>
              <TabsContent value="treatment" className="m-0 max-w-4xl mx-auto text-center py-20 text-gray-400">
                 Medication & Procedure logs would go here.
              </TabsContent>

            </div>
          </Tabs>
        </div>

      </DialogContent>
    </Dialog>
  );
}
