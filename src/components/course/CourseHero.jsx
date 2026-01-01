import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  PlayCircle, 
  Lock, 
  Unlock, 
  CreditCard, 
  Clock, 
  BookOpen, 
  CheckCircle2,
  Share2,
  CalendarDays,
  Upload,
  Trash2,
  Sparkles,
  Settings,
  Move
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';

export default function CourseHero({ 
  course, 
  access, 
  progress, 
  onUnlock, 
  onPurchase, 
  firstIncompleteBlockId,
  isLocked,
  hasAccess,
  editMode,
  onUpdate
}) {
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const [localTitle, setLocalTitle] = React.useState(course.title);
  const [localDesc, setLocalDesc] = React.useState(course.description);
  
  // Image settings state
  const [imageFit, setImageFit] = React.useState(course.image_settings?.objectFit || 'cover');
  const [imagePos, setImagePos] = React.useState(course.image_settings?.objectPosition || 'center center');

  React.useEffect(() => {
    setLocalTitle(course.title);
    setLocalDesc(course.description);
    if (course.image_settings) {
        setImageFit(course.image_settings.objectFit || 'cover');
        setImagePos(course.image_settings.objectPosition || 'center center');
    }
  }, [course.title, course.description, course.image_settings]);

  const updateImageSettings = (fit, pos) => {
    const newFit = fit || imageFit;
    const newPos = pos || imagePos;
    setImageFit(newFit);
    setImagePos(newPos);
    onUpdate({ 
        image_settings: {
            objectFit: newFit,
            objectPosition: newPos
        }
    });
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setIsUploading(true);
    try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        onUpdate({ image_url: file_url });
    } catch (error) {
        console.error("Upload failed", error);
    }
    setIsUploading(false);
  };

  const handleRegenerateImage = async () => {
    setIsGenerating(true);
    try {
        const prompt = `A modern, minimalist, educational cover image for a course titled "${localTitle}". Category: ${course.category || 'Education'}. Vibrant colors, vector art style, clean design, 4k quality.`;
        const { url } = await base44.integrations.Core.GenerateImage({ prompt });
        onUpdate({ image_url: url });
    } catch (error) {
        console.error("Generation failed", error);
    }
    setIsGenerating(false);
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm mb-8 group/hero">
      <div className="grid md:grid-cols-12 gap-0">
        {/* Image Section */}
        <div className="md:col-span-5 lg:col-span-4 relative h-64 md:h-auto min-h-[300px] bg-slate-100">
          {course.image_url ? (
            <img 
              src={course.image_url} 
              alt={course.title}
              className="absolute inset-0 w-full h-full transition-all duration-300"
              style={{
                objectFit: imageFit,
                objectPosition: imagePos
              }}
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
              <BookOpen className="w-20 h-20 text-indigo-200" />
            </div>
          )}
          
          {course.category && (
            <Badge className="absolute top-4 left-4 bg-white/90 text-slate-800 hover:bg-white backdrop-blur-sm z-10">
              {course.category}
            </Badge>
          )}

          {editMode && (
             <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/hero:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3 p-4 z-20">
                <input 
                    type="file" 
                    id="hero-image-upload" 
                    className="hidden" 
                    accept="image/*"
                    onChange={handleImageUpload}
                />
                <Button 
                    variant="secondary" 
                    size="sm" 
                    className="w-full max-w-[200px]"
                    onClick={() => document.getElementById('hero-image-upload').click()}
                    disabled={isUploading || isGenerating}
                >
                    {isUploading ? "Uploading..." : <><Upload className="w-4 h-4 mr-2" /> Upload Image</>}
                </Button>
                <Button 
                    variant="secondary" 
                    size="sm" 
                    className="w-full max-w-[200px]"
                    onClick={handleRegenerateImage}
                    disabled={isUploading || isGenerating}
                >
                     {isGenerating ? "Generating..." : <><Sparkles className="w-4 h-4 mr-2" /> AI Generate</>}
                </Button>
                
                {course.image_url && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="secondary" size="sm" className="w-full max-w-[200px]">
                                <Settings className="w-4 h-4 mr-2" /> Adjust Image
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuLabel>Image Fit</DropdownMenuLabel>
                            <DropdownMenuRadioGroup value={imageFit} onValueChange={(v) => updateImageSettings(v, null)}>
                                <DropdownMenuRadioItem value="cover">Cover (Fill Area)</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="contain">Contain (Show Full)</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="fill">Stretch</DropdownMenuRadioItem>
                            </DropdownMenuRadioGroup>
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel>Position</DropdownMenuLabel>
                            <div className="grid grid-cols-3 gap-1 p-2">
                                {['top left', 'top center', 'top right', 'center left', 'center center', 'center right', 'bottom left', 'bottom center', 'bottom right'].map((pos) => (
                                    <button
                                        key={pos}
                                        className={`w-8 h-8 rounded border flex items-center justify-center hover:bg-slate-100 ${imagePos === pos ? 'bg-indigo-100 border-indigo-500' : 'bg-white border-slate-200'}`}
                                        onClick={() => updateImageSettings(null, pos)}
                                        title={pos}
                                    >
                                        <div className={`w-2 h-2 rounded-full ${imagePos === pos ? 'bg-indigo-600' : 'bg-slate-300'}`} />
                                    </button>
                                ))}
                            </div>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}

                {course.image_url && (
                    <Button 
                        variant="destructive" 
                        size="sm" 
                        className="w-full max-w-[200px]"
                        onClick={() => onUpdate({ image_url: '' })}
                    >
                        <Trash2 className="w-4 h-4 mr-2" /> Remove
                    </Button>
                )}
             </div>
          )}
        </div>

        {/* Content Section */}
        <div className="md:col-span-7 lg:col-span-8 p-6 md:p-8 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-4 mb-4">
              {editMode ? (
                  <div className="flex-1">
                      <input
                          value={localTitle}
                          onChange={(e) => setLocalTitle(e.target.value)}
                          onBlur={() => {
                              if (localTitle !== course.title) onUpdate({ title: localTitle });
                          }}
                          className="w-full text-3xl font-bold text-slate-900 leading-tight bg-transparent border-b border-dashed border-slate-300 focus:border-indigo-500 focus:outline-none px-1 py-1"
                          placeholder="Course Title"
                      />
                  </div>
              ) : (
                  <h1 className="text-3xl font-bold text-slate-900 leading-tight">
                    {course.title}
                  </h1>
              )}
              
              {!editMode && (
                <Button variant="ghost" size="icon" onClick={handleShare} className="text-slate-400 hover:text-indigo-600">
                    <Share2 className="w-5 h-5" />
                </Button>
              )}
            </div>

            {editMode ? (
                <textarea
                    value={localDesc}
                    onChange={(e) => setLocalDesc(e.target.value)}
                    onBlur={() => {
                        if (localDesc !== course.description) onUpdate({ description: localDesc });
                    }}
                    className="w-full text-slate-600 text-lg mb-6 bg-transparent border rounded-lg border-dashed border-slate-300 focus:border-indigo-500 focus:outline-none p-3 min-h-[120px] resize-none"
                    placeholder="Course Description"
                />
            ) : (
                <p className="text-slate-600 text-lg mb-6 line-clamp-3">
                    {course.description}
                </p>
            )}

            <div className="flex flex-wrap items-center gap-4 mb-8 text-sm text-slate-500">
              <div className="flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-indigo-500" />
                <span>{course.content_blocks?.length || 0} Lessons</span>
              </div>
              {course.enrollment_duration && (
                <div className="flex items-center gap-1.5">
                  <CalendarDays className="w-4 h-4 text-indigo-500" />
                  <span>{course.enrollment_duration} days access</span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                {isLocked && !hasAccess ? (
                  <>
                    <Lock className="w-4 h-4 text-amber-500" />
                    <span className="text-amber-600 font-medium">Locked</span>
                  </>
                ) : (
                  <>
                    <Unlock className="w-4 h-4 text-emerald-500" />
                    <span className="text-emerald-600 font-medium">Unlocked</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="mt-auto">
            {hasAccess ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-medium text-slate-700">Course Progress</span>
                  <span className="font-bold text-indigo-600">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
                {progress === 100 && (
                    <div className="mt-3 flex items-center gap-2 text-emerald-600 font-medium bg-emerald-50 p-2 rounded-lg">
                        <CheckCircle2 className="w-5 h-5" />
                        <span>Course Completed</span>
                    </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-3">
                {course.price && (
                  <Button 
                    onClick={onPurchase}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-base py-6 rounded-xl"
                  >
                    <CreditCard className="w-5 h-5 mr-2" />
                    Enroll for ${course.price}
                  </Button>
                )}
                {course.is_locked && (
                  <Button 
                    onClick={onUnlock}
                    variant={course.price ? "outline" : "default"}
                    className={course.price ? "flex-1 py-6 rounded-xl" : "flex-1 bg-indigo-600 hover:bg-indigo-700 text-base py-6 rounded-xl"}
                  >
                    <Lock className="w-5 h-5 mr-2" />
                    {course.price ? 'Unlock with Code' : 'Unlock Course'}
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}