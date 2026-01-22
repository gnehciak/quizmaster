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
  Clock,
  Calendar,
  MoreVertical,
  RefreshCw,
  X,
  FolderOpen
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sparkles } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import CourseHero from '@/components/course/CourseHero';
import CourseAdminTools from '@/components/course/CourseAdminTools';
import CourseStudentsDialog from '@/components/course/CourseStudentsDialog';
import CourseContentList from '@/components/course/CourseContentList';
import AccessCodeManager from '@/components/course/AccessCodeManager';

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
  const [lockDialogOpen, setLockDialogOpen] = useState(false);
  const [lockingBlock, setLockingBlock] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [tempImageUrl, setTempImageUrl] = useState(null);
  const [features, setFeatures] = useState([]);
  const [newFeature, setNewFeature] = useState('');
  const [sectionTitle, setSectionTitle] = useState('');
  const [sectionIcon, setSectionIcon] = useState('#');
  const [sectionColor, setSectionColor] = useState('indigo');
  const [customIconInput, setCustomIconInput] = useState('');
  const [customColorInput, setCustomColorInput] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [studentsDialogOpen, setStudentsDialogOpen] = useState(false);
  const [unlockDialogOpen, setUnlockDialogOpen] = useState(false);
  const [topicTitle, setTopicTitle] = useState('');
  const [topicDueDate, setTopicDueDate] = useState('');
  const [addToTopicDialogOpen, setAddToTopicDialogOpen] = useState(false);
  const [blockToMove, setBlockToMove] = useState(null);
  const [selectedTopic, setSelectedTopic] = useState('');
  const [accessCodeManagerOpen, setAccessCodeManagerOpen] = useState(false);

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

  // Calculate Progress
  const calculateProgress = () => {
    if (!contentBlocks.length) return 0;
    
    // Count total interactive items that can be completed (quizzes)
    const quizBlocks = contentBlocks.filter(b => b.type === 'quiz');
    if (!quizBlocks.length) return 0;

    const completedQuizzes = quizBlocks.filter(block => {
      const quizAttempts = allQuizAttempts.filter(a => a.quiz_id === block.quiz_id);
      return quizAttempts.length > 0;
    });

    return (completedQuizzes.length / quizBlocks.length) * 100;
  };

  const progress = calculateProgress();

  // Find first incomplete block for "Continue" button
  const getFirstIncompleteBlock = () => {
    const firstIncomplete = contentBlocks.find(block => {
      if (block.type === 'quiz') {
        const attempts = allQuizAttempts.filter(a => a.quiz_id === block.quiz_id);
        return attempts.length === 0;
      }
      return false; // Assume other content is "completed" once viewed, or logic TBD
    });
    return firstIncomplete?.id;
  };

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

  // Auto-generate initial access code if course is locked but has no codes
  React.useEffect(() => {
    if (isAdmin && course?.is_locked && (!course?.access_codes || course.access_codes.length === 0)) {
      const defaultCode = {
        code: Math.random().toString(36).substring(2, 10).toUpperCase(),
        class_name: 'Default Class'
      };
      updateCourseMutation.mutate({ access_codes: [defaultCode] });
    }
  }, [course?.is_locked, course?.access_codes, isAdmin]);

  const updateCourseMutation = useMutation({
    mutationFn: (data) => base44.entities.Course.update(courseId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course', courseId] });
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

    // Check new access_codes array
    const accessCodes = course.access_codes || [];
    const matchingCode = accessCodes.find(ac => ac.code.toUpperCase() === unlockCode.trim().toUpperCase());

    // Fallback to legacy unlock_code for backwards compatibility
    if (!matchingCode && unlockCode !== course.unlock_code) {
      setError('Invalid code');
      return;
    }

    await unlockMutation.mutateAsync({
      user_email: user.email,
      course_id: courseId,
      unlock_method: 'code',
      class_name: matchingCode?.class_name || 'Legacy Access'
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
          else if (contentType === 'section') {
            updated.title = sectionTitle;
            updated.icon = sectionIcon;
            updated.color = sectionColor;
          }
          else if (contentType === 'topic') {
            updated.title = topicTitle;
            updated.due_date = topicDueDate || undefined;
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
      else if (contentType === 'section') {
        newBlock.title = sectionTitle;
        newBlock.icon = sectionIcon;
        newBlock.color = sectionColor;
      }
      else if (contentType === 'topic') {
        newBlock.title = topicTitle;
        newBlock.due_date = topicDueDate || undefined;
        newBlock.children = [];
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
    setSectionTitle('');
    setSectionIcon('#');
    setSectionColor('indigo');
    setCustomIconInput('');
    setCustomColorInput('');
    setTopicTitle('');
    setTopicDueDate('');
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
    else if (block.type === 'section') {
      setSectionTitle(block.title || '');
      setSectionIcon(block.icon || '#');
      setSectionColor(block.color || 'indigo');
      setCustomIconInput('');
      setCustomColorInput('');
    }
    else if (block.type === 'topic') {
      setTopicTitle(block.title || '');
      setTopicDueDate(block.due_date || '');
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
    setTempImageUrl(course?.image_url);
    setFeatures(course?.features || []);
    setEditCourseOpen(true);
  };

  const handleImageUpload = async (file) => {
    setUploadingImage(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      setTempImageUrl(result.file_url);
    } catch (e) {
      console.error('Upload failed:', e);
    }
    setUploadingImage(false);
  };

  const handleAddFeature = () => {
    if (newFeature.trim()) {
      setFeatures([...features, newFeature.trim()]);
      setNewFeature('');
    }
  };

  const handleRemoveFeature = (index) => {
    setFeatures(features.filter((_, i) => i !== index));
  };

  const handleUpdateCourse = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      title: formData.get('title'),
      description: formData.get('description'),
      category: formData.get('category'),
      visibility: formData.get('visibility') || 'public',
      is_locked: formData.get('is_locked') === 'true',
      unlock_code: formData.get('unlock_code') || undefined,
      price: formData.get('price') ? parseFloat(formData.get('price')) : undefined,
      enrollment_duration: formData.get('enrollment_duration') ? parseInt(formData.get('enrollment_duration')) : 365,
      image_url: tempImageUrl || undefined,
      features: features.length > 0 ? features : undefined
    };
    await updateCourseMutation.mutateAsync(data);
    setEditCourseOpen(false);
    setTempImageUrl(null);
    setFeatures([]);
    setNewFeature('');
  };

  const handleReorderContent = async (startIndex, endIndex) => {
    const result = Array.from(contentBlocks);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    await updateCourseMutation.mutateAsync({ content_blocks: result });
  };

  const handleReorderTopicChildren = async (topicId, startIndex, endIndex) => {
    const updatedBlocks = contentBlocks.map(block => {
      if (block.id === topicId && block.type === 'topic') {
        const children = Array.from(block.children || []);
        const [removed] = children.splice(startIndex, 1);
        children.splice(endIndex, 0, removed);
        return { ...block, children };
      }
      return block;
    });
    await updateCourseMutation.mutateAsync({ content_blocks: updatedBlocks });
  };

  const handleDeleteBlock = async (blockId) => {
    if (!confirm('Delete this content block?')) return;
    const updatedBlocks = contentBlocks.filter(b => b.id !== blockId);
    await updateCourseMutation.mutateAsync({ content_blocks: updatedBlocks });
  };

  const handleToggleVisibility = async (blockId) => {
    try {
      const updatedBlocks = contentBlocks.map(b => {
        if (b.id === blockId) {
          const newVisible = b.visible === false ? true : false;
          return { ...b, visible: newVisible };
        }
        return b;
      });

      await updateCourseMutation.mutateAsync({ content_blocks: updatedBlocks });

      const updatedBlock = updatedBlocks.find(b => b.id === blockId);
      toast.success(updatedBlock.visible === false ? 'Content hidden from students' : 'Content visible to students');
    } catch (error) {
      toast.error('Failed to update visibility');
    }
  };

  const handleToggleLock = async (blockId) => {
    try {
      const updatedBlocks = contentBlocks.map(b => {
        if (b.id === blockId) {
          const newLocked = b.locked === true ? false : true;
          return { ...b, locked: newLocked };
        }
        return b;
      });

      await updateCourseMutation.mutateAsync({ content_blocks: updatedBlocks });

      const updatedBlock = updatedBlocks.find(b => b.id === blockId);
      toast.success(updatedBlock.locked === true ? 'Content locked for students' : 'Content unlocked for students');
    } catch (error) {
      toast.error('Failed to update lock');
    }
  };

  const handleLockSchedule = async (blockId, unlockDate) => {
    const updatedBlocks = contentBlocks.map(b => {
      if (b.id === blockId) {
        return { ...b, unlockDate: unlockDate || null, locked: unlockDate ? true : b.locked };
      }
      return b;
    });
    await updateCourseMutation.mutateAsync({ content_blocks: updatedBlocks });
    setLockDialogOpen(false);
    setLockingBlock(null);
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

  const handleUpdateAccessCodes = async (codes) => {
    await updateCourseMutation.mutateAsync({ access_codes: codes });
  };

  const handleAddToTopic = (block) => {
    setBlockToMove(block);
    setSelectedTopic('');
    setAddToTopicDialogOpen(true);
  };

  const handleMoveToTopic = async () => {
    if (!selectedTopic || !blockToMove) return;
    
    const updatedBlocks = contentBlocks.map(b => {
      if (b.id === selectedTopic && b.type === 'topic') {
        return {
          ...b,
          children: [...(b.children || []), blockToMove]
        };
      }
      return b;
    }).filter(b => b.id !== blockToMove.id);
    
    await updateCourseMutation.mutateAsync({ content_blocks: updatedBlocks });
    setAddToTopicDialogOpen(false);
    setBlockToMove(null);
    setSelectedTopic('');
    toast.success('Block moved to topic');
  };

  const isBlockVisible = (block) => {
    // For admins, always show everything
    if (isAdmin) return true;

    // Check manual visibility toggle (treat undefined as visible for backward compatibility)
    if (block.visible === false) return false;

    // Check scheduled visibility
    const now = new Date();
    if (block.scheduledShowDate && new Date(block.scheduledShowDate) > now) return false;
    if (block.scheduledHideDate && new Date(block.scheduledHideDate) < now) return false;

    return true;
  };

  const isBlockLocked = (block) => {
    // For admins, nothing is locked
    if (isAdmin) return false;

    // Check manual lock
    if (block.locked === true) {
      // Check if unlock date has passed
      if (block.unlockDate) {
        const now = new Date();
        return new Date(block.unlockDate) > now;
      }
      return true;
    }

    return false;
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
      <CourseStudentsDialog 
        open={studentsDialogOpen} 
        onOpenChange={setStudentsDialogOpen} 
        courseId={courseId} 
      />

      <AccessCodeManager
        open={accessCodeManagerOpen}
        onOpenChange={setAccessCodeManagerOpen}
        accessCodes={course?.access_codes || []}
        onUpdate={handleUpdateAccessCodes}
      />

      {/* Unlock Dialog */}
      <Dialog open={unlockDialogOpen} onOpenChange={setUnlockDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Unlock Course</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Enter Access Code</Label>
              <Input
                placeholder="Paste code here..."
                value={unlockCode}
                onChange={(e) => setUnlockCode(e.target.value)}
              />
              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>
            <Button 
              onClick={() => {
                handleCodeUnlock().then(() => {
                  if (!error) setUnlockDialogOpen(false);
                });
              }}
              className="w-full bg-indigo-600 hover:bg-indigo-700"
              disabled={!unlockCode.trim() || processing}
            >
              {processing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Unlock className="w-4 h-4 mr-2" />}
              Unlock Access
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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

      {/* Top Navigation */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <button onClick={() => window.history.back()} className="flex items-center text-slate-600 hover:text-slate-900 transition-colors">
            <ChevronLeft className="w-5 h-5 mr-1" />
            <span className="font-medium">Back</span>
          </button>
          <div className="font-semibold text-slate-800 truncate max-w-md hidden sm:block">
            {course.title}
          </div>
          <div className="w-20"></div> {/* Spacer for balance */}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 pb-2">
        {/* Course Hero */}
        <CourseHero 
          course={course}
          access={access}
          progress={progress}
          hasAccess={hasAccess}
          isLocked={course.is_locked}
          onUnlock={() => setUnlockDialogOpen(true)}
          onPurchase={handlePurchase}
          firstIncompleteBlockId={getFirstIncompleteBlock()}
          editMode={editMode}
          onUpdate={(data) => updateCourseMutation.mutate(data)}
        />

        {/* Admin Toolbar */}
        {isAdmin && (
          <CourseAdminTools 
            onEdit={handleEditCourse}
            onAddContent={() => setAddContentOpen(true)}
            onManageStudents={() => setStudentsDialogOpen(true)}
            onAnalytics={() => window.location.href = createPageUrl(`CourseAnalytics?id=${courseId}`)}
            editMode={editMode}
            setEditMode={setEditMode}
          />
        )}

      </div>

      {/* Edit Course Dialog */}
      <Dialog open={editCourseOpen} onOpenChange={(open) => {
        setEditCourseOpen(open);
        if (!open) {
          setTempImageUrl(null);
          setFeatures([]);
          setNewFeature('');
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Course</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateCourse} className="space-y-4">
            <div>
              <Label>Cover Image</Label>
              <div className="mt-2">
                {tempImageUrl ? (
                  <div className="relative w-full h-48 rounded-lg overflow-hidden border border-slate-200">
                    <img src={tempImageUrl} alt="Cover" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setTempImageUrl(null)}
                      className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const file = e.dataTransfer.files[0];
                      if (file) handleImageUpload(file);
                    }}
                    className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-indigo-400 transition-colors cursor-pointer"
                    onClick={() => document.getElementById('cover-upload').click()}
                  >
                    <input
                      id="cover-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) handleImageUpload(file);
                      }}
                    />
                    {uploadingImage ? (
                      <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto mb-2" />
                    ) : (
                      <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    )}
                    <p className="text-sm text-slate-600">
                      {uploadingImage ? 'Uploading...' : 'Drag and drop an image or click to browse'}
                    </p>
                  </div>
                )}
              </div>
            </div>

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
              <Label>Visibility</Label>
              <Select name="visibility" defaultValue={course?.visibility || 'public'}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public - Shown on home page</SelectItem>
                  <SelectItem value="unlisted">Unlisted - Link only, show in My Courses</SelectItem>
                  <SelectItem value="private">Private - Creator & admin only</SelectItem>
                  <SelectItem value="admin">Admin - Admin only</SelectItem>
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

            <div>
              <Label>Enrollment Duration (days)</Label>
              <Input name="enrollment_duration" type="number" defaultValue={course?.enrollment_duration || 365} />
              <p className="text-xs text-slate-500 mt-1">How many days students have access after enrollment</p>
            </div>

            <div>
              <Label>Features</Label>
              <div className="space-y-2">
                {features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                    <span className="flex-1 text-sm">{feature}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveFeature(index)}
                      className="h-8 w-8 p-0 text-red-600"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <Input
                    value={newFeature}
                    onChange={(e) => setNewFeature(e.target.value)}
                    placeholder="Add a feature..."
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddFeature();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    onClick={handleAddFeature}
                    variant="outline"
                    className="gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add
                  </Button>
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full">
              Update Course
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Admin: Access Codes Display */}
        {isAdmin && course?.is_locked && course?.access_codes && course.access_codes.length > 0 && (
          <div className="bg-indigo-50 rounded-xl border border-indigo-100 p-5 mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="bg-white p-2 rounded-lg border border-indigo-100">
                  <Key className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-xs text-indigo-600 font-semibold uppercase tracking-wider">Access Codes</p>
                  <p className="text-sm text-slate-600">{course.access_codes.length} {course.access_codes.length === 1 ? 'class' : 'classes'}</p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setAccessCodeManagerOpen(true)}
                className="text-indigo-600 hover:bg-indigo-100"
              >
                Manage Classes
              </Button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {course.access_codes.slice(0, 4).map((item, index) => (
                <div key={index} className="bg-white rounded-lg p-3 border border-indigo-100">
                  <div className="text-xs text-slate-500 mb-1">{item.class_name}</div>
                  <div className="flex items-center justify-between">
                    <code className="text-sm font-mono font-bold text-indigo-600 tracking-wider">
                      {item.code}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        navigator.clipboard.writeText(item.code);
                        toast.success('Code copied');
                      }}
                      className="h-6 w-6 text-indigo-400 hover:text-indigo-600"
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            {course.access_codes.length > 4 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAccessCodeManagerOpen(true)}
                className="w-full mt-2 text-slate-600"
              >
                View {course.access_codes.length - 4} more...
              </Button>
            )}
          </div>
        )}

        {/* Course Content */}
        <div className="space-y-4" id="course-content">
          <div className="flex items-center justify-between mb-2 px-2">
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              Course Content
            </h2>
            {isAdmin && editMode && (
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
                  setSectionTitle('');
                  setSectionIcon('#');
                  setSectionColor('indigo');
                  setCustomIconInput('');
                  setCustomColorInput('');
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
                          <Button variant="outline" onClick={() => setContentType('topic')} className="justify-start gap-2 h-auto py-3">
                            <FolderOpen className="w-5 h-5 text-indigo-600" />
                            <div className="text-left">
                              <div className="font-medium">Topic Container</div>
                              <div className="text-xs text-slate-500">Group content with completion tracking</div>
                            </div>
                          </Button>
                          <Button variant="outline" onClick={() => setContentType('section')} className="justify-start gap-2 h-auto py-3">
                            <div className="w-5 h-5 flex items-center justify-center text-indigo-600 font-bold">#</div>
                            <div className="text-left">
                              <div className="font-medium">Section</div>
                              <div className="text-xs text-slate-500">Add a section divider/header</div>
                            </div>
                          </Button>
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
                        {!editingBlock && contentType && (
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
                                      ID: {quiz.id} • {quiz.questions?.length || 0} questions
                                    </div>
                                  </button>
                                ))}
                            </div>

                            <div className="flex gap-2">
                              <Button 
                                type="button" 
                                variant="outline" 
                                className="flex-1 gap-2"
                                onClick={async () => {
                                  const newQuiz = await base44.entities.Quiz.create({
                                    title: 'New Quiz',
                                    questions: [],
                                    status: 'draft'
                                  });
                                  
                                  const newBlock = {
                                    id: `block_${Date.now()}`,
                                    type: 'quiz',
                                    quiz_id: newQuiz.id
                                  };
                                  
                                  const updatedBlocks = [...contentBlocks, newBlock];
                                  await updateCourseMutation.mutateAsync({ content_blocks: updatedBlocks });
                                  
                                  queryClient.invalidateQueries({ queryKey: ['quizzes'] });
                                  setAddContentOpen(false);
                                  setContentType('');
                                  toast.success('Quiz created and added to course');
                                }}
                              >
                                <Plus className="w-4 h-4" />
                                Create New Quiz
                              </Button>
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

                        {contentType === 'topic' && (
                          <div className="space-y-4">
                            <div>
                              <label className="text-sm font-medium mb-2 block">Topic Title</label>
                              <Input
                                value={topicTitle}
                                onChange={(e) => setTopicTitle(e.target.value)}
                                placeholder="e.g. Module 1: Introduction to React"
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium mb-2 block">Due Date (optional)</label>
                              <Input
                                type="datetime-local"
                                value={topicDueDate}
                                onChange={(e) => setTopicDueDate(e.target.value)}
                              />
                              <p className="text-xs text-slate-500 mt-1">
                                Overdue topics will be highlighted to students
                              </p>
                            </div>
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-slate-700">
                              <strong>Note:</strong> After creating the topic, you can drag and drop other content blocks into it to organize your course materials with automatic completion tracking.
                            </div>
                          </div>
                        )}

                        {contentType === 'section' && (
                          <div className="space-y-4">
                            <div>
                              <label className="text-sm font-medium mb-2 block">Section Title</label>
                              <Input
                                value={sectionTitle}
                                onChange={(e) => setSectionTitle(e.target.value)}
                                placeholder="e.g. Week 1: Introduction"
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium mb-2 block">Icon</label>
                              <div className="grid grid-cols-6 gap-2 mb-2">
                                {['#', '📚', '🎯', '⭐', '🔥', '💡', '🎓', '📝', '✨', '🚀', '🎨', '🏆'].map((icon) => (
                                  <button
                                    key={icon}
                                    type="button"
                                    onClick={() => {
                                      setSectionIcon(icon);
                                      setCustomIconInput('');
                                    }}
                                    className={cn(
                                      "p-3 rounded-lg border-2 text-xl transition-all hover:scale-110",
                                      sectionIcon === icon && !customIconInput ? "border-indigo-500 bg-indigo-50" : "border-slate-200 hover:border-slate-300"
                                    )}
                                  >
                                    {icon}
                                  </button>
                                ))}
                              </div>
                              <Input
                                value={customIconInput}
                                onChange={(e) => {
                                  setCustomIconInput(e.target.value);
                                  if (e.target.value) setSectionIcon(e.target.value);
                                }}
                                placeholder="Or enter custom icon (emoji or text)..."
                                className="text-center"
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium mb-2 block">Color Theme</label>
                              <div className="grid grid-cols-4 gap-2 mb-2">
                                {[
                                  { name: 'indigo', from: 'from-indigo-50', to: 'to-purple-50', border: 'border-indigo-500', bg: 'bg-indigo-600' },
                                  { name: 'blue', from: 'from-blue-50', to: 'to-cyan-50', border: 'border-blue-500', bg: 'bg-blue-600' },
                                  { name: 'green', from: 'from-green-50', to: 'to-emerald-50', border: 'border-green-500', bg: 'bg-green-600' },
                                  { name: 'orange', from: 'from-orange-50', to: 'to-amber-50', border: 'border-orange-500', bg: 'bg-orange-600' },
                                  { name: 'red', from: 'from-red-50', to: 'to-pink-50', border: 'border-red-500', bg: 'bg-red-600' },
                                  { name: 'purple', from: 'from-purple-50', to: 'to-fuchsia-50', border: 'border-purple-500', bg: 'bg-purple-600' },
                                  { name: 'slate', from: 'from-slate-50', to: 'to-gray-50', border: 'border-slate-500', bg: 'bg-slate-600' },
                                  { name: 'pink', from: 'from-pink-50', to: 'to-rose-50', border: 'border-pink-500', bg: 'bg-pink-600' },
                                ].map((color) => (
                                  <button
                                    key={color.name}
                                    type="button"
                                    onClick={() => {
                                      setSectionColor(color.name);
                                      setCustomColorInput('');
                                    }}
                                    className={cn(
                                      "p-4 rounded-lg border-2 transition-all hover:scale-105 bg-gradient-to-r",
                                      color.from, color.to,
                                      sectionColor === color.name && !customColorInput ? "border-slate-800 ring-2 ring-slate-800" : "border-slate-200 hover:border-slate-300"
                                    )}
                                  >
                                    <div className={cn("w-6 h-6 rounded-full mx-auto", color.bg)} />
                                  </button>
                                ))}
                              </div>
                              <div className="flex gap-2">
                                <Input
                                  value={customColorInput}
                                  onChange={(e) => {
                                    setCustomColorInput(e.target.value);
                                    if (e.target.value) setSectionColor(e.target.value);
                                  }}
                                  placeholder="Tailwind color name (e.g. teal, amber)"
                                  className="flex-1"
                                />
                                <input
                                  type="color"
                                  onChange={(e) => {
                                    const hex = e.target.value;
                                    setCustomColorInput(hex);
                                    setSectionColor(hex);
                                  }}
                                  className="w-12 h-10 rounded border border-slate-300 cursor-pointer"
                                />
                              </div>
                            </div>
                            
                            {/* Preview */}
                            <div>
                              <label className="text-sm font-medium mb-2 block">Preview</label>
                              {(() => {
                                const getColorStyles = (colorValue) => {
                                  // Check if it's a hex color
                                  if (colorValue?.startsWith('#')) {
                                    return {
                                      gradient: { background: `linear-gradient(to right, ${colorValue}20, ${colorValue}30)` },
                                      border: { borderColor: colorValue },
                                      icon: { backgroundColor: colorValue }
                                    };
                                  }
                                  
                                  // Preset colors
                                  const colorMap = {
                                    indigo: { from: 'from-indigo-50', to: 'to-purple-50', border: 'border-indigo-500', bg: 'bg-indigo-600' },
                                    blue: { from: 'from-blue-50', to: 'to-cyan-50', border: 'border-blue-500', bg: 'bg-blue-600' },
                                    green: { from: 'from-green-50', to: 'to-emerald-50', border: 'border-green-500', bg: 'bg-green-600' },
                                    orange: { from: 'from-orange-50', to: 'to-amber-50', border: 'border-orange-500', bg: 'bg-orange-600' },
                                    red: { from: 'from-red-50', to: 'to-pink-50', border: 'border-red-500', bg: 'bg-red-600' },
                                    purple: { from: 'from-purple-50', to: 'to-fuchsia-50', border: 'border-purple-500', bg: 'bg-purple-600' },
                                    slate: { from: 'from-slate-50', to: 'to-gray-50', border: 'border-slate-500', bg: 'bg-slate-600' },
                                    pink: { from: 'from-pink-50', to: 'to-rose-50', border: 'border-pink-500', bg: 'bg-pink-600' },
                                    teal: { from: 'from-teal-50', to: 'to-cyan-50', border: 'border-teal-500', bg: 'bg-teal-600' },
                                    amber: { from: 'from-amber-50', to: 'to-yellow-50', border: 'border-amber-500', bg: 'bg-amber-600' },
                                    emerald: { from: 'from-emerald-50', to: 'to-green-50', border: 'border-emerald-500', bg: 'bg-emerald-600' },
                                    cyan: { from: 'from-cyan-50', to: 'to-blue-50', border: 'border-cyan-500', bg: 'bg-cyan-600' },
                                    sky: { from: 'from-sky-50', to: 'to-blue-50', border: 'border-sky-500', bg: 'bg-sky-600' },
                                    violet: { from: 'from-violet-50', to: 'to-purple-50', border: 'border-violet-500', bg: 'bg-violet-600' },
                                    fuchsia: { from: 'from-fuchsia-50', to: 'to-pink-50', border: 'border-fuchsia-500', bg: 'bg-fuchsia-600' },
                                    rose: { from: 'from-rose-50', to: 'to-pink-50', border: 'border-rose-500', bg: 'bg-rose-600' },
                                    lime: { from: 'from-lime-50', to: 'to-green-50', border: 'border-lime-500', bg: 'bg-lime-600' },
                                  };
                                  return colorMap[colorValue] || colorMap.indigo;
                                };
                                
                                const colors = getColorStyles(sectionColor);
                                const isHexColor = sectionColor?.startsWith('#');
                                
                                return (
                                  <div 
                                    className={cn(
                                      "flex items-center gap-3 px-4 py-3 border-l-4 rounded-lg",
                                      !isHexColor && `bg-gradient-to-r ${colors.from} ${colors.to} ${colors.border}`
                                    )}
                                    style={isHexColor ? { ...colors.gradient, borderLeftColor: colors.border.borderColor } : {}}
                                  >
                                    <div 
                                      className={cn(
                                        "w-8 h-8 rounded-lg text-white flex items-center justify-center font-bold text-lg flex-shrink-0",
                                        !isHexColor && colors.bg
                                      )}
                                      style={isHexColor ? colors.icon : {}}
                                    >
                                      {sectionIcon || '#'}
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-800">
                                      {sectionTitle || 'Section Title'}
                                    </h3>
                                  </div>
                                );
                              })()}
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
                            (contentType === 'upload_file' && !fileUrl?.trim()) ||
                            (contentType === 'section' && !sectionTitle?.trim()) ||
                            (contentType === 'topic' && !topicTitle?.trim())
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

          <Dialog open={lockDialogOpen} onOpenChange={setLockDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Schedule Unlock</DialogTitle>
              </DialogHeader>
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const unlockDate = formData.get('unlockDate');
                handleLockSchedule(lockingBlock?.id, unlockDate);
              }} className="space-y-4">
                <div>
                  <Label>Unlock At (optional)</Label>
                  <Input
                    name="unlockDate"
                    type="datetime-local"
                    defaultValue={lockingBlock?.unlockDate || ''}
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Content will automatically unlock at this time
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1">Save Schedule</Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleLockSchedule(lockingBlock?.id, null)}
                  >
                    Clear
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={addToTopicDialogOpen} onOpenChange={setAddToTopicDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add to Topic</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label>Select Topic</Label>
                  <Select value={selectedTopic} onValueChange={setSelectedTopic}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a topic..." />
                    </SelectTrigger>
                    <SelectContent>
                      {contentBlocks.filter(b => b.type === 'topic').map(topic => (
                        <SelectItem key={topic.id} value={topic.id}>
                          {topic.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={handleMoveToTopic} 
                    className="flex-1"
                    disabled={!selectedTopic}
                  >
                    Move to Topic
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setAddToTopicDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <CourseContentList 
            blocks={contentBlocks}
            editMode={editMode}
            onReorder={handleReorderContent}
            onEdit={handleEditBlock}
            onDelete={handleDeleteBlock}
            onToggleVisibility={handleToggleVisibility}
            onToggleLock={handleToggleLock}
            onScheduleVisibility={(block) => {
                setSchedulingBlock(block);
                setScheduleDialogOpen(true);
            }}
            onScheduleLock={(block) => {
                setLockingBlock(block);
                setLockDialogOpen(true);
            }}
            onAddToTopic={handleAddToTopic}
            onReorderTopicChildren={handleReorderTopicChildren}
            isAdmin={isAdmin}
            hasAccess={hasAccess}
            quizzes={quizzes}
            allQuizAttempts={allQuizAttempts}
          />
        </div>
      </div>
    </div>
  );
}