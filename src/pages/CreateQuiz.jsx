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
  Loader2,
  Clock,
  Eye,
  GripVertical
} from 'lucide-react';
import QuestionEditor from '@/components/quiz/QuestionEditor';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

export default function CreateQuiz() {
  const urlParams = new URLSearchParams(window.location.search);
  const quizId = urlParams.get('id');
  
  const queryClient = useQueryClient();
  
  const [quiz, setQuiz] = useState({
    title: '',
    description: '',
    category: 'general_knowledge',
    status: 'draft',
    timer_enabled: false,
    timer_duration: 30,
    questions: []
  });
  
  const [previewMode, setPreviewMode] = useState(false);
  const [collapsedQuestions, setCollapsedQuestions] = useState(new Set());
  
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const { data: existingQuiz, isLoading } = useQuery({
    queryKey: ['quiz', quizId],
    queryFn: () => base44.entities.Quiz.filter({ id: quizId }),
    enabled: !!quizId,
    select: (data) => data[0]
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['quizCategories'],
    queryFn: () => base44.entities.QuizCategory.list(),
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
      window.location.href = createPageUrl('ManageQuizzes');
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

  const toggleCollapseQuestion = (index) => {
    setCollapsedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    
    const items = Array.from(quiz.questions);
    const [reordered] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reordered);
    
    setQuiz(prev => ({ ...prev, questions: items }));
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
              <Link to={createPageUrl('ManageQuizzes')}>
                <Button variant="ghost" size="icon" className="hover:bg-slate-100">
                  <ChevronLeft className="w-5 h-5" />
                </Button>
              </Link>
              <h1 className="text-lg font-semibold text-slate-800">
                {quizId ? 'Edit Quiz' : 'Create Quiz'}
              </h1>
            </div>
            
            <div className="flex gap-2">
              <Button 
                onClick={() => setPreviewMode(!previewMode)}
                variant="outline"
                className="gap-2"
              >
                <Eye className="w-4 h-4" />
                {previewMode ? 'Edit' : 'Preview'}
              </Button>
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
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {previewMode ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8">
            <h1 className="text-3xl font-bold text-slate-800 mb-2">{quiz.title}</h1>
            <p className="text-slate-600 mb-6">{quiz.description}</p>
            
            <div className="space-y-8">
              {quiz.questions?.map((q, idx) => (
                <div key={q.id} className="border-t pt-6">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">
                    Question {idx + 1}: {q.question}
                  </h3>
                  {q.type === 'multiple_choice' && (
                    <div className="space-y-2">
                      {q.options?.map((opt, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
                          <div className="w-5 h-5 rounded-full border-2 border-slate-300"></div>
                          <span>{opt}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
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
              <Label>Category</Label>
              <Select
                value={quiz.category || ''}
                onValueChange={(value) => setQuiz(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category..." />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.name}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

        {/* Timer Settings */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <h2 className="font-semibold text-slate-800 flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-500" />
            Timer Settings
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="timer_enabled"
                checked={quiz.timer_enabled || false}
                onChange={(e) => setQuiz(prev => ({ ...prev, timer_enabled: e.target.checked }))}
                className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
              />
              <Label htmlFor="timer_enabled" className="cursor-pointer">
                Enable time limit for this quiz
              </Label>
            </div>
            
            {quiz.timer_enabled && (
              <div className="space-y-2 pl-7">
                <Label>Duration (minutes)</Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min="1"
                    max="180"
                    value={quiz.timer_duration || 30}
                    onChange={(e) => setQuiz(prev => ({ ...prev, timer_duration: parseInt(e.target.value) || 30 }))}
                    className="w-32"
                  />
                  <span className="text-sm text-slate-500">
                    Quiz will auto-submit when time expires
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Questions */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">
              Questions ({quiz.questions?.length || 0})
            </h2>
          </div>

          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="questions">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                  {quiz.questions?.map((question, idx) => (
                    <Draggable key={question.id} draggableId={question.id} index={idx}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`bg-white rounded-lg border-2 p-3 transition-all ${
                            snapshot.isDragging ? 'border-indigo-400 shadow-lg' : 'border-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing">
                              <GripVertical className="w-5 h-5 text-slate-400" />
                            </div>
                            <span className="text-sm font-semibold text-slate-600 min-w-[80px]">
                              Question {idx + 1}
                            </span>
                            <span className="text-sm text-slate-500 flex-1 truncate">
                              {question.question || 'Untitled question'}
                            </span>
                            <span className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded">
                              {question.type?.replace('_', ' ')}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const el = document.getElementById(`question-editor-${idx}`);
                                el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                              }}
                              className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                            >
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteQuestion(idx)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>

          {/* Question Editors */}
          <div className="space-y-4 mt-8">
            {quiz.questions?.map((question, idx) => (
              <div key={question.id} id={`question-editor-${idx}`}>
                <h3 className="text-sm font-medium text-slate-500 mb-2">
                  Question {idx + 1}
                </h3>
                <QuestionEditor
                  question={question}
                  onChange={(updated) => updateQuestion(idx, updated)}
                  onDelete={() => deleteQuestion(idx)}
                  isCollapsed={collapsedQuestions.has(idx)}
                  onToggleCollapse={() => toggleCollapseQuestion(idx)}
                />
              </div>
            ))}
          </div>

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
        </>
        )}
      </div>
    </div>
  );
}