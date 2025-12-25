import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User, LogOut, Settings, BarChart3, Users, BookOpen, FileQuestion } from 'lucide-react';

export default function Layout({ children, currentPageName }) {
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

  const handleLogout = () => {
    base44.auth.logout();
  };

  const handleLogin = () => {
    base44.auth.redirectToLogin();
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation */}
      {currentPageName !== 'TakeQuiz' && currentPageName !== 'ReviewAnswers' && (
        <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between h-16">
              <Link to={createPageUrl('Home')} className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                  Q
                </div>
                <span className="text-xl font-bold text-slate-800">QuizMaster</span>
              </Link>

              <div className="flex items-center gap-4">
                <Link to={createPageUrl('Home')}>
                  <Button variant="ghost" size="sm">
                    Courses
                  </Button>
                </Link>

                {user ? (
                  <>
                    <Link to={createPageUrl('MyCourses')}>
                      <Button variant="ghost" size="sm">
                        My Courses
                      </Button>
                    </Link>

                    <Link to={createPageUrl('Profile')}>
                      <Button variant="ghost" size="sm">
                        My Progress
                      </Button>
                    </Link>

                    {(user.role === 'admin' || user.role === 'teacher') && (
                      <>
                        <Link to={createPageUrl('ManageCourses')}>
                          <Button variant="ghost" size="sm" className="gap-2">
                            <BookOpen className="w-4 h-4" />
                            Manage Courses
                          </Button>
                        </Link>
                        <Link to={createPageUrl('ManageQuizzes')}>
                          <Button variant="ghost" size="sm" className="gap-2">
                            <FileQuestion className="w-4 h-4" />
                            Manage Quizzes
                          </Button>
                        </Link>
                      </>
                    )}

                    {user.role === 'admin' && (
                      <Link to={createPageUrl('AdminDashboard')}>
                        <Button variant="ghost" size="sm" className="gap-2">
                          <Settings className="w-4 h-4" />
                          Admin
                        </Button>
                      </Link>
                    )}

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="rounded-full">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                            {user.full_name?.charAt(0) || 'U'}
                          </div>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <div className="px-2 py-1.5">
                          <p className="text-sm font-medium text-slate-800">{user.full_name}</p>
                          <p className="text-xs text-slate-500">{user.email}</p>
                        </div>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link to={createPageUrl('MyCourses')} className="cursor-pointer">
                            <BookOpen className="w-4 h-4 mr-2" />
                            My Courses
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to={createPageUrl('Profile')} className="cursor-pointer">
                            <User className="w-4 h-4 mr-2" />
                            Profile
                          </Link>
                        </DropdownMenuItem>
                        {user.role === 'admin' && (
                          <>
                            <DropdownMenuItem asChild>
                              <Link to={createPageUrl('AdminDashboard')} className="cursor-pointer">
                                <BarChart3 className="w-4 h-4 mr-2" />
                                Admin Dashboard
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link to={createPageUrl('UserManagement')} className="cursor-pointer">
                                <Users className="w-4 h-4 mr-2" />
                                Users
                              </Link>
                            </DropdownMenuItem>
                          </>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                          <LogOut className="w-4 h-4 mr-2" />
                          Sign Out
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                ) : (
                  <Button onClick={handleLogin} size="sm">
                    Sign In
                  </Button>
                )}
              </div>
            </div>
          </div>
        </nav>
      )}

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}