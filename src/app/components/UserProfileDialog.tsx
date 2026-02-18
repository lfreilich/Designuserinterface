import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import { Loader2 } from 'lucide-react';
import * as api from '../services/api';

interface UserProfileDialogProps {
  open: boolean;
  onClose: () => void;
}

export function UserProfileDialog({ open, onClose }: UserProfileDialogProps) {
  const [user, setUser] = useState<api.BackendUser | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setLoading(true);
      api.getUserProfile().then(data => {
        setUser(data);
        setLoading(false);
      });
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>User Profile</DialogTitle>
        </DialogHeader>

        {loading ? (
           <div className="flex flex-col items-center justify-center py-10 text-gray-400">
              <Loader2 className="h-8 w-8 animate-spin mb-2" />
              Fetching profile...
           </div>
        ) : user ? (
          <>
            <div className="flex flex-col items-center gap-4 py-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={user.avatar} />
                <AvatarFallback className="bg-[#1E4A9C] text-white text-xl">
                  {user.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <div className="text-center">
                <h3 className="font-bold text-lg">{user.name}</h3>
                <div className="flex items-center justify-center gap-2 mt-1">
                  <Badge variant="secondary">{user.role}</Badge>
                  <Badge variant="outline">{user.branch}</Badge>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">ID</Label>
                <Input value={user._id} readOnly className="col-span-3 bg-gray-50" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Email</Label>
                <Input value={user.email} readOnly className="col-span-3 bg-gray-50" />
              </div>
            </div>
          </>
        ) : (
           <div className="text-center py-8 text-red-500">Failed to load user profile</div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">Close</Button>
          <Button variant="destructive" className="w-full sm:w-auto">Sign Out</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
