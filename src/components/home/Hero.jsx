import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { motion } from 'framer-motion';
import { 
  ChevronRight, 
  GraduationCap, 
  Sparkles, 
  Monitor, 
  Gift, 
  BarChart2, 
  Edit, 
  Plus, 
  Trash2, 
  Image as ImageIcon,
  Save,
  X
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Autoplay from "embla-carousel-autoplay";

const ICON_MAP = {
  Sparkles: Sparkles,
  Monitor: Monitor,
  Gift: Gift,
  BarChart2: BarChart2,
  GraduationCap: GraduationCap
};

const DEFAULT_SLIDES = [
  {
    id: 1,
    badge: "Premium Test Preparation",
    badgeIconName: "Sparkles",
    titlePrefix: "Master the",
    titleHighlight: "OC & Selective",
    titleSuffix: "Placement Tests",
    highlightColor: "from-indigo-600 to-violet-600",
    description: "Experience the most authentic practice environment. Our platform replicates the official test UI to boost confidence and performance.",
    primaryAction: { text: "Explore Courses", link: "/Home#courses" },
    secondaryAction: { text: "See Features", link: "/Home#features" },
    imageUrl: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&q=80&w=1600"
  },
  {
    id: 2,
    badge: "Authentic Exam Interface",
    badgeIconName: "Monitor",
    titlePrefix: "Practice on the",
    titleHighlight: "Real Exam Format",
    titleSuffix: "",
    highlightColor: "from-blue-600 to-cyan-600",
    description: "Don't let the interface surprise you on test day. Our system mimics the official digital test format down to the smallest detail.",
    primaryAction: { text: "Try Demo Quiz", link: "/Home#courses" },
    secondaryAction: { text: "View Features", link: "/Home#features" },
    imageUrl: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=1600"
  },
  {
    id: 3,
    badge: "Free Starter Pack",
    badgeIconName: "Gift",
    titlePrefix: "Start with our",
    titleHighlight: "Free Test Pack",
    titleSuffix: "",
    highlightColor: "from-emerald-600 to-teal-600",
    description: "Get immediate access to sample tests and practice questions. No credit card required to start your journey.",
    primaryAction: { text: "Get Started Free", link: "/Home#courses" },
    secondaryAction: null,
    imageUrl: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&q=80&w=1600"
  },
  {
    id: 4,
    badge: "Deep Analytics",
    badgeIconName: "BarChart2",
    titlePrefix: "Visualize Your",
    titleHighlight: "Progress & Growth",
    titleSuffix: "",
    highlightColor: "from-rose-600 to-pink-600",
    description: "Detailed performance breakdown, topic mastery analysis, and improvement tracking to help identify weak points.",
    primaryAction: { text: "View Analytics", link: "/Profile" },
    secondaryAction: { text: "Learn More", link: "/Home#features" },
    imageUrl: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=1600"
  }
];

export default function Hero({ content, onUpdate, editMode }) {
  const plugin = useRef(
    Autoplay({ delay: 6000, stopOnInteraction: true })
  );

  const slides = content?.slides || DEFAULT_SLIDES;
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingSlideIndex, setEditingSlideIndex] = useState(null);

  // Helper to update a specific slide
  const handleUpdateSlide = (index, field, value) => {
    const newSlides = [...slides];
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      newSlides[index] = {
        ...newSlides[index],
        [parent]: {
          ...newSlides[index][parent],
          [child]: value
        }
      };
    } else {
      newSlides[index] = { ...newSlides[index], [field]: value };
    }
    onUpdate({ slides: newSlides });
  };

  const handleAddSlide = () => {
    const newSlide = { ...DEFAULT_SLIDES[0], id: Date.now(), titlePrefix: "New Slide", titleHighlight: "Highlight", description: "New description" };
    onUpdate({ slides: [...slides, newSlide] });
    setEditingSlideIndex(slides.length); // Open edit for new slide
  };

  const handleDeleteSlide = (index) => {
    const newSlides = slides.filter((_, i) => i !== index);
    onUpdate({ slides: newSlides });
    if (editingSlideIndex === index) setEditingSlideIndex(null);
  };

  const renderEditForm = () => {
    if (editingSlideIndex === null) return null;
    const slide = slides[editingSlideIndex];

    return (
      <div className="space-y-4 py-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Badge Text</Label>
            <Input value={slide.badge} onChange={(e) => handleUpdateSlide(editingSlideIndex, 'badge', e.target.value)} />
          </div>
          <div>
            <Label>Badge Icon</Label>
            <Select 
              value={slide.badgeIconName} 
              onValueChange={(val) => handleUpdateSlide(editingSlideIndex, 'badgeIconName', val)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(ICON_MAP).map(name => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-1">
            <Label>Title Prefix</Label>
            <Input value={slide.titlePrefix} onChange={(e) => handleUpdateSlide(editingSlideIndex, 'titlePrefix', e.target.value)} />
          </div>
          <div className="col-span-1">
            <Label>Highlight</Label>
            <Input value={slide.titleHighlight} onChange={(e) => handleUpdateSlide(editingSlideIndex, 'titleHighlight', e.target.value)} />
          </div>
          <div className="col-span-1">
            <Label>Suffix</Label>
            <Input value={slide.titleSuffix} onChange={(e) => handleUpdateSlide(editingSlideIndex, 'titleSuffix', e.target.value)} />
          </div>
        </div>

        <div>
          <Label>Description</Label>
          <Textarea value={slide.description} onChange={(e) => handleUpdateSlide(editingSlideIndex, 'description', e.target.value)} />
        </div>

        <div>
          <Label>Image URL</Label>
          <Input value={slide.imageUrl} onChange={(e) => handleUpdateSlide(editingSlideIndex, 'imageUrl', e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Primary Action Text</Label>
            <Input value={slide.primaryAction.text} onChange={(e) => handleUpdateSlide(editingSlideIndex, 'primaryAction.text', e.target.value)} />
          </div>
          <div>
            <Label>Primary Action Link</Label>
            <Input value={slide.primaryAction.link} onChange={(e) => handleUpdateSlide(editingSlideIndex, 'primaryAction.link', e.target.value)} />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="relative bg-white overflow-hidden border-b border-slate-100 group/hero">
      {editMode && (
        <div className="absolute top-4 right-4 z-50">
          <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="secondary" className="shadow-lg gap-2">
                <Edit className="w-4 h-4" /> Edit Slides
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Hero Slides</DialogTitle>
              </DialogHeader>
              <div className="flex gap-6">
                {/* Sidebar List */}
                <div className="w-1/3 border-r pr-4 space-y-2">
                  {slides.map((s, i) => (
                    <div 
                      key={i} 
                      className={`p-3 rounded-lg border cursor-pointer flex justify-between items-center ${editingSlideIndex === i ? 'bg-indigo-50 border-indigo-500' : 'hover:bg-slate-50'}`}
                      onClick={() => setEditingSlideIndex(i)}
                    >
                      <span className="truncate text-sm font-medium">{s.titleHighlight || `Slide ${i + 1}`}</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={(e) => { e.stopPropagation(); handleDeleteSlide(i); }}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" className="w-full gap-2" onClick={handleAddSlide}>
                    <Plus className="w-4 h-4" /> Add Slide
                  </Button>
                </div>
                
                {/* Edit Form */}
                <div className="w-2/3 pl-2">
                  {editingSlideIndex !== null ? renderEditForm() : (
                    <div className="h-full flex items-center justify-center text-slate-500">
                      Select a slide to edit
                    </div>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}

      <Carousel
        plugins={[plugin.current]}
        className="w-full"
        onMouseEnter={plugin.current.stop}
        onMouseLeave={plugin.current.reset}
      >
        <CarouselContent>
          {slides.map((slide) => {
            const Icon = ICON_MAP[slide.badgeIconName] || Sparkles;
            return (
              <CarouselItem key={slide.id}>
                <div className="relative h-[600px] md:h-[700px] flex items-center">
                  <div className="absolute inset-y-0 right-0 w-[55%] z-0">
                    <div className="absolute inset-0 bg-gradient-to-r from-white via-white/80 to-transparent z-10" />
                    <img 
                      src={slide.imageUrl} 
                      alt={slide.titleHighlight} 
                      className="w-full h-full object-cover object-center"
                    />
                  </div>
                  
                  <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10 w-full">
                    <div className="lg:w-2/3">
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                      >
                        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-sm font-medium mb-6">
                          <Icon className="w-4 h-4" />
                          {slide.badge}
                        </span>
                        <h1 className="text-5xl md:text-6xl font-bold text-slate-900 tracking-tight mb-6 leading-tight">
                          {slide.titlePrefix} <span className={`text-transparent bg-clip-text bg-gradient-to-r ${slide.highlightColor || 'from-indigo-600 to-violet-600'}`}>{slide.titleHighlight}</span> {slide.titleSuffix}
                        </h1>
                        <p className="text-xl text-slate-600 mb-8 max-w-2xl leading-relaxed">
                          {slide.description}
                        </p>
                        <div className="flex flex-wrap gap-4">
                          <Link to={slide.primaryAction.link}>
                            <Button size="lg" className="h-14 px-8 text-lg bg-slate-900 hover:bg-slate-800 shadow-xl shadow-slate-200">
                              {slide.primaryAction.text}
                              <ChevronRight className="w-5 h-5 ml-2" />
                            </Button>
                          </Link>
                          {slide.secondaryAction && (
                            <Link to={slide.secondaryAction.link}>
                              <Button size="lg" variant="outline" className="h-14 px-8 text-lg bg-white/80 backdrop-blur border-slate-200">
                                {slide.secondaryAction.text}
                              </Button>
                            </Link>
                          )}
                        </div>
                      </motion.div>
                    </div>
                  </div>
                </div>
              </CarouselItem>
            );
          })}
        </CarouselContent>
        <div className="absolute bottom-8 right-8 flex gap-2 z-20">
          <CarouselPrevious className="static translate-y-0 translate-x-0 h-12 w-12 border-slate-200 bg-white/80 hover:bg-white" />
          <CarouselNext className="static translate-y-0 translate-x-0 h-12 w-12 border-slate-200 bg-white/80 hover:bg-white" />
        </div>
      </Carousel>
    </div>
  );
}