import React, { useState } from 'react';
import { Check, ArrowRight, Edit, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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

const DEFAULT_BUNDLES = [
  {
    title: "Opportunity Class Super Pack",
    price: "240",
    originalPrice: "399",
    discount: "40% OFF",
    features: [
      "20 Reading Comprehension Tests",
      "30 Mathematical Reasoning Tests",
      "36 Thinking Skills Tests",
      "100+ Non-Verbal Reasoning Lessons",
      "150+ Daily Paragraph Editing Exercises",
      "Foundation + Advanced Vocabulary",
      "Detailed explanations for every question"
    ],
    color: "indigo",
    popular: true
  },
  {
    title: "Selective Test Super Pack",
    price: "300",
    originalPrice: "499",
    discount: "40% OFF",
    features: [
      "20 Reading Comprehension Tests",
      "30 Mathematical Reasoning Tests",
      "30 Thinking Skills Tests",
      "50 Writing Prompts with feedback",
      "AI-powered Writing Assessment Tool",
      "100+ Non-Verbal Reasoning Lessons",
      "Full preparation in one pack"
    ],
    color: "purple",
    popular: true
  },
  {
    title: "Selective Writing Super Pack",
    price: "180",
    originalPrice: "299",
    discount: "40% OFF",
    features: [
      "38 Expert Writing Prompts",
      "Aligned with NSW Selective format",
      "20 advanced writing tasks",
      "Band 6 model samples",
      "AI-powered Writing Assessment Tool",
      "Foundation + Advanced Vocabulary",
      "180 Days of Unlimited Access"
    ],
    color: "rose",
    popular: false
  }
];

export default function BundlesSection({ content, onUpdate, editMode }) {
  const bundles = content?.bundles || DEFAULT_BUNDLES;
  const title = content?.title || "Popular Exam Preparation Courses";
  const subtitle = content?.subtitle || "Comprehensive bundles designed to give your child the advantage.";
  const badgeText = content?.badgeText || "Most Popular";

  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const handleUpdateBundle = (index, field, value) => {
    const newBundles = [...bundles];
    newBundles[index] = { ...newBundles[index], [field]: value };
    onUpdate({ bundles: newBundles, title, subtitle, badgeText });
  };

  const handleUpdateFeatures = (index, featureIndex, value) => {
    const newBundles = [...bundles];
    const newFeatures = [...newBundles[index].features];
    newFeatures[featureIndex] = value;
    newBundles[index].features = newFeatures;
    onUpdate({ bundles: newBundles, title, subtitle, badgeText });
  };

  const handleAddFeature = (index) => {
    const newBundles = [...bundles];
    newBundles[index].features.push("New feature");
    onUpdate({ bundles: newBundles, title, subtitle, badgeText });
  };

  const handleRemoveFeature = (index, featureIndex) => {
    const newBundles = [...bundles];
    newBundles[index].features = newBundles[index].features.filter((_, i) => i !== featureIndex);
    onUpdate({ bundles: newBundles, title, subtitle, badgeText });
  };

  const handleAddBundle = () => {
    const newBundle = {
      title: "New Bundle",
      price: "0",
      originalPrice: "0",
      discount: "0% OFF",
      features: ["Feature 1"],
      color: "indigo",
      popular: false
    };
    onUpdate({ bundles: [...bundles, newBundle], title, subtitle, badgeText });
  };

  const handleDeleteBundle = (index) => {
    const newBundles = bundles.filter((_, i) => i !== index);
    onUpdate({ bundles: newBundles, title, subtitle, badgeText });
  };

  const handleHeaderUpdate = (field, value) => {
    onUpdate({ bundles, title, subtitle, badgeText, [field]: value });
  };

  return (
    <div className="py-24 bg-slate-50 relative group/bundles">
      {editMode && (
        <div className="absolute top-4 right-4 z-10">
          <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="secondary" className="shadow-lg gap-2">
                <Edit className="w-4 h-4" /> Edit Bundles
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Bundles Section</DialogTitle>
              </DialogHeader>
              <div className="space-y-6 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label>Badge Text</Label>
                    <Input value={badgeText} onChange={(e) => handleHeaderUpdate('badgeText', e.target.value)} />
                  </div>
                  <div className="col-span-2">
                    <Label>Title</Label>
                    <Input value={title} onChange={(e) => handleHeaderUpdate('title', e.target.value)} />
                  </div>
                  <div className="col-span-2">
                    <Label>Subtitle</Label>
                    <Textarea value={subtitle} onChange={(e) => handleHeaderUpdate('subtitle', e.target.value)} />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Label className="text-lg font-semibold">Bundles List</Label>
                    <Button size="sm" onClick={handleAddBundle} variant="outline" className="gap-2">
                      <Plus className="w-4 h-4" /> Add Bundle
                    </Button>
                  </div>

                  <div className="grid gap-6">
                    {bundles.map((bundle, index) => (
                      <div key={index} className="p-4 border rounded-lg space-y-4 bg-slate-50 relative">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                          onClick={() => handleDeleteBundle(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="col-span-2">
                            <Label>Bundle Title</Label>
                            <Input value={bundle.title} onChange={(e) => handleUpdateBundle(index, 'title', e.target.value)} />
                          </div>
                          <div>
                            <Label>Price</Label>
                            <Input value={bundle.price} onChange={(e) => handleUpdateBundle(index, 'price', e.target.value)} />
                          </div>
                          <div>
                            <Label>Original Price</Label>
                            <Input value={bundle.originalPrice} onChange={(e) => handleUpdateBundle(index, 'originalPrice', e.target.value)} />
                          </div>
                          <div>
                            <Label>Discount Label</Label>
                            <Input value={bundle.discount} onChange={(e) => handleUpdateBundle(index, 'discount', e.target.value)} />
                          </div>
                          <div>
                            <Label>Color (indigo, purple, rose)</Label>
                            <Input value={bundle.color} onChange={(e) => handleUpdateBundle(index, 'color', e.target.value)} />
                          </div>
                          <div className="flex items-center gap-2">
                            <input 
                              type="checkbox" 
                              checked={bundle.popular} 
                              onChange={(e) => handleUpdateBundle(index, 'popular', e.target.checked)}
                              className="w-4 h-4"
                            />
                            <Label>Mark as Popular/Best Seller</Label>
                          </div>
                        </div>

                        <div>
                          <Label>Features</Label>
                          <div className="space-y-2 mt-2">
                            {bundle.features.map((feature, fIndex) => (
                              <div key={fIndex} className="flex gap-2">
                                <Input value={feature} onChange={(e) => handleUpdateFeatures(index, fIndex, e.target.value)} />
                                <Button size="icon" variant="ghost" onClick={() => handleRemoveFeature(index, fIndex)} className="text-red-500">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            ))}
                            <Button size="sm" variant="outline" onClick={() => handleAddFeature(index)} className="mt-2">
                              <Plus className="w-3 h-3 mr-1" /> Add Feature
                            </Button>
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 mb-4 px-4 py-1 text-sm">
            {badgeText}
          </Badge>
          <h2 className="text-4xl font-bold text-slate-900 mb-6">
            {title}
          </h2>
          <p className="text-xl text-slate-600">
            {subtitle}
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {bundles.map((bundle, index) => (
            <div 
              key={index} 
              className={`bg-white rounded-3xl border-2 p-8 flex flex-col relative hover:shadow-2xl transition-all duration-300 ${
                bundle.popular ? 'border-indigo-600 shadow-xl' : 'border-slate-200'
              }`}
            >
              {bundle.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-indigo-600 text-white px-4 py-1 rounded-full text-sm font-bold shadow-lg">
                  Best Seller
                </div>
              )}
              
              <div className="mb-8">
                <div className="flex justify-between items-start mb-4">
                  <Badge variant="destructive" className="font-bold">
                    {bundle.discount}
                  </Badge>
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-4 leading-tight">
                  {bundle.title}
                </h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-extrabold text-slate-900">
                    AUD ${bundle.price}
                  </span>
                  <span className="text-lg text-slate-400 line-through font-medium">
                    ${bundle.originalPrice}
                  </span>
                </div>
                <p className="text-sm text-slate-500 mt-2">6 months access</p>
              </div>

              <div className="space-y-4 mb-8 flex-1">
                <p className="font-semibold text-slate-900">What's Included:</p>
                {bundle.features.map((feature, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className={`mt-1 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 bg-${bundle.color}-100 text-${bundle.color}-600`}>
                      <Check className="w-3 h-3" />
                    </div>
                    <span className="text-slate-600 text-sm leading-relaxed">{feature}</span>
                  </div>
                ))}
              </div>

              <Button className="w-full py-6 text-lg font-semibold shadow-lg hover:shadow-xl transition-all">
                Enroll Now
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}