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
  GripVertical,
  PlayCircle,
  Download,
  Settings,
  List,
  Trash2,
  Upload,
  Copy,
  Code
} from 'lucide-react';
import QuestionEditor from '@/components/quiz/QuestionEditor';
import QuestionPreview from '@/components/quiz/QuestionPreview';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import RichTextEditor from '@/components/quiz/RichTextEditor';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function CreateQuiz() {
  const urlParams = new URLSearchParams(window.location.search);
  const quizId = urlParams.get('id');
  const courseId = urlParams.get('courseId');
  
  const queryClient = useQueryClient();
  
  const [quiz, setQuiz] = useState({
    title: '',
    description: '',
    category_id: '',
    category: 'general_knowledge',
    status: 'draft',
    timer_enabled: false,
    timer_duration: 30,
    allow_tips: false,
    tips_allowed: 999,
    questions: []
  });
  
  const [previewMode, setPreviewMode] = useState(false);
  const [collapsedQuestions, setCollapsedQuestions] = useState(new Set());
  const [categorySearch, setCategorySearch] = useState('');
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [previewQuestion, setPreviewQuestion] = useState(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [editSchemaDialogOpen, setEditSchemaDialogOpen] = useState(false);
  const [editSchemaJson, setEditSchemaJson] = useState('');
  const [editSchemaIndex, setEditSchemaIndex] = useState(null);

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

  const { data: questionNames = [] } = useQuery({
    queryKey: ['questionNames'],
    queryFn: () => base44.entities.QuestionName.list(),
  });

  const sortedCategories = React.useMemo(() => 
    [...categories].sort((a, b) => a.name.localeCompare(b.name)), 
    [categories]
  );

  useEffect(() => {
    if (existingQuiz) {
      setQuiz(existingQuiz);
      // Set category search to show the selected category name
      if (existingQuiz.category_id && categories.length > 0 && !categorySearch) {
        const cat = categories.find(c => c.id === existingQuiz.category_id);
        if (cat) setCategorySearch(cat.name);
      }
    }
  }, [existingQuiz, categories]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const sanitizedData = {
        ...data,
        timer_duration: data.timer_duration === '' ? 30 : data.timer_duration,
        attempts_allowed: data.attempts_allowed === '' ? 999 : data.attempts_allowed,
        tips_allowed: data.tips_allowed === '' ? 999 : data.tips_allowed,
      };

      if (quizId) {
        return base44.entities.Quiz.update(quizId, sanitizedData);
      }
      return base44.entities.Quiz.create(sanitizedData);
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

  const handleExport = () => {
    const dataStr = JSON.stringify(quiz, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${quiz.title || 'quiz'}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportQuestion = (question, index) => {
    const dataStr = JSON.stringify(question, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `question-${index + 1}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportQuestion = (file) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const question = JSON.parse(event.target.result);
        // Assign a new ID to avoid conflicts
        question.id = `q_${Date.now()}`;
        setQuiz(prev => ({
          ...prev,
          questions: [...(prev.questions || []), question]
        }));
        setImportDialogOpen(false);
      } catch (error) {
        alert('Invalid question file');
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type === 'application/json') {
      handleImportQuestion(file);
    } else {
      alert('Please drop a valid JSON file');
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleCopyQuestion = (question) => {
    const jsonStr = JSON.stringify(question, null, 2);
    navigator.clipboard.writeText(jsonStr);
  };

  const handleOpenEditSchema = (question, idx) => {
    const cleanQuestion = getCleanQuestionSchema(question);
    setEditSchemaJson(JSON.stringify(cleanQuestion, null, 2));
    setEditSchemaIndex(idx);
    setEditSchemaDialogOpen(true);
  };

  const handleSaveSchema = () => {
    try {
      const parsed = JSON.parse(editSchemaJson);
      updateQuestion(editSchemaIndex, parsed);
      setEditSchemaDialogOpen(false);
    } catch (err) {
      alert('Invalid JSON: ' + err.message);
    }
  };

  const handleImportFromText = () => {
    try {
      const question = JSON.parse(importJsonText);
      question.id = `q_${Date.now()}`;
      setQuiz(prev => ({
        ...prev,
        questions: [...(prev.questions || []), question]
      }));
      setImportJsonText('');
      setImportDialogOpen(false);
    } catch (error) {
      alert('Invalid JSON');
    }
  };

  const getCleanQuestionSchema = (question) => {
    const base = {
      id: question.id,
      type: question.type,
    };

    // Add questionName only if it has a value
    if (question.questionName) base.questionName = question.questionName;

    switch (question.type) {
      case 'multiple_choice':
        return {
          ...base,
          question: question.question || '',
          options: question.options || ['', '', '', ''],
          correctAnswer: question.correctAnswer || ''
        };
      
      case 'reading_comprehension':
        const rcQuestion = {
          ...base,
          question: question.question || '',
          comprehensionQuestions: question.comprehensionQuestions || []
        };
        if (question.passage) rcQuestion.passage = question.passage;
        if (question.passages?.length > 0) rcQuestion.passages = question.passages;
        return rcQuestion;
      
      case 'drag_drop_single':
      case 'drag_drop_dual':
        const ddQuestion = {
          ...base,
          question: question.question || '',
          options: question.options || [],
          dropZones: question.dropZones || []
        };
        if (question.passage) ddQuestion.passage = question.passage;
        if (question.passages?.length > 0) ddQuestion.passages = question.passages;
        if (question.rightPaneQuestion) ddQuestion.rightPaneQuestion = question.rightPaneQuestion;
        return ddQuestion;
      
      case 'inline_dropdown_separate':
      case 'inline_dropdown_same':
        const idQuestion = {
          ...base,
          question: question.question || '',
          textWithBlanks: question.textWithBlanks || '',
          blanks: question.blanks || []
        };
        if (question.passage) idQuestion.passage = question.passage;
        if (question.passages?.length > 0) idQuestion.passages = question.passages;
        return idQuestion;
      
      case 'matching_list_dual':
        const mlQuestion = {
          ...base,
          question: question.question || '',
          options: question.options || [],
          matchingQuestions: question.matchingQuestions || []
        };
        if (question.passage) mlQuestion.passage = question.passage;
        if (question.passages?.length > 0) mlQuestion.passages = question.passages;
        return mlQuestion;
      
      case 'long_response_dual':
        const lrQuestion = {
          ...base,
          question: question.question || '',
        };
        if (question.passage) lrQuestion.passage = question.passage;
        if (question.passages?.length > 0) lrQuestion.passages = question.passages;
        if (question.rightPaneQuestion) lrQuestion.rightPaneQuestion = question.rightPaneQuestion;
        if (question.marking_criteria) lrQuestion.marking_criteria = question.marking_criteria;
        return lrQuestion;
      
      default:
        return question;
    }
  };

  const addQuestion = () => {
    const newQuestion = {
      id: `q_${Date.now()}`,
      type: '',
      question: ''
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
              <Button variant="ghost" size="icon" className="hover:bg-slate-100" onClick={() => window.history.back()}>
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-lg font-semibold text-slate-800">
                  {quizId ? 'Edit Quiz' : 'Create Quiz'}
                </h1>
                {quizId && (
                  <p className="text-xs text-slate-500 mt-0.5">ID: {quizId}</p>
                )}
              </div>
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
              {quizId && (
                <>
                  <Link to={createPageUrl(`TakeQuiz?id=${quizId}${courseId ? `&courseId=${courseId}` : ''}`)}>
                    <Button 
                      variant="outline"
                      className="gap-2"
                    >
                      <PlayCircle className="w-4 h-4" />
                      Start Quiz
                    </Button>
                  </Link>
                  <Button 
                    onClick={handleExport}
                    variant="outline"
                    className="gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Export
                  </Button>
                </>
              )}
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

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {previewMode ? (
          <div className="space-y-8">
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
              <h1 className="text-3xl font-bold text-slate-800 mb-2">{quiz.title || 'Untitled Quiz'}</h1>
              {quiz.description && (
                <div 
                  className="text-slate-600 prose prose-slate mx-auto"
                  dangerouslySetInnerHTML={{ __html: quiz.description }}
                />
              )}
              <div className="flex items-center justify-center gap-4 mt-6 text-sm text-slate-500">
                <span className="flex items-center gap-1">
                  <FileQuestion className="w-4 h-4" />
                  {quiz.questions?.length || 0} Questions
                </span>
                {quiz.timer_enabled && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {quiz.timer_duration} Minutes
                  </span>
                )}
              </div>
            </div>
            
            <div className="space-y-8">
              {quiz.questions?.map((q, idx) => (
                <QuestionPreview key={q.id} question={q} index={idx} />
              ))}
              
              {(!quiz.questions || quiz.questions.length === 0) && (
                <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 border-dashed">
                  <FileQuestion className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">No questions added yet</p>
                  <Button 
                    variant="link" 
                    onClick={() => setPreviewMode(false)}
                    className="text-indigo-600"
                  >
                    Go back to editor to add questions
                  </Button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <Tabs defaultValue="questions" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="questions" className="gap-2">
                <List className="w-4 h-4" />
                Questions
              </TabsTrigger>
              <TabsTrigger value="settings" className="gap-2">
                <Settings className="w-4 h-4" />
                Settings & Details
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="questions" className="space-y-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-slate-800">
                  Questions ({quiz.questions?.length || 0})
                </h2>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => setImportDialogOpen(true)}
                  >
                    <Upload className="w-4 h-4" />
                    Import Question
                  </Button>
                  <Button
                    onClick={addQuestion}
                    className="gap-2 bg-indigo-600 hover:bg-indigo-700"
                  >
                    <Plus className="w-4 h-4" />
                    Add Question
                  </Button>
                </div>
              </div>

              {/* Questions List & Editors */}
              {quiz.questions && quiz.questions.length > 0 ? (
                <>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-8">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium text-slate-500">Reorder Questions</h3>
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
                                    className={`bg-white rounded-lg border p-3 transition-all flex items-center gap-3 ${
                                      snapshot.isDragging ? 'border-indigo-400 shadow-lg z-10' : 'border-slate-200 hover:border-slate-300'
                                    }`}
                                  >
                                    <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600">
                                      <GripVertical className="w-5 h-5" />
                                    </div>
                                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-sm font-medium text-slate-600">
                                      {idx + 1}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                      <div className="text-sm font-medium text-slate-800 truncate">
                                        {(question.question || 'Untitled Question').replace(/<[^>]*>/g, '')}
                                      </div>
                                      <div className="text-xs text-slate-500">
                                        {question.type?.replace(/_/g, ' ')}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setPreviewQuestion(question)}
                                        className="text-slate-500 hover:text-indigo-600"
                                        title="Preview Question"
                                      >
                                        <Eye className="w-4 h-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleCopyQuestion(question)}
                                        className="text-slate-500 hover:text-indigo-600 w-8 h-8 p-0"
                                        title="Copy as JSON"
                                      >
                                        <Copy className="w-4 h-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleExportQuestion(question, idx)}
                                        className="text-slate-500 hover:text-indigo-600"
                                        title="Export Question"
                                      >
                                        <Download className="w-4 h-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleOpenEditSchema(question, idx)}
                                        className="text-slate-500 hover:text-indigo-600"
                                        title="Edit Schema"
                                      >
                                        <Code className="w-4 h-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          const el = document.getElementById(`question-editor-${idx}`);
                                          if (el) {
                                            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                            // Ensure it's not collapsed
                                            if (collapsedQuestions.has(idx)) {
                                              toggleCollapseQuestion(idx);
                                            }
                                          }
                                        }}
                                        className="text-slate-500 hover:text-indigo-600"
                                      >
                                        Edit
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => deleteQuestion(idx)}
                                        className="text-slate-500 hover:text-red-600"
                                      >
                                        <Trash2 className="w-4 h-4" />
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
                  </div>

                  <div className="space-y-6">
                    {quiz.questions?.map((question, idx) => (
                      <div key={question.id} id={`question-editor-${idx}`} className="scroll-mt-24">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold uppercase tracking-wider">
                            Question {idx + 1}
                          </span>
                        </div>
                        <QuestionEditor
                          question={question}
                          onChange={(updated) => updateQuestion(idx, updated)}
                          onDelete={() => deleteQuestion(idx)}
                          isCollapsed={collapsedQuestions.has(idx)}
                          onToggleCollapse={() => toggleCollapseQuestion(idx)}
                          existingQuestionNames={questionNames.map(qn => qn.name)}
                        />
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-slate-200">
                  <FileQuestion className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-800 mb-2">Start adding questions</h3>
                  <p className="text-slate-500 mb-6 max-w-sm mx-auto">
                    Create your quiz by adding different types of questions below.
                  </p>
                  <Button
                    onClick={addQuestion}
                    size="lg"
                    className="gap-2 bg-indigo-600 hover:bg-indigo-700 shadow-lg hover:shadow-xl transition-all"
                  >
                    <Plus className="w-5 h-5" />
                    Add First Question
                  </Button>
                </div>
              )}

              {quiz.questions && quiz.questions.length > 0 && (
                <div className="pt-8 pb-20">
                  <Button
                    variant="outline"
                    onClick={addQuestion}
                    className="w-full h-16 border-dashed border-2 gap-2 text-slate-500 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50/50 text-lg transition-all"
                  >
                    <Plus className="w-6 h-6" />
                    Add Another Question
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="settings" className="space-y-6">
              {/* Quiz Info */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
                <h2 className="font-semibold text-slate-800 flex items-center gap-2 text-lg border-b pb-4">
                  <FileQuestion className="w-5 h-5 text-indigo-500" />
                  Basic Information
                </h2>
                
                <div className="grid gap-6">
                  <div className="space-y-2">
                    <Label className="text-base">Quiz Title</Label>
                    <Input
                      value={quiz.title}
                      onChange={(e) => setQuiz(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Enter a catchy title for your quiz..."
                      className="text-lg h-12"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <div className="prose-editor-wrapper">
                      <RichTextEditor
                        value={quiz.description || ''}
                        onChange={(value) => setQuiz(prev => ({ ...prev, description: value }))}
                        placeholder="What is this quiz about? Provide instructions or context..."
                        minHeight="150px"
                      />
                    </div>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2 relative">
                      <Label>Category</Label>
                      <Input
                        placeholder="Select or search category..."
                        value={categorySearch}
                        onChange={(e) => setCategorySearch(e.target.value)}
                        onFocus={() => setCategoryDropdownOpen(true)}
                        onBlur={() => setTimeout(() => setCategoryDropdownOpen(false), 200)}
                      />
                      {categoryDropdownOpen && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {sortedCategories
                            .filter(cat => cat.name.toLowerCase().includes(categorySearch.toLowerCase()))
                            .map((cat) => (
                              <button
                                key={cat.id}
                                type="button"
                                onClick={() => {
                                  setQuiz(prev => ({ 
                                    ...prev, 
                                    category_id: cat.id,
                                    category: cat.name
                                  }));
                                  setCategorySearch(cat.name);
                                  setCategoryDropdownOpen(false);
                                }}
                                className="w-full px-4 py-2 text-left hover:bg-slate-100 transition-colors"
                              >
                                {cat.name}
                              </button>
                            ))}
                          {sortedCategories.filter(cat => cat.name.toLowerCase().includes(categorySearch.toLowerCase())).length === 0 && (
                            <div className="px-4 py-2 text-sm text-slate-500">No categories found</div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Publish Status</Label>
                      <Select
                        value={quiz.status || 'draft'}
                        onValueChange={(value) => setQuiz(prev => ({ ...prev, status: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Draft (Hidden)</SelectItem>
                          <SelectItem value="published">Published (Visible)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Timer Settings */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
                <h2 className="font-semibold text-slate-800 flex items-center gap-2 text-lg border-b pb-4">
                  <Clock className="w-5 h-5 text-indigo-500" />
                  Rules & Settings
                </h2>

                <div className="grid gap-6">
                  <div className="flex items-start gap-3 p-4 border rounded-xl bg-slate-50">
                    <div className="pt-1">
                      <input
                        type="checkbox"
                        id="timer_enabled"
                        checked={quiz.timer_enabled || false}
                        onChange={(e) => setQuiz(prev => ({ ...prev, timer_enabled: e.target.checked }))}
                        className="w-5 h-5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                      />
                    </div>
                    <div className="flex-1">
                      <Label htmlFor="timer_enabled" className="text-base font-medium cursor-pointer block mb-1">
                        Time Limit
                      </Label>
                      <p className="text-sm text-slate-500 mb-3">
                        Limit how much time students have to complete the quiz
                      </p>
                      
                      {quiz.timer_enabled && (
                        <div className="flex items-center gap-3">
                          <Input
                            type="text"
                            value={quiz.timer_duration === 0 ? 0 : (quiz.timer_duration === '' ? '' : (quiz.timer_duration || ''))}
                            onChange={(e) => {
                              const value = e.target.value.replace(/[^0-9]/g, '');
                              setQuiz(prev => ({ ...prev, timer_duration: value === '' ? '' : parseInt(value) }));
                            }}
                            placeholder="30"
                            className="w-24"
                          />
                          <span className="text-sm font-medium text-slate-700">minutes</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Attempts Allowed</Label>
                      <div className="flex items-center gap-3">
                        <Input
                          type="text"
                          value={quiz.attempts_allowed === 0 ? 0 : (quiz.attempts_allowed === '' ? '' : (quiz.attempts_allowed || ''))}
                          onChange={(e) => {
                            const value = e.target.value.replace(/[^0-9]/g, '');
                            setQuiz(prev => ({ ...prev, attempts_allowed: value === '' ? '' : parseInt(value) }));
                          }}
                          placeholder="999"
                          className="w-32"
                        />
                        <span className="text-sm text-slate-500">
                          (999 = unlimited)
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 border rounded-xl bg-slate-50">
                    <div className="pt-1">
                      <input
                        type="checkbox"
                        id="allow_tips"
                        checked={quiz.allow_tips || false}
                        onChange={(e) => setQuiz(prev => ({ ...prev, allow_tips: e.target.checked }))}
                        className="w-5 h-5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                      />
                    </div>
                    <div className="flex-1">
                      <Label htmlFor="allow_tips" className="text-base font-medium cursor-pointer block mb-1">
                        AI Help Tips
                      </Label>
                      <p className="text-sm text-slate-500 mb-3">
                        Allow students to ask for AI-generated hints during the quiz
                      </p>
                      
                      {quiz.allow_tips && (
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-slate-700">Limit tips per attempt:</span>
                          <Input
                            type="text"
                            value={quiz.tips_allowed === 0 ? 0 : (quiz.tips_allowed === '' ? '' : (quiz.tips_allowed || ''))}
                            onChange={(e) => {
                              const value = e.target.value.replace(/[^0-9]/g, '');
                              setQuiz(prev => ({ ...prev, tips_allowed: value === '' ? '' : parseInt(value) }));
                            }}
                            placeholder="999"
                            className="w-24"
                          />
                          <span className="text-sm text-slate-500">(999 = unlimited)</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* Question Preview Dialog */}
      <Dialog open={!!previewQuestion} onOpenChange={(open) => !open && setPreviewQuestion(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Question Preview</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {previewQuestion && (
              <QuestionPreview 
                question={previewQuestion} 
                index={quiz.questions?.findIndex(q => q.id === previewQuestion.id) ?? 0} 
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Schema Dialog */}
      <Dialog open={editSchemaDialogOpen} onOpenChange={setEditSchemaDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Edit Question Schema (JSON)</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={editSchemaJson}
              onChange={(e) => setEditSchemaJson(e.target.value)}
              className="font-mono text-xs min-h-[500px]"
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setEditSchemaDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveSchema} className="bg-indigo-600 hover:bg-indigo-700">
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import Question Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Import Question</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-6">
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                isDragging 
                  ? 'border-indigo-500 bg-indigo-50' 
                  : 'border-slate-300 hover:border-slate-400'
              }`}
            >
              <Upload className={`w-12 h-12 mx-auto mb-4 ${isDragging ? 'text-indigo-500' : 'text-slate-400'}`} />
              <h3 className="text-lg font-semibold text-slate-800 mb-2">
                {isDragging ? 'Drop your file here' : 'Drag and drop a question file'}
              </h3>
              <p className="text-sm text-slate-500 mb-4">
                or click to browse
              </p>
              <input
                id="import-question-input"
                type="file"
                accept=".json"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImportQuestion(file);
                  e.target.value = '';
                }}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => document.getElementById('import-question-input').click()}
              >
                Browse Files
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-slate-500">Or paste JSON</span>
              </div>
            </div>

            <div className="space-y-2">
              <Textarea
                value={importJsonText}
                onChange={(e) => setImportJsonText(e.target.value)}
                placeholder='{"id": "q_123", "type": "multiple_choice", ...}'
                className="font-mono text-xs min-h-[150px]"
              />
              <Button
                onClick={handleImportFromText}
                disabled={!importJsonText.trim()}
                className="w-full"
              >
                Import from Text
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sticky Save Button */}
      <div className="fixed bottom-6 right-6 z-20">
        <Button 
          onClick={handleSave}
          disabled={saving || !quiz.title}
          size="lg"
          className="gap-2 bg-indigo-600 hover:bg-indigo-700 shadow-lg"
        >
          {saving ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : saved ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <Save className="w-5 h-5" />
          )}
          {saved ? 'Saved!' : 'Save Quiz'}
        </Button>
      </div>
    </div>
  );
}