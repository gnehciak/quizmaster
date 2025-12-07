import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  ChevronLeft, 
  Plus, 
  Save, 
  FileQuestion,
  CheckCircle,
  Loader2
} from 'lucide-react';
import QuestionEditor from '@/components/quiz/QuestionEditor';

export default function CreateQuiz() {
  const urlParams = new URLSearchParams(window.location.search);
  const quizId = urlParams.get('id');
  
  const queryClient = useQueryClient();
  
  const [quiz, setQuiz] = useState({
    title: '',
    description: '',
    status: 'draft',
    questions: []
  });
  
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const { data: existingQuiz, isLoading } = useQuery({
    queryKey: ['quiz', quizId],
    queryFn: () => base44.entities.Quiz.filter({ id: quizId }),
    enabled: !!quizId,
    select: (data) => data[0]
  });

  useEffect(() => {
    if (existingQuiz) {
      setQuiz(existingQuiz);
    }
  }, [existingQuiz]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (quizId) {
        return base44.entities.Quiz.update(quizId, data);
      }
      return base44.entities.Quiz.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quizzes'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  });

  const handleSave = async () => {
    setSaving(true);
    await saveMutation.mutateAsync(quiz);
    setSaving(false);
    
    if (!quizId) {
      window.location.href = createPageUrl('Quizzes');
    }
  };

  const addQuestion = () => {
    const newQuestion = {
      id: `q_${Date.now()}`,
      type: 'multiple_choice',
      question: '',
      options: ['', '', '', ''],
      correctAnswer: ''
    };
    
    setQuiz(prev => ({
      ...prev,
      questions: [...(prev.questions || []), newQuestion]
    }));
  };

  const updateQuestion = (index, updatedQuestion) => {
    const questions = [...quiz.questions];
    questions[index] = updatedQuestion;
    setQuiz(prev => ({ ...prev, questions }));
  };

  const deleteQuestion = (index) => {
    const questions = quiz.questions.filter((_, i) => i !== index);
    setQuiz(prev => ({ ...prev, questions }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200/60 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link to={createPageUrl('Quizzes')}>
                <Button variant="ghost" size="icon" className="hover:bg-slate-100">
                  <ChevronLeft className="w-5 h-5" />
                </Button>
              </Link>
              <h1 className="text-lg font-semibold text-slate-800">
                {quizId ? 'Edit Quiz' : 'Create Quiz'}
              </h1>
            </div>
            
            <Button 
              onClick={handleSave}
              disabled={saving || !quiz.title}
              className="gap-2 bg-indigo-600 hover:bg-indigo-700"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : saved ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {saved ? 'Saved!' : 'Save Quiz'}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Quiz Info */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <h2 className="font-semibold text-slate-800 flex items-center gap-2">
            <FileQuestion className="w-5 h-5 text-indigo-500" />
            Quiz Details
          </h2>
          
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 space-y-2">
              <Label>Title</Label>
              <Input
                value={quiz.title}
                onChange={(e) => setQuiz(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter quiz title..."
                className="text-lg"
              />
            </div>
            
            <div className="sm:col-span-2 space-y-2">
              <Label>Description (optional)</Label>
              <Textarea
                value={quiz.description || ''}
                onChange={(e) => setQuiz(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of the quiz..."
                className="min-h-[80px]"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={quiz.status || 'draft'}
                onValueChange={(value) => setQuiz(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Questions */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">
              Questions ({quiz.questions?.length || 0})
            </h2>
          </div>

          <AnimatePresence mode="popLayout">
            {quiz.questions?.map((question, idx) => (
              <motion.div
                key={question.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <div className="mb-2 text-sm font-medium text-slate-500">
                  Question {idx + 1}
                </div>
                <QuestionEditor
                  question={question}
                  onChange={(updated) => updateQuestion(idx, updated)}
                  onDelete={() => deleteQuestion(idx)}
                />
              </motion.div>
            ))}
          </AnimatePresence>

          <motion.div layout>
            <Button
              variant="outline"
              onClick={addQuestion}
              className="w-full h-14 border-dashed border-2 gap-2 text-slate-600 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50/50"
            >
              <Plus className="w-5 h-5" />
              Add Question
            </Button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}