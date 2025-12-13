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
  Youtube
} from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [editCourseOpen, setEditCourseOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me(),
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
    queryKey: ['quizCategories'],
    queryFn: () => base44.entities.QuizCategory.list(),
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

  const hasAccess = !course?.is_locked || !!access || user?.role === 'admin';
  const courseQuizzes = quizzes.filter(q => course?.quiz_ids?.includes(q.id));
  const isAdmin = user?.role === 'admin';
  const contentBlocks = course?.content_blocks || [];

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
    // In a real app, implement Stripe checkout here
    // For now, just unlock the course
    await unlockMutation.mutateAsync({
      user_email: user.email,
      course_id: courseId,
      unlock_method: 'purchase'
    });
    setProcessing(false);
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

      const updatedBlocks = [...contentBlocks, newBlock];
      await updateCourseMutation.mutateAsync({ content_blocks: updatedBlocks });
    }
    
    setAddContentOpen(false);
    setTextContent('');
    setSelectedQuizId('');
    setWebsiteLink('');
    setWebsiteLinkTitle('');
    setFileUrl('');
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
    setAddContentOpen(true);
  };

  const handleFileUpload = async (file) => {
    setUploadingFile(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      setFileUrl(result.file_url);
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      {/* Header */}
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
                            <Textarea
                              value={textContent}
                              onChange={(e) => setTextContent(e.target.value)}
                              placeholder="Enter text content..."
                              className="min-h-[120px]"
                            />
                          </div>
                        )}

                        {contentType === 'quiz' && (
                          <div>
                            <label className="text-sm font-medium mb-2 block">Select Quiz</label>
                            <Select value={selectedQuizId} onValueChange={setSelectedQuizId}>
                              <SelectTrigger>
                                <SelectValue placeholder="Choose a quiz..." />
                              </SelectTrigger>
                              <SelectContent>
                                {quizzes.map(quiz => (
                                  <SelectItem key={quiz.id} value={quiz.id}>
                                    {quiz.title}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
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

                        <Button 
                          onClick={handleAddContent}
                          className="w-full"
                          disabled={
                            (contentType === 'text' && !textContent?.trim()) ||
                            (contentType === 'quiz' && !selectedQuizId) ||
                            (contentType === 'website_link' && (!websiteLink?.trim() || !websiteLinkTitle?.trim())) ||
                            (contentType === 'embed_file' && !fileUrl?.trim()) ||
                            (contentType === 'embed_youtube' && !youtubeUrl?.trim())
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

          <div className="space-y-4">
            {contentBlocks.map((block, idx) => {
              const renderBlock = () => {
                if (block.type === 'text') {
                  return (
                    <div className="flex items-start gap-3 flex-1">
                      <FileText className="w-5 h-5 text-slate-500 mt-0.5" />
                      <p className="text-slate-700 whitespace-pre-wrap">{block.text}</p>
                    </div>
                  );
                }

                if (block.type === 'quiz') {
                  const quiz = quizzes.find(q => q.id === block.quiz_id);
                  if (!quiz) return null;
                  
                  return (
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-600 font-bold flex items-center justify-center">
                        {idx + 1}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-800">{quiz.title}</h3>
                        <p className="text-sm text-slate-500">{quiz.questions?.length || 0} questions</p>
                      </div>
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
                  return (
                    <div className="flex flex-col gap-3 flex-1">
                      <div className="flex items-center gap-3">
                        <FileUp className="w-5 h-5 text-indigo-500" />
                        <span className="text-sm font-medium text-slate-700">Embedded Document</span>
                      </div>
                      <iframe 
                        src={block.file_url} 
                        className="w-full h-96 rounded-lg border border-slate-300 bg-white"
                        title="Embedded document"
                      />
                    </div>
                  );
                }

                if (block.type === 'embed_youtube') {
                  // Enhanced YouTube URL parsing to handle more formats
                  let videoId = null;
                  const youtubeUrlValue = block.youtube_url;
                  
                  if (youtubeUrlValue) {
                    const url = youtubeUrlValue.toString().trim();
                    
                    console.log('Parsing YouTube URL:', url);
                    
                    // First try to extract from URL patterns
                    const urlPatterns = [
                      /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]+)/,
                      /(?:youtu\.be\/)([a-zA-Z0-9_-]+)/,
                      /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/,
                      /(?:youtube\.com\/v\/)([a-zA-Z0-9_-]+)/,
                      /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]+)/,
                      /[?&]v=([a-zA-Z0-9_-]+)/  // Any URL with ?v= or &v=
                    ];
                    
                    for (const pattern of urlPatterns) {
                      const match = url.match(pattern);
                      if (match && match[1]) {
                        videoId = match[1].split('&')[0].split('?')[0];
                        console.log('Video ID extracted:', videoId);
                        break;
                      }
                    }
                    
                    // If no match found, assume it's just the video ID
                    if (!videoId && /^[a-zA-Z0-9_-]{10,12}$/.test(url)) {
                      videoId = url;
                      console.log('Using as direct video ID:', videoId);
                    }
                    
                    if (!videoId) {
                      console.log('No video ID found for:', url);
                    }
                  } else {
                    console.log('No youtube_url in block:', block);
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
                    block.type === 'text' ? "bg-slate-50" : "bg-white hover:border-indigo-300"
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
                  <div className="flex items-start justify-between gap-3">
                    {isAdmin && (
                      <div className="cursor-grab active:cursor-grabbing pt-1">
                        <GripVertical className="w-5 h-5 text-slate-400" />
                      </div>
                    )}
                    {renderBlock()}
                    {isAdmin && (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditBlock(block)}
                          className="text-slate-400 hover:text-indigo-600"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteBlock(block.id)}
                          className="text-slate-400 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
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