import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { ScrollArea } from './ui/scroll-area';
import { Bell, AlertTriangle, Info, CheckCircle, Loader2 } from 'lucide-react';
import * as api from '../services/api';

interface NotificationsDialogProps {
  open: boolean;
  onClose: () => void;
}

export function NotificationsDialog({ open, onClose }: NotificationsDialogProps) {
  const [notifications, setNotifications] = useState<api.BackendNotification[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setLoading(true);
      api.getNotifications().then(data => {
        setNotifications(data);
        setLoading(false);
      });
    }
  }, [open]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'alert': return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'success': return <CheckCircle className="h-5 w-5 text-green-500" />;
      default: return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col p-0">
        <DialogHeader className="p-4 pb-2 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" /> Notifications
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="flex-1">
          {loading ? (
            <div className="p-8 flex items-center justify-center text-gray-400">
               <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading...
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((n) => (
                <div key={n._id} className="p-4 hover:bg-gray-50 cursor-pointer transition-colors">
                  <div className="flex gap-3">
                    <div className="shrink-0 mt-1">{getIcon(n.type)}</div>
                    <div className="space-y-1">
                      <p className="font-medium text-sm text-gray-900">{n.title}</p>
                      <p className="text-sm text-gray-500">{n.message}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              {notifications.length === 0 && (
                <div className="p-8 text-center text-gray-500">No new notifications</div>
              )}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
