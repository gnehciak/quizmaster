import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { 
  GripVertical, 
  Pencil, 
  Trash2, 
  Eye, 
  EyeOff, 
  Lock, 
  Unlock, 
  Clock, 
  Calendar,
  FileText,
  PlayCircle,
  Link as LinkIcon,
  FileUp,
  Upload,
  Youtube,
  MoreVertical,
  CheckCircle2,
  BarChart3,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  FolderOpen,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

export default function CourseContentList({ 
  blocks, 
  editMode, 
  onReorder, 
  onEdit, 
  onDelete, 
  onToggleVisibility, 
  onToggleLock,
  onScheduleVisibility,
  onScheduleLock,
  onAddToTopic,
  onReorderTopicChildren,
  isAdmin,
  hasAccess,
  quizzes,
  allQuizAttempts
}) {
  const [expandedTopics, setExpandedTopics] = React.useState({});
  const [loadingQuizzes, setLoadingQuizzes] = React.useState({});

  React.useEffect(() => {
    const quizBlocks = blocks.filter(b => b.type === 'quiz');
    const newLoading = {};
    
    quizBlocks.forEach(block => {
      const quiz = quizzes.find(q => q.id === block.quiz_id);
      if (!quiz && !loadingQuizzes[block.quiz_id]) {
        newLoading[block.quiz_id] = true;
        
        setTimeout(() => {
          setLoadingQuizzes(prev => ({ ...prev, [block.quiz_id]: false }));
        }, 5000);
      }
    });
    
    if (Object.keys(newLoading).length > 0) {
      setLoadingQuizzes(prev => ({ ...prev, ...newLoading }));
    }
  }, [blocks, quizzes]);
  const handleDragEnd = (result) => {
    if (!result.destination) return;
    
    // Check if dragging within a topic
    if (result.type && result.type.startsWith('topic-')) {
      const topicId = result.type.replace('topic-', '');
      onReorderTopicChildren(topicId, result.source.index, result.destination.index);
    } else {
      // Top-level reordering
      onReorder(result.source.index, result.destination.index);
    }
  };

  const isBlockVisible = (block) => {
    if (isAdmin) return true;
    if (block.visible === false) return false;
    const now = new Date();
    if (block.scheduledShowDate && new Date(block.scheduledShowDate) > now) return false;
    if (block.scheduledHideDate && new Date(block.scheduledHideDate) < now) return false;
    return true;
  };

  const isBlockLocked = (block) => {
    if (isAdmin) return false;
    if (block.locked === true) {
      if (block.unlockDate) {
        const now = new Date();
        return new Date(block.unlockDate) > now;
      }
      return true;
    }
    return false;
  };

  const calculateTopicCompletion = (topic) => {
    if (!topic.children || topic.children.length === 0) return { completed: 0, total: 0 };
    
    const quizChildren = topic.children.filter(child => child.type === 'quiz');
    if (quizChildren.length === 0) return { completed: 0, total: 0 };
    
    const completed = quizChildren.filter(child => {
      const attempts = allQuizAttempts?.filter(a => a.quiz_id === child.quiz_id) || [];
      return attempts.length > 0;
    }).length;
    
    return { completed, total: quizChildren.length };
  };

  const isTopicOverdue = (dueDate) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  const toggleTopic = (topicId) => {
    setExpandedTopics(prev => ({
      ...prev,
      [topicId]: !prev[topicId]
    }));
  };

  const RenderBlockContent = React.useMemo(() => {
    return ({ block, isLocked, isChild = false }) => {
    if (block.type === 'topic') {
      const { completed, total } = calculateTopicCompletion(block);
      const isExpanded = expandedTopics[block.id] ?? true;
      const isOverdue = isTopicOverdue(block.due_date);
      const isCompleted = total > 0 && completed === total;
      
      return (
        <div className="space-y-3">
          <div 
            className={cn(
              "flex items-center gap-4 px-5 py-4 rounded-xl border-2 shadow-sm w-full cursor-pointer transition-all",
              isOverdue && !isCompleted ? "bg-red-50 border-red-300 hover:border-red-400" : "bg-indigo-50 border-indigo-200 hover:border-indigo-300",
              isCompleted && "bg-emerald-50 border-emerald-300"
            )}
            onClick={() => toggleTopic(block.id)}
          >
            <div className="flex items-center gap-3 flex-1">
              <div 
                className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xl shadow-sm",
                  isOverdue && !isCompleted ? "bg-red-500 text-white" : isCompleted ? "bg-emerald-500 text-white" : "bg-indigo-500 text-white"
                )}
              >
                {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
              </div>
              <div className="flex-1">
                <h3 className={cn("text-lg font-bold flex items-center gap-2", isOverdue && !isCompleted ? "text-red-900" : isCompleted ? "text-emerald-900" : "text-indigo-900")}>
                  {block.title}
                  {isCompleted && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                  {isOverdue && !isCompleted && <AlertCircle className="w-5 h-5 text-red-600" />}
                </h3>
                <div className="flex items-center gap-3 mt-1 text-sm">
                  {total > 0 && (
                    <span className={cn("font-medium", isCompleted ? "text-emerald-700" : isOverdue && !isCompleted ? "text-red-700" : "text-indigo-700")}>
                      {completed}/{total} completed
                    </span>
                  )}
                  {block.due_date && (
                    <span className={cn("flex items-center gap-1", isOverdue && !isCompleted ? "text-red-700 font-semibold" : "text-slate-600")}>
                      <Calendar className="w-3 h-3" />
                      Due {new Date(block.due_date).toLocaleDateString()}
                      {isOverdue && !isCompleted && " (Overdue)"}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <AnimatePresence mode="wait">
            {isExpanded && block.children && block.children.length > 0 && (
              <motion.div 
                key={`topic-${block.id}`}
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="ml-6 pl-6 border-l-2 border-indigo-200 space-y-3 overflow-hidden"
              >
              {editMode && isAdmin ? (
                <Droppable droppableId={`topic-${block.id}`} type={`topic-${block.id}`}>
                  {(provided) => (
                    <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                      {block.children.map((child, childIndex) => {
                        if (!isBlockVisible(child)) return null;
                        const childLocked = isBlockLocked(child);
                        return (
                          <Draggable key={child.id} draggableId={`${block.id}-${child.id}`} index={childIndex}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={cn(
                                  "group relative flex gap-3",
                                  snapshot.isDragging && "z-50 scale-105 opacity-90"
                                )}
                              >
                                <div 
                                  {...provided.dragHandleProps}
                                  className="flex-shrink-0 w-8 flex items-center justify-center cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 transition-colors"
                                >
                                  <GripVertical className="w-5 h-5" />
                                </div>
                                <div className="flex-1 relative">
                                  {childLocked && !isAdmin && (
                                    <div className="mb-2 flex items-center gap-2 text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg w-fit">
                                      <Lock className="w-3 h-3" />
                                      {child.unlockDate ? `Unlocks ${new Date(child.unlockDate).toLocaleDateString()}` : "Content Locked"}
                                    </div>
                                  )}
                                  <RenderBlockContent block={child} isLocked={childLocked} isChild={true} />
                                  
                                  <div className="absolute top-2 right-2 flex items-center gap-1 bg-white/90 backdrop-blur-sm p-1 rounded-lg border shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-7 w-7">
                                          <MoreVertical className="w-4 h-4 text-slate-500" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => onEdit(child)}>
                                          <Pencil className="w-4 h-4 mr-2" /> Edit Content
                                        </DropdownMenuItem>
                                        {onAddToTopic && (
                                          <DropdownMenuItem onClick={() => onAddToTopic({ ...child, parentTopicId: block.id })}>
                                            <FolderOpen className="w-4 h-4 mr-2" /> Move to Other Topic
                                          </DropdownMenuItem>
                                        )}
                                        <DropdownMenuItem onClick={() => onDelete(child.id, block.id)}>
                                          <Trash2 className="w-4 h-4 mr-2" /> Remove from Topic
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              ) : (
                <div className="space-y-3">
                  {block.children.map((child, idx) => {
                    if (!isBlockVisible(child)) return null;
                    const childLocked = isBlockLocked(child);
                    return (
                      <motion.div 
                        key={child.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2, delay: idx * 0.05, ease: "easeInOut" }}
                        className="relative"
                      >
                        {childLocked && !isAdmin && (
                          <div className="mb-2 flex items-center gap-2 text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg w-fit">
                            <Lock className="w-3 h-3" />
                            {child.unlockDate ? `Unlocks ${new Date(child.unlockDate).toLocaleDateString()}` : "Content Locked"}
                          </div>
                        )}
                        <RenderBlockContent block={child} isLocked={childLocked} isChild={true} />
                      </motion.div>
                    );
                  })}
                </div>
              )}
              </motion.div>
              )}
              </AnimatePresence>
        </div>
      );
    }

    if (block.type === 'section') {
        const getColorStyles = (colorValue) => {
          if (colorValue?.startsWith('#')) {
            return {
              gradient: { background: `linear-gradient(to right, ${colorValue}15, ${colorValue}25)` },
              border: { borderColor: colorValue },
              icon: { backgroundColor: colorValue, color: 'white' }
            };
          }
          const colorMap = {
            indigo: { from: 'from-indigo-50', to: 'to-purple-50', border: 'border-indigo-500', bg: 'bg-indigo-600', text: 'text-indigo-900' },
            blue: { from: 'from-blue-50', to: 'to-cyan-50', border: 'border-blue-500', bg: 'bg-blue-600', text: 'text-blue-900' },
            green: { from: 'from-green-50', to: 'to-emerald-50', border: 'border-green-500', bg: 'bg-green-600', text: 'text-green-900' },
            orange: { from: 'from-orange-50', to: 'to-amber-50', border: 'border-orange-500', bg: 'bg-orange-600', text: 'text-orange-900' },
            red: { from: 'from-red-50', to: 'to-pink-50', border: 'border-red-500', bg: 'bg-red-600', text: 'text-red-900' },
            purple: { from: 'from-purple-50', to: 'to-fuchsia-50', border: 'border-purple-500', bg: 'bg-purple-600', text: 'text-purple-900' },
            slate: { from: 'from-slate-50', to: 'to-gray-50', border: 'border-slate-500', bg: 'bg-slate-600', text: 'text-slate-900' },
            pink: { from: 'from-pink-50', to: 'to-rose-50', border: 'border-pink-500', bg: 'bg-pink-600', text: 'text-pink-900' },
            teal: { from: 'from-teal-50', to: 'to-cyan-50', border: 'border-teal-500', bg: 'bg-teal-600', text: 'text-teal-900' },
            amber: { from: 'from-amber-50', to: 'to-yellow-50', border: 'border-amber-500', bg: 'bg-amber-600', text: 'text-amber-900' },
            emerald: { from: 'from-emerald-50', to: 'to-green-50', border: 'border-emerald-500', bg: 'bg-emerald-600', text: 'text-emerald-900' },
            cyan: { from: 'from-cyan-50', to: 'to-blue-50', border: 'border-cyan-500', bg: 'bg-cyan-600', text: 'text-cyan-900' },
            sky: { from: 'from-sky-50', to: 'to-blue-50', border: 'border-sky-500', bg: 'bg-sky-600', text: 'text-sky-900' },
            violet: { from: 'from-violet-50', to: 'to-purple-50', border: 'border-violet-500', bg: 'bg-violet-600', text: 'text-violet-900' },
            fuchsia: { from: 'from-fuchsia-50', to: 'to-pink-50', border: 'border-fuchsia-500', bg: 'bg-fuchsia-600', text: 'text-fuchsia-900' },
            rose: { from: 'from-rose-50', to: 'to-pink-50', border: 'border-rose-500', bg: 'bg-rose-600', text: 'text-rose-900' },
            lime: { from: 'from-lime-50', to: 'to-green-50', border: 'border-lime-500', bg: 'bg-lime-600', text: 'text-lime-900' },
          };
          return colorMap[colorValue] || colorMap.indigo;
        };
        
        const colors = getColorStyles(block.color);
        const isHexColor = block.color?.startsWith('#');
        
        return (
          <div 
            className={cn(
              "flex items-center gap-4 px-5 py-4 rounded-xl border-l-4 shadow-sm w-full",
              !isHexColor && `bg-gradient-to-r ${colors.from} ${colors.to} ${colors.border}`
            )}
            style={isHexColor ? { ...colors.gradient, borderLeftColor: colors.border.borderColor } : {}}
          >
            <div 
              className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xl shadow-sm",
                !isHexColor && `${colors.bg} text-white`
              )}
              style={isHexColor ? colors.icon : {}}
            >
              {block.icon || '#'}
            </div>
            <h3 className={cn("text-lg font-bold", !isHexColor ? colors.text : "text-slate-900")}>
              {block.title}
            </h3>
          </div>
        );
    }

    if (block.type === 'text') {
      return (
        <div className="flex items-start gap-4 p-5 bg-white rounded-xl border border-slate-200 shadow-sm w-full">
          <div className="bg-slate-100 p-2.5 rounded-lg flex-shrink-0">
            <FileText className="w-5 h-5 text-slate-500" />
          </div>
          <div className="text-slate-700 prose prose-sm max-w-none prose-slate" dangerouslySetInnerHTML={{ __html: block.text }} />
        </div>
      );
    }

    if (block.type === 'quiz') {
      const quiz = quizzes.find(q => q.id === block.quiz_id);
      
      if (!quiz) {
        if (loadingQuizzes[block.quiz_id] !== false) {
          return (
            <div className="flex items-center gap-4 p-5 bg-white rounded-xl border border-slate-200 shadow-sm w-full">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
              </div>
              <div className="flex-1">
                <div className="h-5 bg-slate-200 rounded w-48 mb-2 animate-pulse"></div>
                <div className="h-4 bg-slate-100 rounded w-32 animate-pulse"></div>
              </div>
            </div>
          );
        }
        return <div className="p-4 bg-red-50 text-red-500 rounded-lg">Quiz not found</div>;
      }
      
      const attempts = allQuizAttempts?.filter(a => a.quiz_id === quiz.id) || [];
      const attemptsAllowed = quiz.attempts_allowed || 999;
      const attemptsUsed = attempts.length;
      const sortedAttempts = attempts.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
      const latestAttempt = sortedAttempts[0];
      const hasCompleted = !!latestAttempt;
      const canRetry = hasCompleted && (attemptsUsed < attemptsAllowed);

      return (
        <div className="flex items-center gap-4 p-5 bg-white rounded-xl border border-slate-200 shadow-sm hover:border-indigo-300 transition-colors w-full">
            <div className="flex-shrink-0">
                {hasCompleted && (hasAccess || isAdmin) ? (
                    <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center border-2 border-emerald-200">
                        <span className="text-sm font-bold text-emerald-700">{latestAttempt.percentage}%</span>
                    </div>
                ) : (
                    <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center border-2 border-indigo-100">
                        <PlayCircle className="w-6 h-6 text-indigo-500" />
                    </div>
                )}
            </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-slate-900 text-lg">{quiz.title}</h3>
            <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                <span>{quiz.questions?.length || 0} questions</span>
                {quiz.timer_enabled && (
                    <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {quiz.timer_duration}m
                    </span>
                )}
                {attemptsAllowed < 999 && (
                    <Badge variant="secondary" className="text-xs font-normal">
                        {Math.max(0, attemptsAllowed - attemptsUsed)} attempts left
                    </Badge>
                )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAdmin ? (
                <>
                    <Link to={createPageUrl(`QuizAttempts?id=${quiz.id}`)}>
                        <Button variant="outline" size="sm" className="gap-2">
                            <BarChart3 className="w-3 h-3" /> Stats
                        </Button>
                    </Link>
                    {hasCompleted && (
                        <Link to={createPageUrl(`ReviewAnswers?id=${quiz.id}&courseId=${block.courseId || ''}&attemptId=${latestAttempt.id}`)}>
                            <Button variant="outline" size="sm">Review</Button>
                        </Link>
                    )}
                    <Link to={createPageUrl(`CreateQuiz?id=${quiz.id}`)}>
                        <Button variant="outline" size="sm" className="gap-2">
                            <Pencil className="w-3 h-3" /> Edit
                        </Button>
                    </Link>
                    <Link to={createPageUrl(`TakeQuiz?id=${quiz.id}&courseId=${block.courseId || ''}`)}>
                        <Button size="sm">Start</Button>
                    </Link>
                </>
            ) : (
                <>
                {hasAccess ? (
                  <>
                    {hasCompleted && (
                        <Link to={createPageUrl(`ReviewAnswers?id=${quiz.id}&courseId=${block.courseId || ''}&attemptId=${latestAttempt.id}`)}>
                            <Button variant="outline" size="sm">Review</Button>
                        </Link>
                    )}
                    {canRetry ? (
                        <Link to={createPageUrl(`TakeQuiz?id=${quiz.id}&courseId=${block.courseId || ''}`)}>
                            <Button size="sm" className="gap-2">
                                <RotateCcw className="w-3 h-3" /> Retry
                            </Button>
                        </Link>
                    ) : !hasCompleted ? (
                        <Link to={createPageUrl(`TakeQuiz?id=${quiz.id}&courseId=${block.courseId || ''}`)}>
                            <Button size="sm">Start</Button>
                        </Link>
                    ) : null}
                  </>
                ) : (
                   <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-slate-100">
                        <Lock className="w-4 h-4 text-slate-400" />
                   </div> 
                )}
                </>
            )}
            
            {isAdmin && editMode && (
                <div className="flex items-center gap-1 text-xs text-slate-400 border px-2 py-1 rounded bg-slate-50">
                    ID: {quiz.id.substring(0,6)}...
                </div>
            )}
          </div>
        </div>
      );
    }

    if (block.type === 'website_link') {
        const locked = !hasAccess && !isAdmin;
        return (
            <div className={cn("flex items-center gap-4 p-5 bg-white rounded-xl border border-slate-200 shadow-sm w-full", locked && "opacity-75")}>
                <div className="bg-blue-50 p-2.5 rounded-lg flex-shrink-0">
                    <LinkIcon className="w-5 h-5 text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900">{block.title || block.url}</h3>
                    <div className="text-sm text-slate-500 truncate">{block.url}</div>
                </div>
                {locked ? (
                    <Lock className="w-4 h-4 text-slate-400" />
                ) : (
                    <a href={block.url} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm" className="gap-2">
                            Open <LinkIcon className="w-3 h-3" />
                        </Button>
                    </a>
                )}
            </div>
        );
    }

    // Similar standard styling for other embed types...
    if (block.type === 'embed_file' || block.type === 'upload_file') {
        const locked = !hasAccess && !isAdmin;
        const isUpload = block.type === 'upload_file';
        return (
            <div className={cn("flex items-center gap-4 p-5 bg-white rounded-xl border border-slate-200 shadow-sm w-full", locked && "opacity-75")}>
                <div className={cn("p-2.5 rounded-lg flex-shrink-0", isUpload ? "bg-amber-50" : "bg-purple-50")}>
                    {isUpload ? <Upload className="w-5 h-5 text-amber-500" /> : <FileUp className="w-5 h-5 text-purple-500" />}
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900">{block.file_name || (isUpload ? "Download File" : "Embedded File")}</h3>
                    {!isUpload && <div className="text-sm text-slate-500">Document viewer</div>}
                </div>
                {locked ? (
                     <Lock className="w-4 h-4 text-slate-400" />
                ) : (
                    isUpload ? (
                        <a href={block.file_url} download target="_blank" rel="noopener noreferrer">
                            <Button variant="outline" size="sm" className="gap-2">
                                Download <Upload className="w-3 h-3" />
                            </Button>
                        </a>
                    ) : (
                        <div className="px-3 py-1 bg-slate-100 text-xs rounded text-slate-500">Embedded</div>
                    )
                )}
            </div>
        );
    }
    
    if (block.type === 'embed_youtube') {
         const locked = !hasAccess && !isAdmin;
         return (
             <div className={cn("flex flex-col gap-3 p-5 bg-white rounded-xl border border-slate-200 shadow-sm w-full", locked && "opacity-75")}>
                 <div className="flex items-center gap-3">
                     <div className="bg-red-50 p-2 rounded-lg">
                        <Youtube className="w-5 h-5 text-red-500" />
                     </div>
                     <h3 className="font-semibold text-slate-900">Video Lesson</h3>
                     {locked && <Lock className="w-4 h-4 text-slate-400 ml-auto" />}
                 </div>
                 {!locked && (
                     <div className="relative pt-[56.25%] bg-black rounded-lg overflow-hidden">
                        <iframe 
                            src={`https://www.youtube.com/embed/${block.youtube_url?.match(/v=([a-zA-Z0-9_-]+)/)?.[1] || block.youtube_url}`}
                            className="absolute inset-0 w-full h-full"
                            allowFullScreen
                            title="YouTube video"
                        />
                     </div>
                 )}
             </div>
         );
    }

    return null;
  };

  if (!blocks || blocks.length === 0) {
    return (
        <div className="text-center py-12 px-4 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                <FileText className="w-6 h-6 text-slate-300" />
            </div>
            <h3 className="text-sm font-medium text-slate-900">No content yet</h3>
            <p className="text-sm text-slate-500 mt-1">
                {isAdmin ? "Use the 'Add Content' button to get started" : "Check back later for course materials"}
            </p>
        </div>
    );
  }

  // If not in edit mode or not admin, render simple list (no dnd)
  if (!isAdmin || !editMode) {
    return (
      <div className="space-y-4">
        {blocks.map((block) => {
            if (!isBlockVisible(block)) return null;
            const blockLocked = isBlockLocked(block);
            
            return (
                <div key={block.id} className="relative">
                    {blockLocked && !isAdmin && (
                        <div className="mb-2 flex items-center gap-2 text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg w-fit">
                            <Lock className="w-3 h-3" />
                            {block.unlockDate ? `Unlocks ${new Date(block.unlockDate).toLocaleDateString()}` : "Content Locked"}
                        </div>
                    )}
                    <RenderBlockContent block={block} isLocked={blockLocked} />
                </div>
            );
        })}
      </div>
    );
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="course-content">
        {(provided) => (
          <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
            {blocks.map((block, index) => (
              <Draggable key={block.id} draggableId={block.id} index={index}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    className={cn(
                        "group relative flex gap-3",
                        snapshot.isDragging && "z-50 scale-105 opacity-90"
                    )}
                  >
                    <div 
                        {...provided.dragHandleProps}
                        className="flex-shrink-0 w-8 flex items-center justify-center cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 transition-colors"
                    >
                        <GripVertical className="w-5 h-5" />
                    </div>

                    <div className="flex-1 relative">
                        <RenderBlockContent block={block} />
                        
                        {/* Edit Overlay/Controls */}
                        <div className="absolute top-2 right-2 flex items-center gap-1 bg-white/90 backdrop-blur-sm p-1 rounded-lg border shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7">
                                        <MoreVertical className="w-4 h-4 text-slate-500" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                   <DropdownMenuItem onClick={() => onEdit(block)}>
                                       <Pencil className="w-4 h-4 mr-2" /> Edit Content
                                   </DropdownMenuItem>
                                   {block.type !== 'topic' && onAddToTopic && (
                                     <DropdownMenuItem onClick={() => onAddToTopic(block)}>
                                       <FolderOpen className="w-4 h-4 mr-2" /> Add to Topic
                                     </DropdownMenuItem>
                                   )}
                                   <DropdownMenuItem onClick={() => onToggleVisibility(block.id)}>
                                       {block.visible === false ? <Eye className="w-4 h-4 mr-2" /> : <EyeOff className="w-4 h-4 mr-2" />}
                                       {block.visible === false ? "Make Visible" : "Hide from Students"}
                                   </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => onScheduleVisibility(block)}>
                                        <Clock className="w-4 h-4 mr-2" /> Schedule Visibility
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => onToggleLock(block.id)}>
                                        {block.locked === true ? <Unlock className="w-4 h-4 mr-2" /> : <Lock className="w-4 h-4 mr-2" />}
                                        {block.locked === true ? "Unlock Now" : "Lock Content"}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => onScheduleLock(block)}>
                                        <Calendar className="w-4 h-4 mr-2" /> Schedule Unlock
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => onDelete(block.id)} className="text-red-600 focus:text-red-600">
                                        <Trash2 className="w-4 h-4 mr-2" /> Delete
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>

                        {/* Status Indicators */}
                        <div className="absolute -left-2 top-1/2 -translate-y-1/2 -translate-x-full flex flex-col gap-1 pr-2">
                             {block.visible === false && (
                                 <div className="p-1.5 bg-slate-100 rounded-md text-slate-400" title="Hidden">
                                     <EyeOff className="w-4 h-4" />
                                 </div>
                             )}
                             {block.locked === true && (
                                 <div className="p-1.5 bg-amber-50 rounded-md text-amber-500" title="Locked">
                                     <Lock className="w-4 h-4" />
                                 </div>
                             )}
                             {(block.scheduledShowDate || block.scheduledHideDate) && (
                                 <div className="p-1.5 bg-blue-50 rounded-md text-blue-500" title="Scheduled">
                                     <Clock className="w-4 h-4" />
                                 </div>
                             )}
                        </div>
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
  );
}