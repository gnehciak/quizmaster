import React from 'react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { ChevronRight, GraduationCap, Sparkles, Monitor, Gift, BarChart2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";

export default function Hero() {
  const plugin = React.useRef(
    Autoplay({ delay: 6000, stopOnInteraction: true })
  );

  const slides = [
    {
      id: 1,
      badge: "Premium Test Preparation",
      badgeIcon: Sparkles,
      title: (
        <>
          Master the <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">OC & Selective</span> Placement Tests
        </>
      ),
      description: "Experience the most authentic practice environment. Our platform replicates the official test UI to boost confidence and performance.",
      primaryAction: { text: "Explore Courses", link: createPageUrl('Home') + '#courses' },
      secondaryAction: { text: "See Features", link: createPageUrl('Home') + '#features' },
      image: (
        <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-bl from-indigo-50 to-white skew-x-12 translate-x-20 z-0" />
      )
    },
    {
      id: 2,
      badge: "Authentic Exam Interface",
      badgeIcon: Monitor,
      title: (
        <>
          Practice on the <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-600">Real Exam Format</span>
        </>
      ),
      description: "Don't let the interface surprise you on test day. Our system mimics the official digital test format down to the smallest detail.",
      primaryAction: { text: "Try Demo Quiz", link: createPageUrl('Home') + '#courses' }, // Linking to courses as demo usually sits there
      secondaryAction: { text: "View Features", link: createPageUrl('Home') + '#features' },
      image: (
        <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-bl from-blue-50 to-white skew-x-12 translate-x-20 z-0" />
      )
    },
    {
      id: 3,
      badge: "Free Starter Pack",
      badgeIcon: Gift,
      title: (
        <>
          Start with our <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600">Free Test Pack</span>
        </>
      ),
      description: "Get immediate access to sample tests and practice questions. No credit card required to start your journey.",
      primaryAction: { text: "Get Started Free", link: createPageUrl('Home') + '#courses' },
      secondaryAction: null,
      image: (
        <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-bl from-emerald-50 to-white skew-x-12 translate-x-20 z-0" />
      )
    },
    {
      id: 4,
      badge: "Deep Analytics",
      badgeIcon: BarChart2,
      title: (
        <>
          Visualize Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-600 to-pink-600">Progress & Growth</span>
        </>
      ),
      description: "Detailed performance breakdown, topic mastery analysis, and improvement tracking to help identify weak points.",
      primaryAction: { text: "View Analytics", link: createPageUrl('Profile') },
      secondaryAction: { text: "Learn More", link: createPageUrl('Home') + '#features' },
      image: (
        <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-bl from-rose-50 to-white skew-x-12 translate-x-20 z-0" />
      )
    }
  ];

  return (
    <div className="relative bg-white overflow-hidden border-b border-slate-100">
      <Carousel
        plugins={[plugin.current]}
        className="w-full"
        onMouseEnter={plugin.current.stop}
        onMouseLeave={plugin.current.reset}
      >
        <CarouselContent>
          {slides.map((slide) => (
            <CarouselItem key={slide.id}>
              <div className="relative h-[600px] md:h-[500px] flex items-center">
                {slide.image}
                
                <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10 w-full">
                  <div className="lg:w-2/3">
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5 }}
                    >
                      <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-sm font-medium mb-6">
                        <slide.badgeIcon className="w-4 h-4" />
                        {slide.badge}
                      </span>
                      <h1 className="text-5xl md:text-6xl font-bold text-slate-900 tracking-tight mb-6 leading-tight">
                        {slide.title}
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
          ))}
        </CarouselContent>
        <div className="absolute bottom-8 right-8 flex gap-2 z-20">
          <CarouselPrevious className="static translate-y-0 translate-x-0 h-12 w-12 border-slate-200 bg-white/80 hover:bg-white" />
          <CarouselNext className="static translate-y-0 translate-x-0 h-12 w-12 border-slate-200 bg-white/80 hover:bg-white" />
        </div>
      </Carousel>
    </div>
  );
}