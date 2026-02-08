import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, BookOpen, Sparkles, ChevronLeft, BarChart3, LayoutGrid, List, ListOrdered, Upload, Download, Info, FolderEdit, RefreshCw } from 'lucide-react';
import QuizCard from '@/components/quiz/QuizCard';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function ManageQuizzes() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(() => {
    return localStorage.getItem('manageQuizzes_selectedCategory') || 'all';
  });
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState('card');
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [formatGuideOpen, setFormatGuideOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importQuizName, setImportQuizName] = useState('');
  const [importCategoryId, setImportCategoryId] = useState('');
  const [importCategorySearch, setImportCategorySearch] = useState('');
  const [importCategoryDropdownOpen, setImportCategoryDropdownOpen] = useState(false);
  const [pastedJson, setPastedJson] = useState('');
  const queryClient = useQueryClient();

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      try {
        const currentUser = await base44.auth.me();
        if (!currentUser || currentUser.role !== 'admin') {
          window.location.href = createPageUrl('Home');
          return null;
        }
        return currentUser;
      } catch (e) {
        base44.auth.redirectToLogin(window.location.pathname);
        return null;
      }
    },
  });

  const { data: quizList = [], isLoading } = useQuery({
    queryKey: ['quizList'],
    queryFn: () => base44.entities.Quiz.list('-created_date'),
    select: (data) => data.map(q => ({
      id: q.id,
      title: q.title,
      description: q.description,
      category: q.category,
      category_id: q.category_id,
      status: q.status,
      timer_enabled: q.timer_enabled,
      timer_duration: q.timer_duration,
      attempts_allowed: q.attempts_allowed,
      allow_tips: q.allow_tips,
      pausable: q.pausable,
      created_date: q.created_date,
      questions: q.questions?.map(qq => ({ type: qq.type })) || [],
    })),
    enabled: !!user,
  });
  const quizzes = quizList;

  const { data: allAttempts = [] } = useQuery({
    queryKey: ['allQuizAttemptsLite'],
    queryFn: () => base44.entities.QuizAttempt.list(),
    select: (data) => data.map(a => ({
      id: a.id,
      quiz_id: a.quiz_id,
      percentage: a.percentage,
    })),
    enabled: !!user,
  });

  const { data: allCourses = [] } = useQuery({
    queryKey: ['allCoursesLite'],
    queryFn: () => base44.entities.Course.list(),
    select: (data) => data.map(c => ({
      id: c.id,
      title: c.title,
      quiz_ids: c.quiz_ids,
      content_blocks: c.content_blocks?.filter(b => b.type === 'quiz').map(b => ({ type: b.type, quiz_id: b.quiz_id })),
    })),
    enabled: !!user,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Quiz.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['quizzes'] })
  });

  const createMutation = useMutation({
    mutationFn: (quizData) => base44.entities.Quiz.create(quizData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quizzes'] });
      toast.success('Quiz imported successfully!');
      setImportDialogOpen(false);
      setImportFile(null);
      setImportQuizName('');
      setImportCategoryId('');
    },
    onError: (error) => {
      toast.error('Failed to import quiz: ' + error.message);
    }
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['quizCategories'],
    queryFn: () => base44.entities.QuizCategory.list(),
    enabled: !!user,
  });

  // Persist selected category to localStorage
  React.useEffect(() => {
    localStorage.setItem('manageQuizzes_selectedCategory', selectedCategory);
  }, [selectedCategory]);

  const sortedCategories = React.useMemo(() => 
    [...categories].sort((a, b) => a.name.localeCompare(b.name)),
    [categories]
  );

  if (userLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-slate-800">Loading...</h2>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Filter by search and category
  const filteredQuizzes = quizzes.filter((quiz) => {
    const matchesSearch = quiz.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    quiz.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || 
      quiz.category_id === selectedCategory || 
      (!quiz.category_id && quiz.category === selectedCategory);
    return matchesSearch && matchesCategory;
  });

  // Sort quizzes
  const sortedQuizzes = [...filteredQuizzes].sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return new Date(b.created_date) - new Date(a.created_date);
      case 'oldest':
        return new Date(a.created_date) - new Date(b.created_date);
      case 'title_asc':
        return (a.title || '').localeCompare(b.title || '');
      case 'title_desc':
        return (b.title || '').localeCompare(a.title || '');
      case 'questions_most':
        return (b.questions?.length || 0) - (a.questions?.length || 0);
      case 'questions_least':
        return (a.questions?.length || 0) - (b.questions?.length || 0);
      default:
        return 0;
    }
  });

  // Calculate quiz counts by category
  const quizCounts = quizzes.reduce((acc, quiz) => {
    const categoryId = quiz.category_id || quiz.category;
    if (categoryId) {
      acc[categoryId] = (acc[categoryId] || 0) + 1;
    }
    return acc;
  }, {});

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this quiz?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleExportQuiz = (quiz) => {
    const exportData = {
      title: quiz.title,
      description: quiz.description,
      category: quiz.category,
      timer_enabled: quiz.timer_enabled,
      timer_duration: quiz.timer_duration,
      attempts_allowed: quiz.attempts_allowed,
      questions: quiz.questions,
      status: quiz.status
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${quiz.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_quiz.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Quiz exported successfully!');
  };

  const handleImportFile = async () => {
    if (!importFile && !pastedJson.trim()) {
      toast.error('Please select a file or paste JSON to import');
      return;
    }

    if (!importQuizName.trim()) {
      toast.error('Please enter a name for the imported quiz');
      return;
    }

    try {
      const text = importFile ? await importFile.text() : pastedJson;
      const quizData = JSON.parse(text);

      // Validate required fields
      if (!Array.isArray(quizData.questions)) {
        throw new Error('Quiz must have a questions array');
      }

      // Use the new name provided by user
      quizData.title = importQuizName.trim();
      
      // Set category if selected
      if (importCategoryId) {
        const selectedCat = categories.find(c => c.id === importCategoryId);
        quizData.category_id = importCategoryId;
        quizData.category = selectedCat?.name || '';
      }

      // Create the quiz
      createMutation.mutate(quizData);
    } catch (error) {
      toast.error('Invalid quiz file: ' + error.message);
    }
  };

  const handleFileDrop = async (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/json') {
      setImportFile(file);
      setPastedJson('');
      // Try to extract the original quiz name from the file
      try {
        const text = await file.text();
        const quizData = JSON.parse(text);
        if (quizData.title) {
          setImportQuizName(quizData.title + ' (Imported)');
        }
      } catch (error) {
        // If parsing fails, just leave the name empty
      }
    } else {
      toast.error('Please drop a valid JSON file');
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setImportFile(file);
      setPastedJson('');
      // Try to extract the original quiz name from the file
      try {
        const text = await file.text();
        const quizData = JSON.parse(text);
        if (quizData.title) {
          setImportQuizName(quizData.title + ' (Imported)');
        }
      } catch (error) {
        // If parsing fails, just leave the name empty
      }
    }
  };

  const handlePasteJson = (text) => {
    setPastedJson(text);
    setImportFile(null);
    // Try to extract the original quiz name from pasted JSON
    try {
      const quizData = JSON.parse(text);
      if (quizData.title) {
        setImportQuizName(quizData.title + ' (Imported)');
      }
    } catch (error) {
      // If parsing fails, just leave the name empty
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200/60 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => window.history.back()}>
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl shadow-lg shadow-indigo-200">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">Manage Quizzes</h1>
                <p className="text-sm text-slate-500">Create and manage quizzes</p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Link to={createPageUrl('QuizAnalytics')}>
                <Button variant="outline" className="gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Analytics
                </Button>
              </Link>
              <Link to={createPageUrl('ManageCategories')}>
                <Button variant="outline" className="gap-2">
                  <Plus className="w-4 h-4" />
                  Manage Categories
                </Button>
              </Link>
              <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Upload className="w-4 h-4" />
                    Import Quiz
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle className="flex items-center justify-between">
                      Import Quiz
                      <Dialog open={formatGuideOpen} onOpenChange={setFormatGuideOpen}>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Info className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Quiz File Format Guide</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 text-sm">
                            <div>
                              <h3 className="font-semibold text-slate-800 mb-2">File Format</h3>
                              <p className="text-slate-600 mb-2">The quiz file must be in JSON format with the following structure:</p>
                              <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto text-xs">
{`{
  "title": "Quiz Title",
  "description": "Quiz description",
  "category": "general_knowledge",
  "timer_enabled": false,
  "timer_duration": 30,
  "attempts_allowed": 999,
  "status": "draft",
  "questions": []
}`}</pre>
                            </div>
                            
                            <div>
                              <h3 className="font-semibold text-slate-800 mb-2">Question Types</h3>
                              <div className="space-y-3">
                                <div>
                                  <p className="font-medium text-slate-700">1. Multiple Choice</p>
                                  <pre className="bg-slate-900 text-slate-100 p-3 rounded-lg overflow-x-auto text-xs mt-1">
{`{
  "id": "q1",
  "type": "multiple_choice",
  "question": "Question text?",
  "options": ["Option 1", "Option 2", "Option 3"],
  "correctAnswer": "Option 1",
  "explanation": "Optional explanation"
}`}</pre>
                                </div>
                                
                                <div>
                                  <p className="font-medium text-slate-700">2. Reading Comprehension</p>
                                  <pre className="bg-slate-900 text-slate-100 p-3 rounded-lg overflow-x-auto text-xs mt-1">
{`{
  "id": "q2",
  "type": "reading_comprehension",
  "passage": "Reading passage text...",
  "comprehensionQuestions": [
    {
      "id": "cq1",
      "question": "Question about the passage?",
      "options": ["A", "B", "C"],
      "correctAnswer": "A"
    }
  ]
}`}</pre>
                                </div>
                                
                                <div>
                                  <p className="font-medium text-slate-700">3. Drag & Drop</p>
                                  <pre className="bg-slate-900 text-slate-100 p-3 rounded-lg overflow-x-auto text-xs mt-1">
{`{
  "id": "q3",
  "type": "drag_drop_single",
  "question": "Match items",
  "options": ["Item 1", "Item 2"],
  "dropZones": [
    {
      "id": "zone1",
      "label": "Zone 1",
      "correctAnswer": "Item 1"
    }
  ]
}`}</pre>
                                </div>
                                
                                <div>
                                  <p className="font-medium text-slate-700">4. Fill in the Blanks</p>
                                  <pre className="bg-slate-900 text-slate-100 p-3 rounded-lg overflow-x-auto text-xs mt-1">
{`{
  "id": "q4",
  "type": "inline_dropdown_separate",
  "question": "Complete the sentence",
  "textWithBlanks": "The sky is {{blank1}}",
  "blanks": [
    {
      "id": "blank1",
      "options": ["blue", "green", "red"],
      "correctAnswer": "blue"
    }
  ]
}`}</pre>
                                </div>
                              </div>
                            </div>
                            
                            <div>
                              <h3 className="font-semibold text-slate-800 mb-2">Tips</h3>
                              <ul className="list-disc list-inside text-slate-600 space-y-1">
                                <li>Export an existing quiz to see the exact format</li>
                                <li>Each question must have a unique ID</li>
                                <li>Status can be "draft" or "published"</li>
                                <li>Category should match existing categories</li>
                                <li>All fields with HTML content should be valid HTML strings</li>
                              </ul>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </DialogTitle>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    <div
                      onDrop={handleFileDrop}
                      onDragOver={(e) => e.preventDefault()}
                      className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-indigo-400 transition-colors cursor-pointer"
                      onClick={() => document.getElementById('quiz-file-upload').click()}
                    >
                      <input
                        id="quiz-file-upload"
                        type="file"
                        accept=".json"
                        className="hidden"
                        onChange={handleFileSelect}
                      />
                      <Upload className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                      {importFile ? (
                        <div>
                          <p className="text-sm font-medium text-slate-800">{importFile.name}</p>
                          <p className="text-xs text-slate-500 mt-1">Click to change file</p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-sm font-medium text-slate-800 mb-1">
                            Drop your quiz JSON file here
                          </p>
                          <p className="text-xs text-slate-500">or click to browse</p>
                        </div>
                      )}
                    </div>

                    <div className="text-center text-sm text-slate-500">or</div>

                    <div className="space-y-2">
                      <Label>Paste JSON</Label>
                      <Textarea
                        value={pastedJson}
                        onChange={(e) => handlePasteJson(e.target.value)}
                        placeholder='Paste quiz JSON here...'
                        className="min-h-[120px] font-mono text-xs"
                      />
                    </div>
                    
                    {(importFile || pastedJson) && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="quiz-name">Quiz Name</Label>
                          <Input
                            id="quiz-name"
                            value={importQuizName}
                            onChange={(e) => setImportQuizName(e.target.value)}
                            placeholder="Enter a name for the imported quiz"
                            className="w-full"
                          />
                        </div>
                        
                        <div className="space-y-2 relative">
                          <Label htmlFor="quiz-category">Category (Optional)</Label>
                          <Input
                            id="quiz-category"
                            placeholder="Search and select category..."
                            value={importCategorySearch}
                            onChange={(e) => setImportCategorySearch(e.target.value)}
                            onFocus={() => setImportCategoryDropdownOpen(true)}
                            onBlur={() => setTimeout(() => setImportCategoryDropdownOpen(false), 200)}
                          />
                          {importCategoryDropdownOpen && (
                            <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                              {sortedCategories
                                .filter(cat => cat.name.toLowerCase().includes(importCategorySearch.toLowerCase()))
                                .map((cat) => (
                                  <button
                                    key={cat.id}
                                    type="button"
                                    onClick={() => {
                                      setImportCategoryId(cat.id);
                                      setImportCategorySearch(cat.name);
                                      setImportCategoryDropdownOpen(false);
                                    }}
                                    className="w-full px-4 py-2 text-left hover:bg-slate-100 transition-colors"
                                  >
                                    {cat.name}
                                  </button>
                                ))}
                              {sortedCategories.filter(cat => cat.name.toLowerCase().includes(importCategorySearch.toLowerCase())).length === 0 && (
                                <div className="px-4 py-2 text-sm text-slate-500">No categories found</div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setImportDialogOpen(false);
                          setImportFile(null);
                          setPastedJson('');
                          setImportQuizName('');
                          setImportCategoryId('');
                          setImportCategorySearch('');
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleImportFile}
                        disabled={(!importFile && !pastedJson.trim()) || !importQuizName.trim() || createMutation.isPending}
                        className="bg-indigo-600 hover:bg-indigo-700"
                      >
                        {createMutation.isPending ? 'Importing...' : 'Import Quiz'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              <Link to={createPageUrl('CreateQuiz')}>
                <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200">
                  <Plus className="w-4 h-4" />
                  Create Quiz
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            placeholder="Search quizzes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-12 h-12 text-base bg-white border-slate-200 rounded-xl shadow-sm" />

        </div>

        {/* Category Filter */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedCategory === 'all' ? 'default' : 'outline'}
              onClick={() => setSelectedCategory('all')}
              className="whitespace-nowrap"
            >
              All Categories
              <span className="ml-2 text-xs opacity-70">({quizzes.length})</span>
            </Button>
            {sortedCategories.map((cat) => (
              <Button
                key={cat.id}
                variant={selectedCategory === cat.id ? 'default' : 'outline'}
                onClick={() => setSelectedCategory(cat.id)}
                className="whitespace-nowrap"
              >
                {cat.name}
                <span className="ml-2 text-xs opacity-70">
                  ({quizCounts[cat.id] || 0})
                </span>
              </Button>
            ))}
          </div>
        </div>

        {/* Sort Controls */}
        <div className="flex items-center justify-between mb-8">
          <p className="text-sm text-slate-600">
            Showing <span className="font-semibold text-slate-800">{sortedQuizzes.length}</span> quiz{sortedQuizzes.length !== 1 ? 'zes' : ''}
          </p>
          <div className="flex gap-2">
            <div className="flex border border-slate-200 rounded-lg overflow-hidden">
              <Button
                variant={viewMode === 'card' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('card')}
                className="rounded-none px-3"
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="rounded-none border-l px-3"
              >
                <List className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'compact' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('compact')}
                className="rounded-none border-l px-3"
              >
                <ListOrdered className="w-4 h-4" />
              </Button>
            </div>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="title_asc">Title (A-Z)</SelectItem>
                <SelectItem value="title_desc">Title (Z-A)</SelectItem>
                <SelectItem value="questions_most">Most Questions</SelectItem>
                <SelectItem value="questions_least">Fewest Questions</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Quiz Grid/List */}
        {(isLoading || userLoading) ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl p-6 border border-slate-200">
                <Skeleton className="h-6 w-3/4 mb-3" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3 mb-6" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        ) : sortedQuizzes.length > 0 ? (
          <div className={cn(
            viewMode === 'card' && "grid sm:grid-cols-2 lg:grid-cols-3 gap-6",
            viewMode === 'list' && "space-y-4",
            viewMode === 'compact' && "space-y-2"
          )}>
            {sortedQuizzes.map((quiz, idx) => {
              // Filter data for this specific quiz
              const quizAttempts = allAttempts.filter(a => a.quiz_id === quiz.id);
              const quizCourses = allCourses.filter(course => 
                course.quiz_ids?.includes(quiz.id) || 
                course.content_blocks?.some(block => block.type === 'quiz' && block.quiz_id === quiz.id)
              );

              return (
                <QuizCard
                  key={quiz.id}
                  quiz={quiz}
                  index={idx}
                  viewMode={viewMode}
                  onDelete={handleDelete}
                  onEdit={(quiz) => window.location.href = createPageUrl(`CreateQuiz?id=${quiz.id}`)}
                  onExport={handleExportQuiz}
                  attempts={quizAttempts}
                  courses={quizCourses}
                />
              );
            })}
          </div>
        ) : (
          <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-16">

            <div className="w-20 h-20 bg-indigo-100 rounded-full mx-auto mb-6 flex items-center justify-center">
              <Sparkles className="w-10 h-10 text-indigo-500" />
            </div>
            <h3 className="text-xl font-semibold text-slate-800 mb-2">
              {searchTerm ? 'No quizzes found' : 'No quizzes yet'}
            </h3>
            <p className="text-slate-500 mb-6">
              {searchTerm ?
            'Try a different search term' :
            'Create your first quiz to get started'}
            </p>
            {!searchTerm &&
          <Link to={createPageUrl('CreateQuiz')}>
                <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700">
                  <Plus className="w-4 h-4" />
                  Create Your First Quiz
                </Button>
              </Link>
          }
          </motion.div>
        )}
      </div>
    </div>);

}