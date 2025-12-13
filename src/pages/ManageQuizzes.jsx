import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, BookOpen, Sparkles, ChevronLeft, BarChart3, Grid3x3, List, ListTree } from 'lucide-react';
import QuizCard from '@/components/quiz/QuizCard';
import CategoryFilter from '@/components/quiz/CategoryFilter';
import SortFilter from '@/components/quiz/SortFilter';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export default function ManageQuizzes() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState('card');
  const queryClient = useQueryClient();

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      try {
        return await base44.auth.me();
      } catch (e) {
        base44.auth.redirectToLogin(window.location.pathname);
        return null;
      }
    },
  });

  const { data: quizzes = [], isLoading } = useQuery({
    queryKey: ['quizzes'],
    queryFn: () => base44.entities.Quiz.list('-created_date')
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Quiz.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['quizzes'] })
  });

  // Filter by search and category
  const filteredQuizzes = quizzes.filter((quiz) => {
    const matchesSearch = quiz.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    quiz.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || quiz.category === selectedCategory;
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
    const category = quiz.category || 'Uncategorized';
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {});

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this quiz?')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200/60 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link to={createPageUrl('AdminDashboard')}>
                <Button variant="ghost" size="icon">
                  <ChevronLeft className="w-5 h-5" />
                </Button>
              </Link>
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
          <CategoryFilter
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            quizCounts={quizCounts} />

        </div>

        {/* Sort Controls */}
        <div className="flex items-center justify-between mb-8">
          <p className="text-sm text-slate-600">
            Showing <span className="font-semibold text-slate-800">{sortedQuizzes.length}</span> quiz{sortedQuizzes.length !== 1 ? 'zes' : ''}
          </p>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              <button
                onClick={() => setViewMode('card')}
                className={cn(
                  "p-2 rounded transition-colors",
                  viewMode === 'card' ? "bg-white shadow-sm text-indigo-600" : "text-slate-500 hover:text-slate-700"
                )}
                title="Card View"
              >
                <Grid3x3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  "p-2 rounded transition-colors",
                  viewMode === 'list' ? "bg-white shadow-sm text-indigo-600" : "text-slate-500 hover:text-slate-700"
                )}
                title="List View"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('compact')}
                className={cn(
                  "p-2 rounded transition-colors",
                  viewMode === 'compact' ? "bg-white shadow-sm text-indigo-600" : "text-slate-500 hover:text-slate-700"
                )}
                title="Compact View"
              >
                <ListTree className="w-4 h-4" />
              </button>
            </div>
            <SortFilter sortBy={sortBy} onSortChange={setSortBy} />
          </div>
        </div>

        {/* Quiz Grid/List */}
        {(isLoading || userLoading) ?
        <div className={cn(
          viewMode === 'card' && "grid sm:grid-cols-2 lg:grid-cols-3 gap-6",
          (viewMode === 'list' || viewMode === 'compact') && "space-y-3"
        )}>
            {[1, 2, 3].map((i) =>
          <div key={i} className="bg-white rounded-2xl p-6 border border-slate-200">
                <Skeleton className="h-6 w-3/4 mb-3" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3 mb-6" />
                <Skeleton className="h-10 w-full" />
              </div>
          )}
          </div> :
        sortedQuizzes.length > 0 ?
        viewMode === 'card' ?
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedQuizzes.map((quiz, idx) =>
          <QuizCard
            key={quiz.id}
            quiz={quiz}
            index={idx}
            onDelete={handleDelete}
            onEdit={(quiz) => window.location.href = createPageUrl(`CreateQuiz?id=${quiz.id}`)} />

          )}
          </div> :
        viewMode === 'list' ?
        <div className="space-y-3">
            {sortedQuizzes.map((quiz, idx) =>
          <motion.div
            key={quiz.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.03 }}
            className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">

              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-slate-800 text-lg">{quiz.title}</h3>
                    {quiz.status === 'published' ?
                  <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium rounded">Published</span> :
                  <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded">Draft</span>
                }
                  </div>
                  {quiz.description &&
                <p className="text-sm text-slate-600 mb-3">{quiz.description}</p>
              }
                  <div className="flex items-center gap-4 text-sm text-slate-500">
                    <span className="flex items-center gap-1">
                      <BookOpen className="w-4 h-4" />
                      {quiz.questions?.length || 0} questions
                    </span>
                    {quiz.category &&
                  <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded">{quiz.category}</span>
                }
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link to={createPageUrl(`CreateQuiz?id=${quiz.id}`)}>
                    <Button variant="outline" size="sm">Edit</Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(quiz.id)}
                    className="text-red-500 hover:text-red-600 hover:bg-red-50">
                    Delete
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
          </div> :
        <div className="space-y-2">
            {sortedQuizzes.map((quiz, idx) =>
          <motion.div
            key={quiz.id}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.02 }}
            className="bg-white rounded-lg border border-slate-200 p-3 hover:shadow transition-shadow">

              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-8 h-8 rounded bg-indigo-100 text-indigo-600 font-bold flex items-center justify-center text-sm flex-shrink-0">
                    {quiz.questions?.length || 0}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-slate-800 truncate">{quiz.title}</h3>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      {quiz.category &&
                    <span>{quiz.category}</span>
                  }
                      {quiz.status === 'published' ?
                    <span className="text-emerald-600">• Published</span> :
                    <span className="text-amber-600">• Draft</span>
                  }
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Link to={createPageUrl(`CreateQuiz?id=${quiz.id}`)}>
                    <Button variant="ghost" size="sm" className="h-8 px-3 text-xs">Edit</Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(quiz.id)}
                    className="h-8 px-3 text-xs text-red-500 hover:text-red-600 hover:bg-red-50">
                    Delete
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
          </div> :

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
        }
      </div>
    </div>);

}