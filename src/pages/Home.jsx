import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, BookOpen, PenTool, GraduationCap, Edit, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Hero from '@/components/home/Hero';
// import StatsSection from '@/components/home/StatsSection'; // Removed as requested
import KeyFeatures from '@/components/home/KeyFeatures';
import BundlesSection from '@/components/home/BundlesSection';
import CourseSection from '@/components/home/CourseSection';
import FeatureShowcase from '@/components/home/FeatureShowcase';
import ContactFooter from '@/components/home/ContactFooter';

export default function Home() {
  const [searchTerm, setSearchTerm] = useState('');

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      try {
        return await base44.auth.me();
      } catch (e) {
        return null;
      }
    }
  });

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ['courses'],
    queryFn: () => base44.entities.Course.list('-created_date')
  });

  const { data: accessList = [], isLoading: accessLoading } = useQuery({
    queryKey: ['myCourseAccess', user?.email],
    queryFn: () => base44.entities.CourseAccess.filter({ user_email: user?.email }),
    enabled: !!user?.email
  });

  // Site Config for Home Page
  const { data: siteConfig, isLoading: configLoading } = useQuery({
    queryKey: ['siteConfig', 'home'],
    queryFn: async () => {
      const configs = await base44.entities.SiteConfig.filter({ key: 'home' });
      return configs[0] || { key: 'home', content: {} };
    }
  });

  const updateConfigMutation = useQueryClient().getMutationCache().find({ mutationKey: ['updateSiteConfig'] }) || 
    useMutation({
      mutationFn: async (newContent) => {
        const configs = await base44.entities.SiteConfig.filter({ key: 'home' });
        if (configs.length > 0) {
          return base44.entities.SiteConfig.update(configs[0].id, { content: newContent });
        } else {
          return base44.entities.SiteConfig.create({ key: 'home', content: newContent });
        }
      },
      onSuccess: () => {
        useQueryClient().invalidateQueries({ queryKey: ['siteConfig', 'home'] });
      }
    });

  const [editMode, setEditMode] = useState(false);
  const [tempContent, setTempContent] = useState(null);

  React.useEffect(() => {
    if (siteConfig) {
      setTempContent(siteConfig.content);
    }
  }, [siteConfig]);

  const handleUpdateSection = (sectionKey, sectionData) => {
    const newContent = { ...tempContent, [sectionKey]: sectionData };
    setTempContent(newContent);
    // Auto-save or wait for save button? Let's auto-save for smoother experience or provide save button.
    // Given "comprehensive", explicit save is safer.
  };

  const handleSaveConfig = async () => {
    await updateConfigMutation.mutateAsync(tempContent);
    setEditMode(false);
  };

  const accessMap = React.useMemo(() => {
    const map = {};
    if (accessList) {
      accessList.forEach(a => {
        map[a.course_id] = true;
      });
    }
    return map;
  }, [accessList]);

  // Filter courses based on user role and visibility
  const visibleCourses = courses.filter(course => {
    if (user?.role === 'admin') return true;
    if (course.visibility === 'admin') return false;
    if (course.visibility === 'private') {
      return course.created_by === user?.email;
    }
    return true;
  });

  const ocCourses = visibleCourses.filter(c => 
    c.title.toLowerCase().includes('oc') || 
    c.category?.toLowerCase().includes('oc') || 
    c.category?.toLowerCase().includes('opportunity class')
  );

  const selectiveCourses = visibleCourses.filter(c => 
    c.title.toLowerCase().includes('selective') || 
    c.category?.toLowerCase().includes('selective')
  );

  const otherCourses = visibleCourses.filter(c => 
    !ocCourses.includes(c) && !selectiveCourses.includes(c)
  );

  if (isLoading || accessLoading || configLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col relative">
      {user?.role === 'admin' && (
        <div className="fixed bottom-6 right-6 z-[100] flex gap-2">
          {editMode ? (
            <>
              <Button onClick={() => setEditMode(false)} variant="outline" className="shadow-lg bg-white">
                <X className="w-4 h-4 mr-2" /> Cancel
              </Button>
              <Button onClick={handleSaveConfig} className="shadow-lg bg-green-600 hover:bg-green-700">
                <Save className="w-4 h-4 mr-2" /> Save Changes
              </Button>
            </>
          ) : (
            <Button onClick={() => setEditMode(true)} className="shadow-lg bg-slate-900 text-white">
              <Edit className="w-4 h-4 mr-2" /> Edit Page
            </Button>
          )}
        </div>
      )}

      <Hero 
        content={editMode ? tempContent?.hero : (siteConfig?.content?.hero)} 
        onUpdate={(data) => handleUpdateSection('hero', data)}
        editMode={editMode}
      />
      {/* StatsSection removed */}
      <KeyFeatures />
      <BundlesSection />
      <FeatureShowcase />
      
      <div id="courses">
        <CourseSection 
          title="OC Reading Trial Test" 
          description="Comprehensive preparation for Opportunity Class placement with focus on reading comprehension and critical thinking."
          courses={ocCourses}
          accessMap={accessMap}
          icon={BookOpen}
          color="indigo"
        />

        <CourseSection 
          title="Selective Reading & Writing" 
          description="Advanced trial tests and classes designed for Selective High School placement success."
          courses={selectiveCourses}
          accessMap={accessMap}
          icon={PenTool}
          color="purple"
        />

        {otherCourses.length > 0 && (
          <CourseSection 
            title="More Courses" 
            description="Explore our range of general knowledge and skill-building courses."
            courses={otherCourses}
            accessMap={accessMap}
            icon={GraduationCap}
            color="emerald"
          />
        )}
      </div>

      <ContactFooter />
    </div>
  );
}