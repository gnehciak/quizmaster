import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  BookOpen, 
  Users, 
  Settings,
  Plus,
  Edit,
  BarChart3,
  Bot,
  Save
} from 'lucide-react';
import { toast } from 'sonner';

export default function AdminDashboard() {
  const [aiConfigDialogOpen, setAiConfigDialogOpen] = useState(false);
  const [modelName, setModelName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const queryClient = useQueryClient();

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      try {
        return await base44.auth.me();
      } catch (e) {
        return null;
      }
    },
  });

  const { data: courses = [] } = useQuery({
    queryKey: ['courses'],
    queryFn: () => base44.entities.Course.list(),
  });

  const { data: quizzes = [] } = useQuery({
    queryKey: ['quizzes'],
    queryFn: () => base44.entities.Quiz.list(),
  });

  const { data: attempts = [] } = useQuery({
    queryKey: ['allAttempts'],
    queryFn: () => base44.entities.QuizAttempt.list('-created_date', 100),
  });

  const { data: aiConfig } = useQuery({
    queryKey: ['aiConfig'],
    queryFn: async () => {
      const configs = await base44.entities.AIAPIConfig.filter({ key: 'default' });
      return configs[0] || null;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (aiConfig) {
        return await base44.entities.AIAPIConfig.update(aiConfig.id, data);
      } else {
        return await base44.entities.AIAPIConfig.create({ key: 'default', ...data });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aiConfig'] });
      setAiConfigDialogOpen(false);
      toast.success('AI API configuration saved');
    },
    onError: (error) => {
      toast.error('Failed to save configuration: ' + error.message);
    }
  });

  const handleOpenAIConfig = () => {
    setModelName(aiConfig?.model_name || 'gemini-2.5-flash-preview-09-2025');
    setApiKey(aiConfig?.api_key || '');
    setAiConfigDialogOpen(true);
  };

  const handleSaveAIConfig = () => {
    saveMutation.mutate({ model_name: modelName, api_key: apiKey });
  };

  if (userLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-slate-800">Loading...</h2>
        </div>
      </div>
    );
  }

  if (!user || user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-slate-800 mb-4">Access Denied</h2>
          <p className="text-slate-600 mb-4">You need admin privileges to access this page</p>
          <Link to={createPageUrl('Home')}>
            <Button>Go Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <h1 className="text-3xl font-bold text-slate-800">Admin Dashboard</h1>
          <p className="text-slate-600">Manage courses, quizzes, and view analytics</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Stats */}
        <div className="grid sm:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Courses</CardTitle>
              <BookOpen className="w-4 h-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{courses.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Quizzes</CardTitle>
              <Settings className="w-4 h-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{quizzes.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Quiz Attempts</CardTitle>
              <BarChart3 className="w-4 h-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{attempts.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid sm:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Course Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link to={createPageUrl('ManageCourses')}>
                <Button className="w-full gap-2">
                  <BookOpen className="w-4 h-4" />
                  Manage Courses
                </Button>
              </Link>
              <Link to={createPageUrl('ManageQuizzes')}>
                <Button className="w-full gap-2" variant="outline">
                  <Edit className="w-4 h-4" />
                  Manage Quizzes
                </Button>
              </Link>
              <Link to={createPageUrl('UserManagement')}>
                <Button className="w-full gap-2" variant="outline">
                  <Users className="w-4 h-4" />
                  Manage Users
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {attempts.slice(0, 5).map((attempt, idx) => (
                  <div key={idx} className="flex justify-between items-center text-sm">
                    <span className="text-slate-600">{attempt.user_email}</span>
                    <span className="font-medium text-indigo-600">{attempt.percentage}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* AI Configuration */}
        <div className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-indigo-600" />
                AI API Configuration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-sm text-slate-600">
                  <p><strong>Model:</strong> {aiConfig?.model_name || 'Not configured'}</p>
                  <p><strong>API Key:</strong> {aiConfig?.api_key ? '••••••••' : 'Not set'}</p>
                </div>
                <Button onClick={handleOpenAIConfig} variant="outline" className="gap-2">
                  <Settings className="w-4 h-4" />
                  Configure AI API
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* AI Configuration Dialog */}
      <Dialog open={aiConfigDialogOpen} onOpenChange={setAiConfigDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>AI API Configuration</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="model-name">AI Model Name</Label>
              <Input
                id="model-name"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                placeholder="gemini-2.5-flash-preview-09-2025"
              />
              <p className="text-xs text-slate-500">
                Enter the Google AI model name (e.g., gemini-2.5-flash-preview-09-2025)
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="api-key">API Key</Label>
              <Input
                id="api-key"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your Google AI API key"
              />
              <p className="text-xs text-slate-500">
                Your Google AI API key (get from AI Studio)
              </p>
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setAiConfigDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveAIConfig} 
              disabled={saveMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700 gap-2"
            >
              <Save className="w-4 h-4" />
              {saveMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}