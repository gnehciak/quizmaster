import React from 'react';

import { Droppable, Draggable } from '@hello-pangea/dnd';
import { 
  GripVertical, Pencil, Trash2, Lock, Calendar, CheckCircle2, AlertCircle, ChevronDown, ChevronRight, FolderOpen, Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const TopicBlock = React.memo(({
  block,
  expandedTopics,
  onToggleTopic,
  isBlockVisible,
  isBlockLocked,
  calculateTopicCompletion,
  isTopicOverdue,
  RenderBlockContent,
  isAdmin,
  editMode,
  onEdit,
  onDelete,
  onAddToTopic,
  onReorderTopicChildren,
  onAddContentAfter,
}) => {
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
        onClick={() => onToggleTopic(block.id)}
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
      
      {isExpanded && block.children && block.children.length > 0 && (
        <div 
          className="ml-6 pl-6 border-l-2 border-indigo-200 space-y-3"
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
                                        <Pencil className="w-4 h-4 text-slate-500" />
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
                    <div 
                      key={child.id}
                      className="relative"
                    >
                      {childLocked && !isAdmin && (
                        <div className="mb-2 flex items-center gap-2 text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg w-fit">
                          <Lock className="w-3 h-3" />
                          {child.unlockDate ? `Unlocks ${new Date(child.unlockDate).toLocaleDateString()}` : "Content Locked"}
                        </div>
                      )}
                      <RenderBlockContent block={child} isLocked={childLocked} isChild={true} />
                    </div>
                  );
                })}
              </div>
            )}
        </div>
      )}
    </div>
  );
});

TopicBlock.displayName = 'TopicBlock';

export default TopicBlock;