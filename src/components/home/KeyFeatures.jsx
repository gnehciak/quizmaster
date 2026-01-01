import React from 'react';
import { Calendar, ShieldCheck, Heart } from 'lucide-react';

export default function KeyFeatures() {
  const features = [
    {
      title: 'Latest 2025 Exam Patterns',
      description: 'Stay ahead with the most current exam formats, question types, and assessment criteria. Our preparation programs are continuously updated for 2025.',
      icon: Calendar,
      color: 'bg-blue-100 text-blue-600',
    },
    {
      title: 'Try Free Tests First - Zero Risk',
      description: 'Experience our proven teaching methodology with free mock tests before purchasing. No credit card required. Access expert-designed practice tests.',
      icon: ShieldCheck,
      color: 'bg-green-100 text-green-600',
    },
    {
      title: 'Trusted by Families Australia-wide',
      description: 'Trusted by 800+ families across Australia in Sydney, Melbourne, Brisbane & online. Verified 4.9/5 parent rating with proven exam preparation methodology.',
      icon: Heart,
      color: 'bg-rose-100 text-rose-600',
    },
  ];

  return (
    <div className="py-20 bg-white" id="features">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">Key Features</h2>
          <p className="text-lg text-slate-600">
            Why parents and students choose our platform for exam success.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="bg-slate-50 rounded-2xl p-8 border border-slate-100 hover:shadow-lg transition-shadow">
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-6 ${feature.color}`}>
                <feature.icon className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-4">{feature.title}</h3>
              <p className="text-slate-600 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}