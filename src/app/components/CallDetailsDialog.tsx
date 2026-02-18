import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Clock, User, MapPin, Phone, MessageSquare, Plus, Send, FileText, Share2 } from 'lucide-react';
import { ActiveCall } from './ActiveCallCard';
import * as api from '../services/api';
import { toast } from 'sonner';

interface CallDetailsDialogProps {
  call: ActiveCall | null;
  open: boolean;
  onClose: () => void;
}

export function CallDetailsDialog({ call, open, onClose }: CallDetailsDialogProps) {
  const [notes, setNotes] = useState<api.BackendNote[]>([]);
  const [newNote, setNewNote] = useState('');
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [pcrId, setPcrId] = useState<string | null>(null);

  useEffect(() => {
    if (call && open) {
      setLoadingNotes(true);
      api.getNotes(call.id).then(fetchedNotes => {
        setNotes(fetchedNotes);
        setLoadingNotes(false);
      });
      // In a real app we would check if a PCR exists for this call
      setPcrId(null); 
    }
  }, [call, open]);

  const handleAddNote = async () => {
    if (!call || !newNote.trim()) return;

    const note = await api.addNote(call.id, newNote);
    if (note) {
      setNotes([...notes, note]);
      setNewNote('');
    }
  };

  const handleCreatePCR = async () => {
    if (!call) return;
    const pcr = await api.createPCR(call.id, {
      patientFirstName: 'John', // Mock data
      patientLastName: 'Doe',
    });
    
    if (pcr) {
      setPcrId(pcr._id);
      toast.success('PCR Created', {
        description: `PCR #${pcr._id} has been initialized.`,
        action: {
          label: 'View PDF',
          onClick: () => window.open(api.getPCRPdfUrl(pcr._id), '_blank'),
        },
      });
    } else {
      toast.error('Failed to create PCR');
    }
  };

  const handleShareReport = async () => {
    if (!pcrId) {
      toast.error('No PCR created yet');
      return;
    }
    const success = await api.sharePCR(pcrId, 'hospital@example.com');
    if (success) {
      toast.success('Report Shared', {
        description: 'PCR Report has been emailed to the hospital.',
      });
    } else {
      toast.error('Failed to share report');
    }
  };

  if (!call) return null;

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between pr-8">
            <DialogTitle className="flex items-center gap-3 text-xl">
               <span className="font-mono text-muted-foreground text-base">#{call.id.slice(-6)}</span>
               {call.type}
            </DialogTitle>
            <Badge variant={call.priority === 'critical' ? 'destructive' : 'secondary'}>
              {call.priority.toUpperCase()}
            </Badge>
          </div>
        </DialogHeader>

        <Tabs defaultValue="details" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="notes">Notes ({notes.length})</TabsTrigger>
          </TabsList>
          
          <TabsContent value="details" className="flex-1 space-y-4 pt-4">
             <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 rounded-lg border">
                   <div className="flex items-center gap-2 text-sm font-medium text-gray-500 mb-1">
                      <MapPin className="h-4 w-4" /> Location
                   </div>
                   <div className="text-gray-900 font-medium">{call.address}</div>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg border">
                   <div className="flex items-center gap-2 text-sm font-medium text-gray-500 mb-1">
                      <Clock className="h-4 w-4" /> Time Received
                   </div>
                   <div className="text-gray-900 font-medium">{call.time}</div>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg border">
                   <div className="flex items-center gap-2 text-sm font-medium text-gray-500 mb-1">
                      <User className="h-4 w-4" /> Caller
                   </div>
                   <div className="text-gray-900 font-medium">{call.caller}</div>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg border">
                   <div className="flex items-center gap-2 text-sm font-medium text-gray-500 mb-1">
                      <Phone className="h-4 w-4" /> Callback
                   </div>
                   <div className="text-gray-900 font-medium font-mono">{call.phone}</div>
                </div>
             </div>
             
             <Separator />

             <div>
                <h4 className="font-semibold text-sm mb-2 text-gray-700">Assigned Units</h4>
                <div className="flex flex-wrap gap-2">
                   {call.units.length > 0 ? (
                     call.units.map(u => (
                       <Badge key={u} variant="secondary" className="px-3 py-1 text-sm bg-blue-50 text-blue-700 border-blue-200">
                         {u}
                       </Badge>
                     ))
                   ) : (
                     <span className="text-gray-400 italic text-sm">No units assigned</span>
                   )}
                </div>
             </div>
          </TabsContent>
          
          <TabsContent value="notes" className="flex-1 flex flex-col overflow-hidden pt-4 h-[400px]">
             <ScrollArea className="flex-1 pr-4">
                {loadingNotes ? (
                   <div className="text-center py-8 text-gray-400">Loading notes...</div>
                ) : notes.length === 0 ? (
                   <div className="text-center py-8 text-gray-400">No notes recorded</div>
                ) : (
                   <div className="space-y-4">
                      {notes.map((note) => (
                         <div key={note._id} className="flex gap-3">
                            <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                               <MessageSquare className="h-4 w-4 text-gray-500" />
                            </div>
                            <div className="flex-1 bg-gray-50 p-3 rounded-lg border border-gray-100">
                               <div className="flex justify-between items-start mb-1">
                                  <span className="font-bold text-xs text-gray-700">{note.userName}</span>
                                  <span className="text-[10px] text-gray-400">
                                    {new Date(note.createdAt).toLocaleTimeString([], { hour: '2-digit', minute:'2-digit' })}
                                  </span>
                               </div>
                               <p className="text-sm text-gray-800 whitespace-pre-wrap">{note.text}</p>
                            </div>
                         </div>
                      ))}
                   </div>
                )}
             </ScrollArea>
             
             <div className="pt-4 mt-auto">
                <div className="flex gap-2">
                   <Input 
                      placeholder="Add a note..." 
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
                   />
                   <Button size="icon" onClick={handleAddNote} disabled={!newNote.trim()}>
                      <Send className="h-4 w-4" />
                   </Button>
                </div>
             </div>
          </TabsContent>
        </Tabs>
        
        <DialogFooter className="mt-4 flex justify-between w-full">
           <div className="flex gap-2">
             <Button variant="outline" onClick={handleCreatePCR} disabled={!!pcrId}>
               <FileText className="h-4 w-4 mr-2" />
               {pcrId ? 'PCR Exists' : 'Create PCR'}
             </Button>
             {pcrId && (
               <Button variant="outline" onClick={handleShareReport}>
                 <Share2 className="h-4 w-4 mr-2" />
                 Share Report
               </Button>
             )}
           </div>
           <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
