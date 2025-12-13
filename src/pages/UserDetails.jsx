import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, User, Loader2, Save } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function UserDetails() {
  const urlParams = new URLSearchParams(window.location.search);
  const userId = urlParams.get('id');
  const queryClient = useQueryClient();

  const [selectedRole, setSelectedRole] = React.useState('');

  const { data: currentUser } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      try {
        const user = await base44.auth.me();
        if (!user || user.role !== 'admin') {
          window.location.href = createPageUrl('Home');
          return null;
        }
        return user;
      } catch (e) {
        base44.auth.redirectToLogin(window.location.pathname + window.location.search);
        return null;
      }
    },
  });

  const { data: targetUser, isLoading } = useQuery({
    queryKey: ['targetUser', userId],
    queryFn: async () => {
      const users = await base44.entities.User.filter({ id: userId });
      return users[0];
    },
    enabled: !!userId && !!currentUser
  });

  React.useEffect(() => {
    if (targetUser?.role) {
      setSelectedRole(targetUser.role);
    }
  }, [targetUser]);

  const updateRoleMutation = useMutation({
    mutationFn: async (newRole) => {
      return await base44.entities.User.update(userId, { role: newRole });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['targetUser', userId] });
      queryClient.invalidateQueries({ queryKey: ['allUsers'] });
      toast.success('User role updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update user role');
      console.error(error);
    }
  });

  const handleSaveRole = () => {
    if (selectedRole !== targetUser?.role) {
      updateRoleMutation.mutate(selectedRole);
    }
  };

  if (isLoading || !currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (!targetUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-slate-800 mb-4">User not found</h2>
          <Link to={createPageUrl('UserManagement')}>
            <Button>Back to Users</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200/60">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex items-center gap-3">
            <Link to={createPageUrl('UserManagement')}>
              <Button variant="ghost" size="icon">
                <ChevronLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl shadow-lg shadow-indigo-200">
              <User className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">User Details</h1>
              <p className="text-sm text-slate-500">Manage user information</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* User Info Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>User Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 pb-4 border-b">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-2xl">
                {targetUser.full_name?.charAt(0) || 'U'}
              </div>
              <div>
                <h3 className="text-xl font-semibold text-slate-800">
                  {targetUser.full_name || 'Unnamed User'}
                </h3>
                <p className="text-slate-600">{targetUser.email}</p>
              </div>
            </div>

            <div className="grid gap-4">
              <div>
                <Label className="text-slate-600 text-sm">User ID</Label>
                <p className="text-slate-800 font-medium mt-1">{targetUser.id}</p>
              </div>

              <div>
                <Label className="text-slate-600 text-sm">Created Date</Label>
                <p className="text-slate-800 font-medium mt-1">
                  {targetUser.created_date 
                    ? format(new Date(targetUser.created_date), 'MMMM d, yyyy h:mm a')
                    : 'N/A'}
                </p>
              </div>

              <div>
                <Label className="text-slate-600 text-sm mb-2 block">Role</Label>
                <div className="flex items-center gap-3">
                  <Select value={selectedRole} onValueChange={setSelectedRole}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="teacher">Teacher</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {selectedRole !== targetUser.role && (
                    <Button 
                      onClick={handleSaveRole}
                      disabled={updateRoleMutation.isPending}
                      className="gap-2"
                    >
                      {updateRoleMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      Save Changes
                    </Button>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  {selectedRole === 'admin' && 'Full access to all features including user management'}
                  {selectedRole === 'teacher' && 'Can create and manage courses and quizzes'}
                  {selectedRole === 'user' && 'Standard user access to enrolled courses'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Link to={createPageUrl('UserManagement')}>
            <Button variant="outline">
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back to Users
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}