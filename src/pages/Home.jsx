import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Loader2, BookOpen, PenTool, GraduationCap } from 'lucide-react';
import Hero from '@/components/home/Hero';
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

  if (isLoading || accessLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Hero />
      
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

      <FeatureShowcase />
      
      <ContactFooter />
    </div>
  );
}