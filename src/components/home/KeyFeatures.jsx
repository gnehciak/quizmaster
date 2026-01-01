import React, { useState } from 'react';
import { Calendar, ShieldCheck, Heart, Edit, Plus, Trash2, Save } from 'lucide-react';
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
  Calendar: Calendar,
  ShieldCheck: ShieldCheck,
  Heart: Heart
};

const DEFAULT_FEATURES = [
  {
    title: 'Latest 2025 Exam Patterns',
    description: 'Stay ahead with the most current exam formats, question types, and assessment criteria. Our preparation programs are continuously updated for 2025.',
    iconName: 'Calendar',
    color: 'bg-blue-100 text-blue-600',
  },
  {
    title: 'Try Free Tests First - Zero Risk',
    description: 'Experience our proven teaching methodology with free mock tests before purchasing. No credit card required. Access expert-designed practice tests.',
    iconName: 'ShieldCheck',
    color: 'bg-green-100 text-green-600',
  },
  {
    title: 'Trusted by Families Australia-wide',
    description: 'Trusted by 800+ families across Australia in Sydney, Melbourne, Brisbane & online. Verified 4.9/5 parent rating with proven exam preparation methodology.',
    iconName: 'Heart',
    color: 'bg-rose-100 text-rose-600',
  },
];

export default function KeyFeatures({ content, onUpdate, editMode }) {
  const features = content?.features || DEFAULT_FEATURES;
  const title = content?.title || "Key Features";
  const subtitle = content?.subtitle || "Why parents and students choose our platform for exam success.";

  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const handleUpdateFeature = (index, field, value) => {
    const newFeatures = [...features];
    newFeatures[index] = { ...newFeatures[index], [field]: value };
    onUpdate({ features: newFeatures, title, subtitle });
  };

  const handleAddFeature = () => {
    const newFeature = {
      title: "New Feature",
      description: "Description",
      iconName: "Calendar",
      color: "bg-gray-100 text-gray-600"
    };
    onUpdate({ features: [...features, newFeature], title, subtitle });
  };

  const handleDeleteFeature = (index) => {
    const newFeatures = features.filter((_, i) => i !== index);
    onUpdate({ features: newFeatures, title, subtitle });
  };

  const handleHeaderUpdate = (field, value) => {
    onUpdate({ features, title, subtitle, [field]: value });
  };

  return (
    <div className="py-20 bg-white relative group/features" id="features">
      {editMode && (
        <div className="absolute top-4 right-4 z-10">
          <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="secondary" className="shadow-lg gap-2">
                <Edit className="w-4 h-4" /> Edit Features
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Key Features Section</DialogTitle>
              </DialogHeader>
              <div className="space-y-6 py-4">
                <div className="space-y-4">
                  <Label>Section Title</Label>
                  <Input value={title} onChange={(e) => handleHeaderUpdate('title', e.target.value)} />
                  <Label>Subtitle</Label>
                  <Textarea value={subtitle} onChange={(e) => handleHeaderUpdate('subtitle', e.target.value)} />
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Label className="text-lg font-semibold">Features List</Label>
                    <Button size="sm" onClick={handleAddFeature} variant="outline" className="gap-2">
                      <Plus className="w-4 h-4" /> Add Feature
                    </Button>
                  </div>
                  
                  {features.map((feature, index) => (
                    <div key={index} className="p-4 border rounded-lg space-y-3 bg-slate-50 relative">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                        onClick={() => handleDeleteFeature(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                          <Label>Title</Label>
                          <Input value={feature.title} onChange={(e) => handleUpdateFeature(index, 'title', e.target.value)} />
                        </div>
                        <div className="col-span-2">
                          <Label>Description</Label>
                          <Textarea value={feature.description} onChange={(e) => handleUpdateFeature(index, 'description', e.target.value)} />
                        </div>
                        <div>
                          <Label>Icon</Label>
                          <Select 
                            value={feature.iconName} 
                            onValueChange={(val) => handleUpdateFeature(index, 'iconName', val)}
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
                          <Label>Color Class</Label>
                          <Input value={feature.color} onChange={(e) => handleUpdateFeature(index, 'color', e.target.value)} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">{title}</h2>
          <p className="text-lg text-slate-600">
            {subtitle}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = ICON_MAP[feature.iconName] || Calendar;
            return (
              <div key={index} className="bg-slate-50 rounded-2xl p-8 border border-slate-100 hover:shadow-lg transition-shadow">
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-6 ${feature.color}`}>
                  <Icon className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-4">{feature.title}</h3>
                <p className="text-slate-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}