import React, { useState } from 'react';
import { Monitor, MousePointerClick, CheckCircle, Smartphone, Edit, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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

const ICON_MAP = {
  Monitor: Monitor,
  MousePointerClick: MousePointerClick,
  CheckCircle: CheckCircle,
  Smartphone: Smartphone
};

const DEFAULT_ITEMS = [
  {
    title: "Authentic Exam Interface",
    description: "Familiarize yourself with the exact layout, navigation, and tools used in the official OC and Selective placement tests. Zero learning curve on exam day.",
    iconName: "Monitor",
    color: "indigo"
  },
  {
    title: "Interactive Question Types",
    description: "Practice with drag-and-drop, inline choice, and split-screen reading comprehension questions just like the real test.",
    iconName: "MousePointerClick",
    color: "purple"
  },
  {
    title: "Instant Feedback & Analytics",
    description: "Get immediate results and detailed explanations. Track progress over time to identify strengths and weaknesses.",
    iconName: "CheckCircle",
    color: "emerald"
  }
];

export default function FeatureShowcase({ content, onUpdate, editMode }) {
  const items = content?.items || DEFAULT_ITEMS;
  const title = content?.title || "Designed to Match the Real Thing";
  const description = content?.description || "Don't let the exam format surprise you. Our platform mirrors the official digital test interface so you can focus on the questions, not the tools.";
  const showBadge = content?.showBadge ?? true;

  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const handleUpdateItem = (index, field, value) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    onUpdate({ items: newItems, title, description, showBadge });
  };

  const handleAddItem = () => {
    const newItem = {
      title: "New Feature",
      description: "Feature description",
      iconName: "Monitor",
      color: "indigo"
    };
    onUpdate({ items: [...items, newItem], title, description, showBadge });
  };

  const handleDeleteItem = (index) => {
    const newItems = items.filter((_, i) => i !== index);
    onUpdate({ items: newItems, title, description, showBadge });
  };

  const handleHeaderUpdate = (field, value) => {
    onUpdate({ items, title, description, showBadge, [field]: value });
  };

  const getColorClasses = (color) => {
    const map = {
      indigo: { bg: 'bg-indigo-500/20', text: 'text-indigo-400', border: 'border-indigo-500/30' },
      purple: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30' },
      emerald: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30' },
      blue: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
      red: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
    };
    return map[color] || map.indigo;
  };

  return (
    <section id="features" className="py-24 bg-slate-900 text-white overflow-hidden relative group/showcase">
      {editMode && (
        <div className="absolute top-4 right-4 z-20">
          <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="secondary" className="shadow-lg gap-2">
                <Edit className="w-4 h-4" /> Edit Showcase
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-white text-slate-900">
              <DialogHeader>
                <DialogTitle>Edit Showcase Section</DialogTitle>
              </DialogHeader>
              <div className="space-y-6 py-4">
                <div className="space-y-4">
                  <Label>Title</Label>
                  <Input value={title} onChange={(e) => handleHeaderUpdate('title', e.target.value)} />
                  <Label>Description</Label>
                  <Textarea value={description} onChange={(e) => handleHeaderUpdate('description', e.target.value)} />
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      checked={showBadge} 
                      onChange={(e) => handleHeaderUpdate('showBadge', e.target.checked)}
                      className="w-4 h-4"
                    />
                    <Label>Show Responsive Badge</Label>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Label className="text-lg font-semibold">Feature Items</Label>
                    <Button size="sm" onClick={handleAddItem} variant="outline" className="gap-2">
                      <Plus className="w-4 h-4" /> Add Item
                    </Button>
                  </div>

                  <div className="grid gap-6">
                    {items.map((item, index) => (
                      <div key={index} className="p-4 border rounded-lg space-y-3 bg-slate-50 relative">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                          onClick={() => handleDeleteItem(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="col-span-2">
                            <Label>Title</Label>
                            <Input value={item.title} onChange={(e) => handleUpdateItem(index, 'title', e.target.value)} />
                          </div>
                          <div className="col-span-2">
                            <Label>Description</Label>
                            <Textarea value={item.description} onChange={(e) => handleUpdateItem(index, 'description', e.target.value)} />
                          </div>
                          <div>
                            <Label>Icon</Label>
                            <Select 
                              value={item.iconName} 
                              onValueChange={(val) => handleUpdateItem(index, 'iconName', val)}
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
                          <div>
                            <Label>Color (indigo, purple, emerald, blue, red)</Label>
                            <Input value={item.color} onChange={(e) => handleUpdateItem(index, 'color', e.target.value)} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-20 pointer-events-none">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-500 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-24 w-72 h-72 bg-purple-500 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">{title}</h2>
          <p className="text-lg text-slate-300">
            {description}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div className="space-y-12">
            {items.map((item, index) => {
              const Icon = ICON_MAP[item.iconName] || Monitor;
              const colors = getColorClasses(item.color);
              
              return (
                <div key={index} className="flex gap-6">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${colors.bg} ${colors.text} border ${colors.border}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                    <p className="text-slate-400 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="relative">
            <div className="relative bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden aspect-[4/3] group">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 opacity-50" />
              
              {/* Mock UI Interface */}
              <div className="absolute inset-4 bg-white rounded-lg shadow-inner overflow-hidden flex flex-col">
                <div className="h-12 bg-slate-100 border-b border-slate-200 flex items-center px-4 justify-between">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-amber-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                  </div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Official Exam Mode</div>
                </div>
                <div className="flex-1 p-6 flex gap-6">
                  <div className="flex-1 space-y-4">
                    <div className="h-4 bg-slate-100 rounded w-3/4" />
                    <div className="h-4 bg-slate-100 rounded w-full" />
                    <div className="h-4 bg-slate-100 rounded w-5/6" />
                    <div className="h-32 bg-indigo-50 rounded-lg border-2 border-dashed border-indigo-200 flex items-center justify-center mt-4">
                      <span className="text-indigo-400 font-medium">Reading Passage / Stimulus</span>
                    </div>
                  </div>
                  <div className="flex-1 space-y-3">
                    <div className="h-4 bg-slate-100 rounded w-1/2 mb-4" />
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded border border-slate-200">
                        <div className="w-4 h-4 rounded-full border border-slate-300" />
                        <div className="h-3 bg-slate-100 rounded w-2/3" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Floating badge */}
            {showBadge && (
              <div className="absolute -bottom-6 -right-6 bg-white text-slate-900 p-4 rounded-xl shadow-xl border border-slate-100 flex items-center gap-3 animate-bounce duration-[3000ms]">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-sm">Responsive Design</div>
                  <div className="text-xs text-slate-500">Works on all devices</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}