import React from 'react';
import { Check, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function BundlesSection() {
  const bundles = [
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

  return (
    <div className="py-24 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 mb-4 px-4 py-1 text-sm">
            Most Popular
          </Badge>
          <h2 className="text-4xl font-bold text-slate-900 mb-6">
            Popular Exam Preparation Courses
          </h2>
          <p className="text-xl text-slate-600">
            Comprehensive bundles designed to give your child the advantage.
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