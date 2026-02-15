import React from 'react';
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
  Link as LinkIcon,
  FileUp,
  Upload,
  Youtube,
  MoreVertical,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  FolderOpen,
  Loader2,
  Plus
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
import TopicBlock from './TopicBlock';
import QuizBlockContent from './QuizBlockContent';

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
  onAddContentAfter,
  isAdmin,
  hasAccess,
  allQuizAttempts
}) {
  const [expandedTopics, setExpandedTopics] = React.useState({});
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
      return attempts.some(a => a.completed === true || (!a.hasOwnProperty('completed') && !a.paused));
    }).length;
    
    return { completed, total: quizChildren.length };
  };

  const isTopicOverdue = (dueDate) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  const toggleTopic = React.useCallback((topicId) => {
    setExpandedTopics(prev => ({
      ...prev,
      [topicId]: !prev[topicId]
    }));
  }, []);

  const RenderBlockContent = ({ block, isLocked, isChild = false }) => {
    if (block.type === 'topic') {
      return (
        <TopicBlock
          block={block}
          expandedTopics={expandedTopics}
          onToggleTopic={toggleTopic}
          isBlockVisible={isBlockVisible}
          isBlockLocked={isBlockLocked}
          calculateTopicCompletion={calculateTopicCompletion}
          isTopicOverdue={isTopicOverdue}
          RenderBlockContent={RenderBlockContent}
          isAdmin={isAdmin}
          editMode={editMode}
          onEdit={onEdit}
          onDelete={onDelete}
          onAddToTopic={onAddToTopic}
          onReorderTopicChildren={onReorderTopicChildren}
        />
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
      return (
        <QuizBlockContent
          block={block}
          isAdmin={isAdmin}
          hasAccess={hasAccess}
          editMode={editMode}
          allQuizAttempts={allQuizAttempts}
        />
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
                        <div className="absolute inset-0 z-20 flex items-center justify-center rounded-xl overflow-hidden">
                          <div className="absolute inset-0 bg-white/60 backdrop-blur-[3px]"></div>
                          <div className="relative z-10 text-center p-4">
                            <div className="w-8 h-8 bg-white shadow-sm rounded-full flex items-center justify-center mx-auto mb-2 border border-slate-200">
                              <Lock className="w-4 h-4 text-slate-400" />
                            </div>
                            <p className="text-slate-900 font-medium text-sm">Content Locked</p>
                            {block.unlockDate && (
                              <p className="text-slate-500 text-xs mt-0.5">
                                Unlocks {new Date(block.unlockDate).toLocaleDateString()}
                              </p>
                            )}
                          </div>
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