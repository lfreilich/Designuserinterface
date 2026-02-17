import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Plus, Check, ChevronRight, ChevronLeft, AlertTriangle, User, MapPin, Phone, Stethoscope } from 'lucide-react';
import { ActiveCall } from './ActiveCallCard';

interface CallTriageProps {
  onSubmit: (call: ActiveCall) => void;
}

type TriageStep = 'intake' | 'assessment' | 'dispatch';

const INITIAL_FORM_STATE = {
  caller: '',
  phone: '',
  address: '',
  type: '',
  severity: 1,
  conscious: 'unknown',
  breathing: 'unknown',
  bleeding: 'unknown',
  notes: '',
};

export function CallTriage({ onSubmit }: CallTriageProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<TriageStep>('intake');
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);

  const calculatePriority = (): ActiveCall['priority'] => {
    if (formData.conscious === 'no' || formData.breathing === 'no' || formData.severity > 8) return 'critical';
    if (formData.bleeding === 'severe' || formData.severity > 6) return 'high';
    if (formData.severity > 3) return 'medium';
    return 'low';
  };

  const priority = calculatePriority();

  const handleSubmit = () => {
    const newCall: ActiveCall = {
      id: Date.now().toString(),
      address: formData.address,
      type: formData.type || 'General Medical',
      priority: priority,
      caller: formData.caller,
      phone: formData.phone,
      time: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
      units: [],
      status: 'pending',
      eta: 'Calculating...',
    };
    
    onSubmit(newCall);
    setOpen(false);
    // Reset form after a delay
    setTimeout(() => {
      setStep('intake');
      setFormData(INITIAL_FORM_STATE);
    }, 500);
  };

  const nextStep = () => {
    if (step === 'intake') setStep('assessment');
    else if (step === 'assessment') setStep('dispatch');
  };

  const prevStep = () => {
    if (step === 'dispatch') setStep('assessment');
    else if (step === 'assessment') setStep('intake');
  };

  const getProgress = () => {
    if (step === 'intake') return 33;
    if (step === 'assessment') return 66;
    return 100;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-[#DC1E2E] hover:bg-[#B01825] text-white shadow-md">
          <Plus className="h-4 w-4 mr-2" />
          New Emergency
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <div className="flex items-center justify-between pr-8">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Stethoscope className="h-5 w-5 text-[#DC1E2E]" />
              New Call Triage
            </DialogTitle>
            <Badge variant="outline" className="text-xs">
              Protocol v2.4
            </Badge>
          </div>
          <div className="pt-4">
            <Progress value={getProgress()} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground mt-1 px-1">
              <span className={step === 'intake' ? 'font-bold text-[#1E4A9C]' : ''}>1. Intake</span>
              <span className={step === 'assessment' ? 'font-bold text-[#1E4A9C]' : ''}>2. Assessment</span>
              <span className={step === 'dispatch' ? 'font-bold text-[#1E4A9C]' : ''}>3. Dispatch</span>
            </div>
          </div>
        </DialogHeader>

        <div className="mt-4 min-h-[300px]">
          {step === 'intake' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="caller" className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-400" />
                    Caller Name
                  </Label>
                  <Input
                    id="caller"
                    placeholder="Ask: What is your name?"
                    value={formData.caller}
                    onChange={(e) => setFormData({ ...formData, caller: e.target.value })}
                    className="bg-gray-50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-400" />
                    Callback Number
                  </Label>
                  <Input
                    id="phone"
                    placeholder="Ask: What is the best number to reach you?"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="bg-gray-50"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  Exact Location
                </Label>
                <Input
                  id="address"
                  placeholder="Ask: What is the exact address of the emergency?"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="bg-gray-50 border-[#1E4A9C]/30 focus:border-[#1E4A9C]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Nature of Call</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger className="bg-gray-50">
                    <SelectValue placeholder="Select primary complaint" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cardiac Arrest">Cardiac Arrest</SelectItem>
                    <SelectItem value="Respiratory Distress">Respiratory Distress</SelectItem>
                    <SelectItem value="Trauma">Trauma / Injury</SelectItem>
                    <SelectItem value="Unconscious">Unconscious / Fainting</SelectItem>
                    <SelectItem value="Pediatric">Pediatric Emergency</SelectItem>
                    <SelectItem value="MVA">Car Accident</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {step === 'assessment' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                <h4 className="font-semibold text-[#1E4A9C] mb-3">Primary Assessment</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Conscious?</Label>
                    <Select
                      value={formData.conscious}
                      onValueChange={(value) => setFormData({ ...formData, conscious: value })}
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yes">Yes</SelectItem>
                        <SelectItem value="no">No</SelectItem>
                        <SelectItem value="unknown">Unknown</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Breathing?</Label>
                    <Select
                      value={formData.breathing}
                      onValueChange={(value) => setFormData({ ...formData, breathing: value })}
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yes">Normal</SelectItem>
                        <SelectItem value="difficulty">Difficulty</SelectItem>
                        <SelectItem value="no">No / Agonal</SelectItem>
                        <SelectItem value="unknown">Unknown</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Bleeding?</Label>
                    <Select
                      value={formData.bleeding}
                      onValueChange={(value) => setFormData({ ...formData, bleeding: value })}
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="controlled">Controlled</SelectItem>
                        <SelectItem value="severe">Severe</SelectItem>
                        <SelectItem value="unknown">Unknown</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Reported Severity (1-10)</Label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setFormData({ ...formData, severity: num })}
                      className={`h-10 w-10 rounded-full font-bold transition-all ${
                        formData.severity === num
                          ? 'bg-[#1E4A9C] text-white scale-110 shadow-lg'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Additional Notes</Label>
                <Textarea
                  placeholder="Enter any specific details, gate codes, or hazards..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="bg-gray-50 h-24"
                />
              </div>
            </div>
          )}

          {step === 'dispatch' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300 text-center">
              <div className="flex flex-col items-center justify-center py-6">
                <div className={`h-24 w-24 rounded-full flex items-center justify-center mb-4 ${
                  priority === 'critical' ? 'bg-red-100 text-red-600' :
                  priority === 'high' ? 'bg-orange-100 text-orange-600' :
                  'bg-yellow-100 text-yellow-600'
                }`}>
                  <AlertTriangle className="h-12 w-12" />
                </div>
                <h3 className="text-2xl font-bold">Recommended Priority: {priority.toUpperCase()}</h3>
                <p className="text-muted-foreground mt-2 max-w-md">
                  Based on the assessment, this call requires {priority} response level.
                  Please confirm to generate dispatch ticket.
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg text-left max-w-md mx-auto">
                <h4 className="font-semibold text-sm text-gray-500 uppercase tracking-wider mb-2">Summary</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Location:</span>
                    <span className="font-medium">{formData.address}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Type:</span>
                    <span className="font-medium">{formData.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Patient Status:</span>
                    <span className="font-medium">
                      {formData.conscious === 'yes' ? 'Conscious' : 'Unconscious'}, 
                      {formData.breathing === 'yes' ? ' Breathing' : ' Not Breathing'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-between mt-6 pt-4 border-t">
          <Button 
            variant="outline" 
            onClick={prevStep} 
            disabled={step === 'intake'}
            className="w-24"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          
          {step !== 'dispatch' ? (
            <Button 
              onClick={nextStep}
              className="w-24 bg-[#1E4A9C] hover:bg-[#1a4088] text-white"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button 
              onClick={handleSubmit}
              className="w-32 bg-green-600 hover:bg-green-700 text-white"
            >
              <Check className="h-4 w-4 mr-2" />
              Dispatch
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
