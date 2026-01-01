import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Trash2, UserPlus, Mail, Calendar, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function CourseStudentsDialog({ open, onOpenChange, courseId }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const queryClient = useQueryClient();

  const { data: students = [], isLoading } = useQuery({
    queryKey: ['courseStudents', courseId],
    queryFn: () => base44.entities.CourseAccess.filter({ course_id: courseId }),
    enabled: open && !!courseId
  });

  const revokeMutation = useMutation({
    mutationFn: (id) => base44.entities.CourseAccess.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courseStudents', courseId] });
      toast.success('Access revoked');
    }
  });

  const grantMutation = useMutation({
    mutationFn: (data) => base44.entities.CourseAccess.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courseStudents', courseId] });
      setInviteEmail('');
      toast.success('Access granted successfully');
    },
    onError: () => {
      toast.error('Failed to grant access. User might already have access.');
    }
  });

  const filteredStudents = students.filter(s => 
    s.user_email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleGrantAccess = () => {
    if (!inviteEmail.trim()) return;
    grantMutation.mutate({
      course_id: courseId,
      user_email: inviteEmail.trim(),
      unlock_method: 'admin'
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Manage Students</DialogTitle>
        </DialogHeader>
        
        <div className="flex gap-4 items-end mb-4">
          <div className="flex-1 space-y-2">
            <label className="text-sm font-medium">Grant Access</label>
            <div className="flex gap-2">
              <Input 
                placeholder="Enter user email..." 
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
              <Button onClick={handleGrantAccess} disabled={!inviteEmail || grantMutation.isPending}>
                <UserPlus className="w-4 h-4 mr-2" />
                Grant
              </Button>
            </div>
          </div>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input 
            placeholder="Search students..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex-1 overflow-y-auto border rounded-lg">
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
            </div>
          ) : filteredStudents.length > 0 ? (
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-medium">
                <tr>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        {student.user_email}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="capitalize bg-slate-100 px-2 py-1 rounded text-xs">
                        {student.unlock_method}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {new Date(student.created_date).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => {
                          if (confirm('Revoke access for this student?')) {
                            revokeMutation.mutate(student.id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center text-slate-500">
              No students found
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}