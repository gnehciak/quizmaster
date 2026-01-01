import React from 'react';
import { Monitor, MousePointerClick, CheckCircle, Smartphone } from 'lucide-react';

export default function FeatureShowcase() {
  return (
    <section id="features" className="py-24 bg-slate-900 text-white overflow-hidden relative">
      {/* Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-20 pointer-events-none">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-500 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-24 w-72 h-72 bg-purple-500 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Designed to Match the Real Thing</h2>
          <p className="text-lg text-slate-300">
            Don't let the exam format surprise you. Our platform mirrors the official digital test interface so you can focus on the questions, not the tools.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div className="space-y-12">
            <div className="flex gap-6">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center flex-shrink-0 text-indigo-400 border border-indigo-500/30">
                <Monitor className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-3">Authentic Exam Interface</h3>
                <p className="text-slate-400 leading-relaxed">
                  Familiarize yourself with the exact layout, navigation, and tools used in the official OC and Selective placement tests. Zero learning curve on exam day.
                </p>
              </div>
            </div>

            <div className="flex gap-6">
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center flex-shrink-0 text-purple-400 border border-purple-500/30">
                <MousePointerClick className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-3">Interactive Question Types</h3>
                <p className="text-slate-400 leading-relaxed">
                  Practice with drag-and-drop, inline choice, and split-screen reading comprehension questions just like the real test.
                </p>
              </div>
            </div>

            <div className="flex gap-6">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0 text-emerald-400 border border-emerald-500/30">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-3">Instant Feedback & Analytics</h3>
                <p className="text-slate-400 leading-relaxed">
                  Get immediate results and detailed explanations. Track progress over time to identify strengths and weaknesses.
                </p>
              </div>
            </div>
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
            <div className="absolute -bottom-6 -right-6 bg-white text-slate-900 p-4 rounded-xl shadow-xl border border-slate-100 flex items-center gap-3 animate-bounce duration-[3000ms]">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-sm">Responsive Design</div>
                <div className="text-xs text-slate-500">Works on all devices</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}