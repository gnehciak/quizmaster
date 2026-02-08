import React, { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Clock, Pause, Sparkles, Brain, RefreshCw } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export function TimeEditor({ quiz, children }) {
  const [open, setOpen] = useState(false);
  const [timerEnabled, setTimerEnabled] = useState(quiz.timer_enabled || false);
  const [duration, setDuration] = useState(quiz.timer_duration || 30);
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const handleSave = async () => {
    setSaving(true);
    await base44.entities.Quiz.update(quiz.id, {
      timer_enabled: timerEnabled,
      timer_duration: timerEnabled ? duration : quiz.timer_duration,
    });
    queryClient.invalidateQueries({ queryKey: ['quizList'] });
    toast.success('Time limit updated');
    setSaving(false);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={(v) => {
      if (v) {
        setTimerEnabled(quiz.timer_enabled || false);
        setDuration(quiz.timer_duration || 30);
      }
      setOpen(v);
    }}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-56 p-3" side="top">
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">Time Limit</h4>
          <div className="flex items-center justify-between">
            <Label className="text-xs text-slate-600">Enable Timer</Label>
            <Switch checked={timerEnabled} onCheckedChange={setTimerEnabled} />
          </div>
          {timerEnabled && (
            <div className="space-y-1">
              <Label className="text-xs text-slate-600">Duration (minutes)</Label>
              <Input
                type="number"
                min={1}
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value) || 1)}
                className="h-8 text-sm"
              />
            </div>
          )}
          <Button onClick={handleSave} disabled={saving} size="sm" className="w-full h-7 text-xs bg-indigo-600 hover:bg-indigo-700">
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function FeaturesEditor({ quiz, children }) {
  const [open, setOpen] = useState(false);
  const [pausable, setPausable] = useState(quiz.pausable || false);
  const [allowTips, setAllowTips] = useState(quiz.allow_tips || false);
  const [aiExplanation, setAiExplanation] = useState(quiz.ai_explanation_enabled !== false);
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const handleSave = async () => {
    setSaving(true);
    await base44.entities.Quiz.update(quiz.id, {
      pausable,
      allow_tips: allowTips,
      ai_explanation_enabled: aiExplanation,
    });
    queryClient.invalidateQueries({ queryKey: ['quizList'] });
    toast.success('Features updated');
    setSaving(false);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={(v) => {
      if (v) {
        setPausable(quiz.pausable || false);
        setAllowTips(quiz.allow_tips || false);
        setAiExplanation(quiz.ai_explanation_enabled !== false);
      }
      setOpen(v);
    }}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-60 p-3" side="top">
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">Features</h4>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Pause className="w-3 h-3 text-blue-500" />
              <Label className="text-xs text-slate-600">Pausable</Label>
            </div>
            <Switch checked={pausable} onCheckedChange={setPausable} />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-purple-500" />
              <Label className="text-xs text-slate-600">AI Tips</Label>
            </div>
            <Switch checked={allowTips} onCheckedChange={setAllowTips} />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Brain className="w-3 h-3 text-teal-500" />
              <Label className="text-xs text-slate-600">AI Explanations</Label>
            </div>
            <Switch checked={aiExplanation} onCheckedChange={setAiExplanation} />
          </div>
          <Button onClick={handleSave} disabled={saving} size="sm" className="w-full h-7 text-xs bg-indigo-600 hover:bg-indigo-700">
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function AttemptsEditor({ quiz, children }) {
  const [open, setOpen] = useState(false);
  const [attemptsAllowed, setAttemptsAllowed] = useState(quiz.attempts_allowed || 999);
  const [unlimited, setUnlimited] = useState(!quiz.attempts_allowed || quiz.attempts_allowed >= 999);
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const handleSave = async () => {
    setSaving(true);
    await base44.entities.Quiz.update(quiz.id, {
      attempts_allowed: unlimited ? 999 : attemptsAllowed,
    });
    queryClient.invalidateQueries({ queryKey: ['quizList'] });
    toast.success('Attempts limit updated');
    setSaving(false);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={(v) => {
      if (v) {
        const val = quiz.attempts_allowed || 999;
        setAttemptsAllowed(val >= 999 ? 3 : val);
        setUnlimited(!quiz.attempts_allowed || quiz.attempts_allowed >= 999);
      }
      setOpen(v);
    }}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-56 p-3" side="top">
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">Attempts Allowed</h4>
          <div className="flex items-center justify-between">
            <Label className="text-xs text-slate-600">Unlimited</Label>
            <Switch checked={unlimited} onCheckedChange={setUnlimited} />
          </div>
          {!unlimited && (
            <div className="space-y-1">
              <Label className="text-xs text-slate-600">Max Attempts</Label>
              <Input
                type="number"
                min={1}
                value={attemptsAllowed}
                onChange={(e) => setAttemptsAllowed(parseInt(e.target.value) || 1)}
                className="h-8 text-sm"
              />
            </div>
          )}
          <Button onClick={handleSave} disabled={saving} size="sm" className="w-full h-7 text-xs bg-indigo-600 hover:bg-indigo-700">
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}