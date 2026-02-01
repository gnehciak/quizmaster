import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Edit, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Hero from '@/components/home/Hero';
import CourseCodeSection from '@/components/home/CourseCodeSection';
import KeyFeatures from '@/components/home/KeyFeatures';
import BundlesSection from '@/components/home/BundlesSection';
import CourseSection from '@/components/home/CourseSection';
import FeatureShowcase from '@/components/home/FeatureShowcase';
import ContactFooter from '@/components/home/ContactFooter';

export default function Home() {
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

  const { data: categories = [] } = useQuery({
    queryKey: ['courseCategories'],
    queryFn: () => base44.entities.CourseCategory.list(),
  });

  // Site Config for Home Page
  const { data: siteConfig, isLoading: configLoading } = useQuery({
    queryKey: ['siteConfig', 'home'],
    queryFn: async () => {
      const configs = await base44.entities.SiteConfig.filter({ key: 'home' });
      return configs[0] || { key: 'home', content: {} };
    }
  });

  const queryClient = useQueryClient();
  
  const updateConfigMutation = useMutation({
    mutationFn: async (newContent) => {
      const configs = await base44.entities.SiteConfig.filter({ key: 'home' });
      if (configs.length > 0) {
        return base44.entities.SiteConfig.update(configs[0].id, { content: newContent });
      } else {
        return base44.entities.SiteConfig.create({ key: 'home', content: newContent });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['siteConfig', 'home'] });
    }
  });

  const [editMode, setEditMode] = useState(false);
  const [tempContent, setTempContent] = useState({});

  React.useEffect(() => {
    if (siteConfig?.content) {
      setTempContent(siteConfig.content);
    }
  }, [siteConfig]);

  const handleUpdateSection = (sectionKey, sectionData) => {
    const newContent = { ...tempContent, [sectionKey]: sectionData };
    setTempContent(newContent);
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

  // Helper to get section config or defaults for course sections
  const getSectionConfig = (key, defaultTitle, defaultDesc, defaultIcon, defaultColor) => {
    return tempContent[key] || {
      title: defaultTitle,
      description: defaultDesc,
      iconName: defaultIcon,
      color: defaultColor
    };
  };

  const ocConfig = getSectionConfig('ocSection', 'OC Reading Trial Test', 'Comprehensive preparation for Opportunity Class placement with focus on reading comprehension and critical thinking.', 'BookOpen', 'indigo');
  const selConfig = getSectionConfig('selectiveSection', 'Selective Reading & Writing', 'Advanced trial tests and classes designed for Selective High School placement success.', 'PenTool', 'purple');
  const otherConfig = getSectionConfig('otherSection', 'More Courses', 'Explore our range of general knowledge and skill-building courses.', 'GraduationCap', 'emerald');

  const getSectionCourses = (config, defaultCourses) => {
    if (config?.categoryFilter && config.categoryFilter !== 'all') {
      return visibleCourses.filter(c => c.category === config.categoryFilter);
    }
    return defaultCourses;
  };

  const ocSectionCourses = getSectionCourses(ocConfig, ocCourses);
  const selSectionCourses = getSectionCourses(selConfig, selectiveCourses);
  const otherSectionCourses = getSectionCourses(otherConfig, otherCourses);

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
        content={editMode ? tempContent.hero : (siteConfig?.content?.hero)} 
        onUpdate={(data) => handleUpdateSection('hero', data)}
        editMode={editMode}
      />
      
      <CourseCodeSection user={user} />
      
      <KeyFeatures 
        content={editMode ? tempContent.keyFeatures : (siteConfig?.content?.keyFeatures)}
        onUpdate={(data) => handleUpdateSection('keyFeatures', data)}
        editMode={editMode}
      />
      
      <BundlesSection 
        content={editMode ? tempContent.bundles : (siteConfig?.content?.bundles)}
        onUpdate={(data) => handleUpdateSection('bundles', data)}
        editMode={editMode}
      />
      
      <FeatureShowcase 
        content={editMode ? tempContent.featureShowcase : (siteConfig?.content?.featureShowcase)}
        onUpdate={(data) => handleUpdateSection('featureShowcase', data)}
        editMode={editMode}
      />
      
      <div id="courses">
        <CourseSection 
          {...ocConfig}
          courses={ocSectionCourses}
          categories={categories}
          accessMap={accessMap}
          onUpdate={(data) => handleUpdateSection('ocSection', data)}
          editMode={editMode}
        />

        <CourseSection 
          {...selConfig}
          courses={selSectionCourses}
          categories={categories}
          accessMap={accessMap}
          onUpdate={(data) => handleUpdateSection('selectiveSection', data)}
          editMode={editMode}
        />

        {(otherSectionCourses.length > 0 || editMode) && (
          <CourseSection 
            {...otherConfig}
            courses={otherSectionCourses}
            categories={categories}
            accessMap={accessMap}
            onUpdate={(data) => handleUpdateSection('otherSection', data)}
            editMode={editMode}
          />
        )}
      </div>

      <ContactFooter 
        content={editMode ? tempContent.contactFooter : (siteConfig?.content?.contactFooter)}
        onUpdate={(data) => handleUpdateSection('contactFooter', data)}
        editMode={editMode}
      />
    </div>
  );
}