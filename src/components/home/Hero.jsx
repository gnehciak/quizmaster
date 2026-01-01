import React from 'react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { ChevronRight, GraduationCap, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function Hero() {
  return (
    <div className="relative bg-white overflow-hidden">
      <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-bl from-indigo-50 to-white skew-x-12 translate-x-20 z-0" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        <div className="pt-20 pb-24 md:pt-32 md:pb-40">
          <div className="lg:w-2/3">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-sm font-medium mb-6">
                <Sparkles className="w-4 h-4" />
                Premium Test Preparation
              </span>
              <h1 className="text-5xl md:text-6xl font-bold text-slate-900 tracking-tight mb-6 leading-tight">
                Master the <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">OC & Selective</span> Placement Tests
              </h1>
              <p className="text-xl text-slate-600 mb-8 max-w-2xl leading-relaxed">
                Experience the most authentic practice environment. Our platform replicates the official test UI to boost confidence and performance.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link to={createPageUrl('Home') + '#courses'}>
                  <Button size="lg" className="h-14 px-8 text-lg bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-200">
                    Explore Courses
                    <ChevronRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
                <Link to={createPageUrl('Home') + '#features'}>
                  <Button size="lg" variant="outline" className="h-14 px-8 text-lg bg-white/80 backdrop-blur border-slate-200">
                    See Features
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}