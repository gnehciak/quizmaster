import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  ChevronLeft, 
  Lock, 
  Unlock, 
  CreditCard, 
  Key,
  PlayCircle,
  CheckCircle2,
  Loader2,
  Plus,
  FileText,
  GripVertical,
  Trash2,
  Pencil,
  Link as LinkIcon,
  FileUp,
  Youtube,
  Upload,
  Search,
  Copy,
  Eye,
  EyeOff,
  Clock
} from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Sparkles } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from '@/components/ui/label';

export default function CourseDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const courseId = urlParams.get('id');
  const queryClient = useQueryClient();

  const [unlockCode, setUnlockCode] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [addContentOpen, setAddContentOpen] = useState(false);
  const [contentType, setContentType] = useState('');
  const [textContent, setTextContent] = useState('');
  const [selectedQuizId, setSelectedQuizId] = useState('');
  const [websiteLink, setWebsiteLink] = useState('');
  const [websiteLinkTitle, setWebsiteLinkTitle] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [editCourseOpen, setEditCourseOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [purchaseSuccessOpen, setPurchaseSuccessOpen] = useState(false);
  const [quizSearch, setQuizSearch] = useState('');
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [schedulingBlock, setSchedulingBlock] = useState(null);

  const quillModules = {
    toolbar: [
      ['bold', 'italic', 'underline'],
      [{ 'background': [] }]
    ]
  };

  const quillFormats = ['bold', 'italic', 'underline', 'background'];

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      try {
        return await base44.auth.me();
      } catch (e) {
        base44.auth.redirectToLogin(window.location.pathname + window.location.search);
        return null;
      }
    },
  });

  const { data: course, isLoading } = useQuery({
    queryKey: ['course', courseId],
    queryFn: () => base44.entities.Course.filter({ id: courseId }),
    enabled: !!courseId,
    select: (data) => data[0]
  });

  const { data: quizzes = [] } = useQuery({
    queryKey: ['quizzes'],
    queryFn: () => base44.entities.Quiz.list(),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['courseCategories'],
    queryFn: () => base44.entities.CourseCategory.list(),
  });

  const { data: access } = useQuery({
    queryKey: ['courseAccess', courseId, user?.email],
    queryFn: () => base44.entities.CourseAccess.filter({ 
      course_id: courseId, 
      user_email: user.email 
    }),
    enabled: !!courseId && !!user?.email,
    select: (data) => data[0]
  });

  const { data: allQuizAttempts = [] } = useQuery({
    queryKey: ['allQuizAttempts', user?.email],
    queryFn: () => base44.entities.QuizAttempt.filter({ user_email: user?.email }),
    enabled: !!user?.email
  });

  // Check visibility permissions
  const canViewCourse = React.useMemo(() => {
    if (!course || !user) return false;
    
    if (user.role === 'admin') return true;
    if (course.visibility === 'admin') return false;
    if (course.visibility === 'private') {
      return course.created_by === user.email || user.role === 'admin';
    }
    return true;
  }, [course, user]);

  const hasAccess = !course?.is_locked || !!access || user?.role === 'admin' || user?.role === 'teacher';
  const courseQuizzes = quizzes.filter(q => course?.quiz_ids?.includes(q.id));
  const isAdmin = user?.role === 'admin' || user?.role === 'teacher';
  const contentBlocks = course?.content_blocks || [];

  // Handle payment status from URL
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get('payment');
    
    if (paymentStatus === 'success') {
      setPurchaseSuccessOpen(true);
      queryClient.invalidateQueries({ queryKey: ['courseAccess'] });
      // Clean URL after a short delay to ensure dialog is visible
      setTimeout(() => {
        window.history.replaceState({}, '', window.location.pathname + '?id=' + courseId);
      }, 100);
    } else if (paymentStatus === 'cancelled') {
      toast.error('Payment was cancelled. Please try again.');
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname + '?id=' + courseId);
    }
  }, []);

  const updateCourseMutation = useMutation({
    mutationFn: (data) => base44.entities.Course.update(courseId, data),
    onSuccess: () => {
      console.log('Course updated successfully, invalidating queries');
      queryClient.invalidateQueries({ queryKey: ['course', courseId] });
    },
    onError: (error) => {
      console.error('Update course mutation error:', error);
    }
  });

  const unlockMutation = useMutation({
    mutationFn: (data) => base44.entities.CourseAccess.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courseAccess'] });
      setError('');
    }
  });

  const handleCodeUnlock = async () => {
    if (!unlockCode.trim()) {
      setError('Please enter a code');
      return;
    }

    if (unlockCode !== course.unlock_code) {
      setError('Invalid code');
      return;
    }

    await unlockMutation.mutateAsync({
      user_email: user.email,
      course_id: courseId,
      unlock_method: 'code'
    });
  };

  const handlePurchase = async () => {
    setProcessing(true);
    setError('');
    
    try {
      // Create Stripe checkout session
      const { data } = await base44.functions.invoke('createCheckout', {
        courseId: courseId
      });

      if (data.url) {
        // Redirect to Stripe checkout
        window.location.href = data.url;
      } else {
        setError('Failed to create checkout session');
        setProcessing(false);
      }
    } catch (e) {
      console.error('Purchase error:', e);
      setError('Failed to start checkout');
      setProcessing(false);
    }
  };

  const handleAddContent = async () => {
    if (editingBlock) {
      // Update existing block
      const updatedBlocks = contentBlocks.map(block => {
        if (block.id === editingBlock.id) {
          const updated = { ...block };
          if (contentType === 'text') updated.text = textContent;
          else if (contentType === 'quiz') updated.quiz_id = selectedQuizId;
          else if (contentType === 'website_link') {
            updated.url = websiteLink;
            updated.title = websiteLinkTitle;
          }
          else if (contentType === 'embed_file') updated.file_url = fileUrl;
          else if (contentType === 'embed_youtube') updated.youtube_url = youtubeUrl;
          else if (contentType === 'upload_file') {
            updated.file_url = fileUrl;
            updated.file_name = fileName;
          }
          return updated;
        }
        return block;
      });
      await updateCourseMutation.mutateAsync({ content_blocks: updatedBlocks });
    } else {
      // Add new block
      const newBlock = {
        id: `block_${Date.now()}`,
        type: contentType
      };

      if (contentType === 'text') newBlock.text = textContent;
      else if (contentType === 'quiz') newBlock.quiz_id = selectedQuizId;
      else if (contentType === 'website_link') {
        newBlock.url = websiteLink;
        newBlock.title = websiteLinkTitle;
      }
      else if (contentType === 'embed_file') newBlock.file_url = fileUrl;
      else if (contentType === 'embed_youtube') newBlock.youtube_url = youtubeUrl;
      else if (contentType === 'upload_file') {
        newBlock.file_url = fileUrl;
        newBlock.file_name = fileName;
      }

      const updatedBlocks = [...contentBlocks, newBlock];
      await updateCourseMutation.mutateAsync({ content_blocks: updatedBlocks });
    }
    
    setAddContentOpen(false);
    setTextContent('');
    setSelectedQuizId('');
    setWebsiteLink('');
    setWebsiteLinkTitle('');
    setFileUrl('');
    setFileName('');
    setYoutubeUrl('');
    setContentType('');
    setEditingBlock(null);
  };

  const handleEditBlock = (block) => {
    setEditingBlock(block);
    setContentType(block.type);
    if (block.type === 'text') setTextContent(block.text || '');
    else if (block.type === 'quiz') setSelectedQuizId(block.quiz_id || '');
    else if (block.type === 'website_link') {
      setWebsiteLink(block.url || '');
      setWebsiteLinkTitle(block.title || '');
    }
    else if (block.type === 'embed_file') setFileUrl(block.file_url || '');
    else if (block.type === 'embed_youtube') setYoutubeUrl(block.youtube_url || '');
    else if (block.type === 'upload_file') {
      setFileUrl(block.file_url || '');
      setFileName(block.file_name || '');
    }
    setAddContentOpen(true);
  };

  const handleFileUpload = async (file) => {
    setUploadingFile(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      setFileUrl(result.file_url);
      setFileName(file.name);
    } catch (e) {
      console.error('Upload failed:', e);
    }
    setUploadingFile(false);
  };

  const handleEditCourse = () => {
    setEditCourseOpen(true);
  };

  const handleUpdateCourse = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      title: formData.get('title'),
      description: formData.get('description'),
      category: formData.get('category'),
      is_locked: formData.get('is_locked') === 'true',
      unlock_code: formData.get('unlock_code') || undefined,
      price: formData.get('price') ? parseFloat(formData.get('price')) : undefined
    };
    await updateCourseMutation.mutateAsync(data);
    setEditCourseOpen(false);
  };

  const handleReorderContent = async (startIndex, endIndex) => {
    const result = Array.from(contentBlocks);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    await updateCourseMutation.mutateAsync({ content_blocks: result });
  };

  const handleDeleteBlock = async (blockId) => {
    if (!confirm('Delete this content block?')) return;
    const updatedBlocks = contentBlocks.filter(b => b.id !== blockId);
    await updateCourseMutation.mutateAsync({ content_blocks: updatedBlocks });
  };

  const handleToggleVisibility = async (blockId) => {
    try {
      console.log('Toggle visibility for block:', blockId);
      console.log('Current blocks:', contentBlocks);

      const targetBlock = contentBlocks.find(b => b.id === blockId);
      console.log('Target block before:', targetBlock);

      const updatedBlocks = contentBlocks.map(b => {
        if (b.id === blockId) {
          // Toggle: if currently false (hidden), set to undefined (visible), otherwise set to false (hidden)
          const newVisible = b.visible === false ? undefined : false;
          console.log('Toggling from', b.visible, 'to', newVisible);
          return { ...b, visible: newVisible };
        }
        return b;
      });

      console.log('Sending update with blocks:', updatedBlocks);
      const result = await updateCourseMutation.mutateAsync({ content_blocks: updatedBlocks });
      console.log('Update result:', result);

      const updatedBlock = updatedBlocks.find(b => b.id === blockId);
      toast.success(updatedBlock.visible === false ? 'Content hidden from students' : 'Content visible to students');
    } catch (error) {
      toast.error('Failed to update visibility');
      console.error('Visibility toggle error:', error);
    }
  };

  const handleSchedule = async (blockId, showDate, hideDate) => {
    const updatedBlocks = contentBlocks.map(b => {
      if (b.id === blockId) {
        return { ...b, scheduledShowDate: showDate || null, scheduledHideDate: hideDate || null };
      }
      return b;
    });
    await updateCourseMutation.mutateAsync({ content_blocks: updatedBlocks });
    setScheduleDialogOpen(false);
    setSchedulingBlock(null);
  };

  const isBlockVisible = (block) => {
    // For admins, always show everything
    if (isAdmin) return true;
    
    // Check manual visibility toggle
    if (block.visible === false) return false;
    
    // Check scheduled visibility
    const now = new Date();
    if (block.scheduledShowDate && new Date(block.scheduledShowDate) > now) return false;
    if (block.scheduledHideDate && new Date(block.scheduledHideDate) < now) return false;
    
    return true;
  };

  if (isLoading || userLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-slate-800 mb-4">Course not found</h2>
          <Link to={createPageUrl('Home')}>
            <Button>Back to Courses</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!canViewCourse) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 flex items-center justify-center">
        <div className="text-center">
          <Lock className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-800 mb-2">Access Denied</h2>
          <p className="text-slate-600 mb-4">You don't have permission to view this course</p>
          <Link to={createPageUrl('Home')}>
            <Button>Back to Courses</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      {/* Header */}
      {/* Purchase Success Dialog */}
      <Dialog open={purchaseSuccessOpen} onOpenChange={setPurchaseSuccessOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl">🎉 Purchase Successful!</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-10 h-10 text-emerald-600" />
              </div>
              <p className="text-lg font-semibold text-slate-800 mb-2">
                You now have access to this course!
              </p>
              <p className="text-slate-600">
                Start learning right away with all course content unlocked.
              </p>
            </div>
          </div>
          <Button 
            onClick={() => setPurchaseSuccessOpen(false)}
            className="w-full bg-emerald-600 hover:bg-emerald-700"
          >
            Start Learning
          </Button>
        </DialogContent>
      </Dialog>

      <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200/60">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3 flex-1">
              <Link to={createPageUrl('Home')}>
                <Button variant="ghost" size="icon">
                  <ChevronLeft className="w-5 h-5" />
                </Button>
              </Link>
              <h1 className="text-2xl font-bold text-slate-800">{course.title}</h1>
            </div>
            {isAdmin && (
              <Button variant="outline" size="sm" onClick={handleEditCourse} className="gap-2">
                <Pencil className="w-4 h-4" />
                Edit Course
              </Button>
            )}
          </div>
          <p className="text-slate-600">{course.description}</p>
        </div>
      </div>

      {/* Edit Course Dialog */}
      <Dialog open={editCourseOpen} onOpenChange={setEditCourseOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Course</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateCourse} className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input name="title" defaultValue={course?.title} required />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea name="description" defaultValue={course?.description} />
            </div>

            <div>
              <Label>Category</Label>
              <Select name="category" defaultValue={course?.category}>
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

            <div>
              <Label>Locked</Label>
              <Select name="is_locked" defaultValue={course?.is_locked?.toString() || 'true'}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Yes - Requires unlock</SelectItem>
                  <SelectItem value="false">No - Free access</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Unlock Code (optional)</Label>
              <Input name="unlock_code" defaultValue={course?.unlock_code} />
            </div>

            <div>
              <Label>Price (optional)</Label>
              <Input name="price" type="number" step="0.01" defaultValue={course?.price} />
            </div>

            <Button type="submit" className="w-full">
              Update Course
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Unlock Section */}
        {!hasAccess && (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 mb-8">
            <div className="text-center mb-8">
              <Lock className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-slate-800 mb-2">
                This course is locked
              </h2>
              <p className="text-slate-600">
                Unlock this course to access all quizzes and content
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Unlock with Code */}
              <div className="border border-slate-200 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Key className="w-6 h-6 text-indigo-500" />
                  <h3 className="font-semibold text-slate-800">Have a code?</h3>
                </div>
                <Input
                  placeholder="Enter unlock code"
                  value={unlockCode}
                  onChange={(e) => setUnlockCode(e.target.value)}
                  className="mb-3"
                />
                {error && (
                  <p className="text-sm text-red-600 mb-3">{error}</p>
                )}
                <Button 
                  onClick={handleCodeUnlock}
                  className="w-full"
                  disabled={!unlockCode.trim()}
                >
                  <Unlock className="w-4 h-4 mr-2" />
                  Unlock with Code
                </Button>
              </div>

              {/* Purchase */}
              {course.price && (
                <div className="border border-slate-200 rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <CreditCard className="w-6 h-6 text-indigo-500" />
                    <h3 className="font-semibold text-slate-800">Purchase</h3>
                  </div>
                  <p className="text-3xl font-bold text-indigo-600 mb-4">
                    ${course.price}
                  </p>
                  {error && (
                    <p className="text-sm text-red-600 mb-3">{error}</p>
                  )}
                  <Button 
                    onClick={handlePurchase}
                    className="w-full bg-indigo-600 hover:bg-indigo-700"
                    disabled={processing}
                  >
                    {processing ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <CreditCard className="w-4 h-4 mr-2" />
                    )}
                    Purchase Course
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Course Content */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-800">
              Course Content
            </h2>
            {isAdmin && (
              <Dialog open={addContentOpen} onOpenChange={(open) => {
                setAddContentOpen(open);
                if (!open) {
                  setEditingBlock(null);
                  setContentType('');
                  setTextContent('');
                  setSelectedQuizId('');
                  setWebsiteLink('');
                  setWebsiteLinkTitle('');
                  setFileUrl('');
                  setFileName('');
                  setYoutubeUrl('');
                }
              }}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-2">
                    <Plus className="w-4 h-4" />
                    Add Content
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingBlock ? 'Edit Content Block' : 'Add Content Block'}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    {!contentType && !editingBlock ? (
                      <div className="space-y-2">
                        <label className="text-sm font-medium mb-2 block">Select Content Type</label>
                        <div className="grid gap-2">
                          <Button variant="outline" onClick={() => setContentType('quiz')} className="justify-start gap-2 h-auto py-3">
                            <PlayCircle className="w-5 h-5" />
                            <div className="text-left">
                              <div className="font-medium">Quiz</div>
                              <div className="text-xs text-slate-500">Add an interactive quiz</div>
                            </div>
                          </Button>
                          <Button variant="outline" onClick={() => setContentType('text')} className="justify-start gap-2 h-auto py-3">
                            <FileText className="w-5 h-5" />
                            <div className="text-left">
                              <div className="font-medium">Text Block</div>
                              <div className="text-xs text-slate-500">Add rich text content</div>
                            </div>
                          </Button>
                          <Button variant="outline" onClick={() => setContentType('website_link')} className="justify-start gap-2 h-auto py-3">
                            <LinkIcon className="w-5 h-5" />
                            <div className="text-left">
                              <div className="font-medium">Website Link</div>
                              <div className="text-xs text-slate-500">Link to external content</div>
                            </div>
                          </Button>
                          <Button variant="outline" onClick={() => setContentType('embed_file')} className="justify-start gap-2 h-auto py-3">
                            <FileUp className="w-5 h-5" />
                            <div className="text-left">
                              <div className="font-medium">Embed File</div>
                              <div className="text-xs text-slate-500">Embed PDF or document</div>
                            </div>
                          </Button>
                          <Button variant="outline" onClick={() => setContentType('embed_youtube')} className="justify-start gap-2 h-auto py-3">
                            <Youtube className="w-5 h-5" />
                            <div className="text-left">
                              <div className="font-medium">YouTube Video</div>
                              <div className="text-xs text-slate-500">Embed a YouTube video</div>
                            </div>
                          </Button>
                          <Button variant="outline" onClick={() => setContentType('upload_file')} className="justify-start gap-2 h-auto py-3">
                            <Upload className="w-5 h-5" />
                            <div className="text-left">
                              <div className="font-medium">Upload File</div>
                              <div className="text-xs text-slate-500">Upload a file for download</div>
                            </div>
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {!editingBlock && (
                          <Button variant="ghost" onClick={() => setContentType('')} className="text-sm">
                            ← Back to content types
                          </Button>
                        )}

                        {contentType === 'text' && (
                          <div>
                            <label className="text-sm font-medium mb-2 block">Text Content</label>
                            <ReactQuill
                              value={textContent}
                              onChange={setTextContent}
                              placeholder="Enter text content..."
                              modules={quillModules}
                              formats={quillFormats}
                              className="bg-white rounded-lg"
                            />
                          </div>
                        )}

                        {contentType === 'quiz' && (
                          <div className="space-y-4">
                            <div>
                              <label className="text-sm font-medium mb-2 block">Search Quiz</label>
                              <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <Input
                                  value={quizSearch}
                                  onChange={(e) => setQuizSearch(e.target.value)}
                                  placeholder="Search quizzes..."
                                  className="pl-10"
                                />
                              </div>
                            </div>

                            <div className="space-y-2 max-h-64 overflow-y-auto">
                              {quizzes
                                .filter(q => q.title?.toLowerCase().includes(quizSearch.toLowerCase()))
                                .map(quiz => (
                                  <button
                                    key={quiz.id}
                                    type="button"
                                    onClick={() => setSelectedQuizId(quiz.id)}
                                    className={cn(
                                      "w-full p-3 rounded-lg border-2 text-left transition-all",
                                      selectedQuizId === quiz.id
                                        ? "border-indigo-500 bg-indigo-50"
                                        : "border-slate-200 hover:border-slate-300"
                                    )}
                                  >
                                    <div className="font-medium text-slate-800">{quiz.title}</div>
                                    <div className="text-xs text-slate-500 mt-1">
                                      {quiz.questions?.length || 0} questions
                                    </div>
                                  </button>
                                ))}
                            </div>

                            <div className="flex gap-2">
                              <Link to={createPageUrl(`CreateQuiz?courseId=${courseId}`)} className="flex-1">
                                <Button type="button" variant="outline" className="w-full gap-2">
                                  <Plus className="w-4 h-4" />
                                  Create New Quiz
                                </Button>
                              </Link>
                              {selectedQuizId && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={async () => {
                                    const quiz = quizzes.find(q => q.id === selectedQuizId);
                                    if (!quiz) return;

                                    const duplicated = {
                                      ...quiz,
                                      title: quiz.title + ' (Copy)',
                                      id: undefined
                                    };

                                    const newQuiz = await base44.entities.Quiz.create(duplicated);
                                    setSelectedQuizId(newQuiz.id);
                                    queryClient.invalidateQueries({ queryKey: ['quizzes'] });
                                    toast.success('Quiz duplicated successfully');
                                  }}
                                  className="gap-2"
                                >
                                  <Copy className="w-4 h-4" />
                                  Duplicate Selected
                                </Button>
                              )}
                            </div>
                          </div>
                        )}

                        {contentType === 'website_link' && (
                          <>
                            <div>
                              <label className="text-sm font-medium mb-2 block">Link Title</label>
                              <Input
                                value={websiteLinkTitle}
                                onChange={(e) => setWebsiteLinkTitle(e.target.value)}
                                placeholder="e.g. Read the documentation"
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium mb-2 block">Website URL</label>
                              <Input
                                value={websiteLink}
                                onChange={(e) => setWebsiteLink(e.target.value)}
                                placeholder="https://example.com"
                                type="url"
                              />
                            </div>
                          </>
                        )}

                        {contentType === 'embed_file' && (
                          <div>
                            <label className="text-sm font-medium mb-2 block">Upload File</label>
                            <div
                              onDragOver={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                              onDrop={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const file = e.dataTransfer.files[0];
                                if (file) handleFileUpload(file);
                              }}
                              className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-indigo-400 transition-colors cursor-pointer"
                              onClick={() => document.getElementById('file-upload').click()}
                            >
                              <input
                                id="file-upload"
                                type="file"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files[0];
                                  if (file) handleFileUpload(file);
                                }}
                              />
                              {uploadingFile ? (
                                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto mb-2" />
                              ) : (
                                <FileUp className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                              )}
                              <p className="text-sm text-slate-600">
                                {uploadingFile ? 'Uploading...' : 'Drag and drop a file or click to browse'}
                              </p>
                              {fileUrl && (
                                <p className="text-xs text-green-600 mt-2">✓ File uploaded</p>
                              )}
                            </div>
                          </div>
                        )}

                        {contentType === 'embed_youtube' && (
                          <div>
                            <label className="text-sm font-medium mb-2 block">YouTube URL or Video ID</label>
                            <Input
                              value={youtubeUrl}
                              onChange={(e) => setYoutubeUrl(e.target.value)}
                              placeholder="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
                            />
                            <p className="text-xs text-slate-500 mt-1">
                              Paste any YouTube URL or just the video ID
                            </p>
                          </div>
                        )}

                        {contentType === 'upload_file' && (
                          <div>
                            <label className="text-sm font-medium mb-2 block">Upload File</label>
                            <div
                              onDragOver={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                              onDrop={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const file = e.dataTransfer.files[0];
                                if (file) handleFileUpload(file);
                              }}
                              className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-indigo-400 transition-colors cursor-pointer"
                              onClick={() => document.getElementById('download-file-upload').click()}
                              >
                              <input
                                id="download-file-upload"
                                type="file"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files[0];
                                  if (file) handleFileUpload(file);
                                }}
                              />
                              {uploadingFile ? (
                                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto mb-2" />
                              ) : (
                                <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                              )}
                              <p className="text-sm text-slate-600">
                                {uploadingFile ? 'Uploading...' : 'Drag and drop a file or click to browse'}
                              </p>
                              {fileUrl && fileName && (
                                <p className="text-xs text-green-600 mt-2">✓ {fileName}</p>
                              )}
                            </div>
                          </div>
                        )}

                        <Button 
                          onClick={handleAddContent}
                          className="w-full"
                          disabled={
                            (contentType === 'text' && !textContent?.trim()) ||
                            (contentType === 'quiz' && !selectedQuizId) ||
                            (contentType === 'website_link' && (!websiteLink?.trim() || !websiteLinkTitle?.trim())) ||
                            (contentType === 'embed_file' && !fileUrl?.trim()) ||
                            (contentType === 'embed_youtube' && !youtubeUrl?.trim()) ||
                            (contentType === 'upload_file' && !fileUrl?.trim())
                          }
                        >
                          {editingBlock ? 'Update Content' : 'Add Content'}
                        </Button>
                      </>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>

          <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Schedule Visibility</DialogTitle>
              </DialogHeader>
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const showDate = formData.get('showDate');
                const hideDate = formData.get('hideDate');
                handleSchedule(schedulingBlock?.id, showDate, hideDate);
              }} className="space-y-4">
                <div>
                  <Label>Show After (optional)</Label>
                  <Input
                    name="showDate"
                    type="datetime-local"
                    defaultValue={schedulingBlock?.scheduledShowDate || ''}
                  />
                </div>
                <div>
                  <Label>Hide After (optional)</Label>
                  <Input
                    name="hideDate"
                    type="datetime-local"
                    defaultValue={schedulingBlock?.scheduledHideDate || ''}
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1">Save Schedule</Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleSchedule(schedulingBlock?.id, null, null)}
                  >
                    Clear
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <div className="space-y-4">
            {contentBlocks.map((block, idx) => {
              // Skip hidden blocks for non-admins
              if (!isAdmin && !isBlockVisible(block)) return null;
              const renderBlock = () => {
                if (block.type === 'text') {
                  return (
                    <div className="flex items-start gap-3 flex-1">
                      <FileText className="w-5 h-5 text-slate-500 mt-0.5" />
                      <div className="text-slate-700 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: block.text }} />
                    </div>
                  );
                }

                if (block.type === 'quiz') {
                  const quiz = quizzes.find(q => q.id === block.quiz_id);
                  if (!quiz) return null;
                  
                  const attempts = allQuizAttempts.filter(a => a.quiz_id === quiz.id);
                  const attemptsAllowed = quiz.attempts_allowed || 999;
                  const attemptsUsed = attempts.length;
                  const attemptsLeft = attemptsAllowed - attemptsUsed;
                  const showAttempts = hasAccess && user?.email && !isAdmin && attemptsAllowed < 999;
                  const sortedAttempts = attempts.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
                  const latestAttempt = sortedAttempts.length > 0 ? sortedAttempts[0] : null;
                  const hasCompleted = latestAttempt !== null;
                  
                  // Helper function to get gradient color based on percentage
                  const getGradientColor = (percentage) => {
                    if (percentage >= 75) {
                      // Green to yellow-green (75-100%)
                      const ratio = (percentage - 75) / 25;
                      const r = Math.round(34 + (16 - 34) * (1 - ratio));
                      const g = Math.round(197 + (185 - 197) * (1 - ratio));
                      const b = Math.round(94 + (47 - 94) * (1 - ratio));
                      return `rgb(${r}, ${g}, ${b})`;
                    } else if (percentage >= 50) {
                      // Yellow to yellow-green (50-75%)
                      const ratio = (percentage - 50) / 25;
                      const r = Math.round(234 + (34 - 234) * ratio);
                      const g = Math.round(179 + (197 - 179) * ratio);
                      const b = Math.round(8 + (94 - 8) * ratio);
                      return `rgb(${r}, ${g}, ${b})`;
                    } else if (percentage >= 25) {
                      // Amber to yellow (25-50%)
                      const ratio = (percentage - 25) / 25;
                      const r = Math.round(245 + (234 - 245) * ratio);
                      const g = Math.round(158 + (179 - 158) * ratio);
                      const b = Math.round(11 + (8 - 11) * ratio);
                      return `rgb(${r}, ${g}, ${b})`;
                    } else {
                      // Red to amber (0-25%)
                      const ratio = percentage / 25;
                      const r = Math.round(239 + (245 - 239) * ratio);
                      const g = Math.round(68 + (158 - 68) * ratio);
                      const b = Math.round(68 + (11 - 68) * ratio);
                      return `rgb(${r}, ${g}, ${b})`;
                    }
                  };

                  const scoreColor = hasCompleted ? getGradientColor(latestAttempt.percentage) : '#6366f1';

                  return (
                    <div className="flex items-center gap-4 flex-1">
                      <div className="relative w-14 h-14 flex-shrink-0">
                        <svg className="w-14 h-14 transform -rotate-90">
                          <circle
                            cx="28"
                            cy="28"
                            r="24"
                            stroke="#e5e7eb"
                            strokeWidth="4"
                            fill="none"
                          />
                          {hasCompleted && hasAccess ? (
                            <circle
                              cx="28"
                              cy="28"
                              r="24"
                              stroke={scoreColor}
                              strokeWidth="4"
                              fill="none"
                              strokeDasharray={`${(latestAttempt.percentage / 100) * 150.8} 150.8`}
                              strokeLinecap="round"
                            />
                          ) : null}
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          {hasCompleted && hasAccess ? (
                            <span className="text-sm font-bold" style={{ color: scoreColor }}>
                              {latestAttempt.percentage}%
                            </span>
                          ) : (
                            <span className="text-lg font-bold text-indigo-600">
                              {idx + 1}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-800">{quiz.title}</h3>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-sm text-slate-500">
                            {quiz.questions?.length || 0} questions
                            {quiz.timer_enabled && quiz.timer_duration && (
                              <span className="ml-2">• {quiz.timer_duration} min</span>
                            )}
                          </span>
                          {showAttempts && (
                            <span className={cn(
                              "text-xs font-medium px-2 py-0.5 rounded-full",
                              attemptsLeft > 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                            )}>
                              {attemptsLeft} attempt{attemptsLeft !== 1 ? 's' : ''} left
                            </span>
                          )}
                          {quiz.allow_tips && (
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 flex items-center gap-1">
                              <Sparkles className="w-3 h-3" />
                              AI Tips
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isAdmin && (
                          <Link to={createPageUrl(`CreateQuiz?id=${quiz.id}&courseId=${courseId}`)}>
                            <Button size="sm" variant="outline" className="gap-2">
                              <Pencil className="w-4 h-4" />
                              Edit
                            </Button>
                          </Link>
                        )}
                        {hasAccess && hasCompleted && (
                          <Link to={createPageUrl(`ReviewAnswers?id=${quiz.id}&courseId=${courseId}&attemptId=${latestAttempt.id}`)}>
                            <Button size="sm" variant="outline" className="gap-2">
                              <PlayCircle className="w-4 h-4" />
                              Review
                            </Button>
                          </Link>
                        )}
                        {hasAccess ? (
                          <Link to={createPageUrl(`TakeQuiz?id=${quiz.id}&courseId=${courseId}`)}>
                            <Button size="sm" className="gap-2">
                              <PlayCircle className="w-4 h-4" />
                              Start
                            </Button>
                          </Link>
                        ) : (
                          <Lock className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                    </div>
                  );
                }

                if (block.type === 'website_link') {
                  if (!hasAccess) {
                    return (
                      <div className="flex items-center gap-3 flex-1 opacity-60">
                        <LinkIcon className="w-5 h-5 text-slate-400" />
                        <span className="text-slate-500">{block.title || 'Website Link'} (Locked)</span>
                        <Lock className="w-4 h-4 text-slate-400 ml-auto" />
                      </div>
                    );
                  }
                  return (
                    <div className="flex items-center gap-3 flex-1">
                      <LinkIcon className="w-5 h-5 text-indigo-500" />
                      <a 
                        href={block.url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-indigo-600 hover:text-indigo-700 hover:underline font-medium"
                      >
                        {block.title || block.url}
                      </a>
                    </div>
                  );
                }

                if (block.type === 'embed_file') {
                  if (!hasAccess) {
                    return (
                      <div className="flex items-center gap-3 flex-1 opacity-60">
                        <FileUp className="w-5 h-5 text-slate-400" />
                        <span className="text-slate-500">Embedded File (Locked)</span>
                        <Lock className="w-4 h-4 text-slate-400 ml-auto" />
                      </div>
                    );
                  }

                  // Detect file type from URL
                  const fileUrl = block.file_url || '';
                  const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(fileUrl);
                  const isPdf = /\.pdf$/i.test(fileUrl);

                  return (
                    <div className="flex flex-col gap-3 flex-1">
                      <div className="flex items-center gap-3">
                        <FileUp className="w-5 h-5 text-indigo-500" />
                        <span className="text-sm font-medium text-slate-700">
                          {isImage ? 'Image' : isPdf ? 'PDF Document' : 'Embedded Document'}
                        </span>
                      </div>
                      {isImage ? (
                        <img 
                          src={fileUrl} 
                          alt="Embedded content"
                          className="w-full rounded-lg border border-slate-300"
                        />
                      ) : isPdf ? (
                        <iframe 
                          src={`https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}&embedded=true`}
                          className="w-full h-96 rounded-lg border border-slate-300 bg-white"
                          title="PDF document"
                        />
                      ) : (
                        <iframe 
                          src={fileUrl} 
                          className="w-full h-96 rounded-lg border border-slate-300 bg-white"
                          title="Embedded document"
                        />
                      )}
                    </div>
                  );
                }

                if (block.type === 'upload_file') {
                  if (!hasAccess) {
                    return (
                      <div className="flex items-center gap-3 flex-1 opacity-60">
                        <Upload className="w-5 h-5 text-slate-400" />
                        <span className="text-slate-500">Download File (Locked)</span>
                        <Lock className="w-4 h-4 text-slate-400 ml-auto" />
                      </div>
                    );
                  }
                  return (
                    <div className="flex items-center gap-3 flex-1">
                      <Upload className="w-5 h-5 text-indigo-500" />
                      <a 
                        href={block.file_url} 
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:text-indigo-700 hover:underline font-medium"
                      >
                        {block.file_name || 'Download File'}
                      </a>
                    </div>
                  );
                }

                if (block.type === 'embed_youtube') {
                  let videoId = null;
                  
                  if (block.youtube_url) {
                    const url = block.youtube_url.toString().trim();
                    
                    // Try to extract from URL patterns
                    const urlPatterns = [
                      /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]+)/,
                      /(?:youtu\.be\/)([a-zA-Z0-9_-]+)/,
                      /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/,
                      /(?:youtube\.com\/v\/)([a-zA-Z0-9_-]+)/,
                      /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]+)/,
                      /[?&]v=([a-zA-Z0-9_-]+)/
                    ];
                    
                    for (const pattern of urlPatterns) {
                      const match = url.match(pattern);
                      if (match && match[1]) {
                        videoId = match[1].split('&')[0].split('?')[0];
                        break;
                      }
                    }
                    
                    // If no match, assume it's just the video ID
                    if (!videoId && /^[a-zA-Z0-9_-]{10,12}$/.test(url)) {
                      videoId = url;
                    }
                  }
                  
                  if (!hasAccess) {
                    return (
                      <div className="flex items-center gap-3 flex-1 opacity-60">
                        <Youtube className="w-5 h-5 text-slate-400" />
                        <span className="text-slate-500">YouTube Video (Locked)</span>
                        <Lock className="w-4 h-4 text-slate-400 ml-auto" />
                      </div>
                    );
                  }
                  return (
                    <div className="flex flex-col gap-3 flex-1">
                      <div className="flex items-center gap-3">
                        <Youtube className="w-5 h-5 text-red-500" />
                        <span className="text-sm font-medium text-slate-700">YouTube Video</span>
                      </div>
                      {videoId ? (
                        <iframe 
                          src={`https://www.youtube.com/embed/${videoId}`}
                          className="w-full aspect-video rounded-lg border border-slate-300"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          title="YouTube video"
                        />
                      ) : (
                        <p className="text-sm text-slate-500">Invalid YouTube URL</p>
                      )}
                    </div>
                  );
                }
              };

              return (
                <div
                  key={block.id}
                  className={cn(
                    "p-4 rounded-xl border border-slate-200 transition-all",
                    block.type === 'text' ? "bg-slate-50" : "bg-white hover:border-indigo-300",
                    isAdmin && block.visible === false && "opacity-50 border-dashed"
                  )}
                  draggable={isAdmin}
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = "move";
                    e.dataTransfer.setData("text/plain", idx.toString());
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const startIndex = parseInt(e.dataTransfer.getData("text/plain"));
                    handleReorderContent(startIndex, idx);
                  }}
                >
                  <div className="flex items-start gap-3">
                    {isAdmin && (
                      <div className="cursor-grab active:cursor-grabbing pt-1">
                        <GripVertical className="w-5 h-5 text-slate-400" />
                      </div>
                    )}
                    <div className="flex-1">
                      {renderBlock()}
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="flex items-center justify-end gap-1 mt-3 pt-3 border-t border-slate-200">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleVisibility(block.id);
                        }}
                        className={cn(
                          "text-slate-400",
                          block.visible === false ? "hover:text-emerald-600" : "hover:text-slate-600"
                        )}
                        title={block.visible === false ? "Hidden from students" : "Visible to students"}
                      >
                        {block.visible === false ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSchedulingBlock(block);
                          setScheduleDialogOpen(true);
                        }}
                        className={cn(
                          "text-slate-400 hover:text-amber-600",
                          (block.scheduledShowDate || block.scheduledHideDate) && "text-amber-600"
                        )}
                        title="Schedule visibility"
                      >
                        <Clock className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditBlock(block);
                        }}
                        className="text-slate-400 hover:text-indigo-600"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteBlock(block.id);
                        }}
                        className="text-slate-400 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}

            {contentBlocks.length === 0 && (
              <p className="text-center text-slate-500 py-8">
                No content in this course yet
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}