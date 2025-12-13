import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ChevronLeft,
  Search,
  Users,
  Loader2,
  Eye,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export default function UserManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [sortBy, setSortBy] = useState('created_date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 20;

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      try {
        const currentUser = await base44.auth.me();
        if (!currentUser || currentUser.role !== 'admin') {
          window.location.href = createPageUrl('Home');
          return null;
        }
        return currentUser;
      } catch (e) {
        base44.auth.redirectToLogin(window.location.pathname);
        return null;
      }
    },
  });

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list(),
    enabled: user?.role === 'admin'
  });

  // Access control
  if (userLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-red-100 rounded-full mx-auto mb-6 flex items-center justify-center">
            <Users className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Access Denied</h2>
          <p className="text-slate-600 mb-6">
            You don't have permission to access this page. Only administrators can manage users.
          </p>
          <Link to={createPageUrl('Home')}>
            <Button>Back to Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Filter and search
  const filteredUsers = users.filter((u) => {
    const matchesSearch = 
      u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  // Sort
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    let aVal = a[sortBy];
    let bVal = b[sortBy];

    if (sortBy === 'full_name') {
      aVal = (aVal || '').toLowerCase();
      bVal = (bVal || '').toLowerCase();
    } else if (sortBy === 'created_date') {
      aVal = new Date(aVal || 0);
      bVal = new Date(bVal || 0);
    }

    if (sortOrder === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });

  // Pagination
  const totalPages = Math.ceil(sortedUsers.length / usersPerPage);
  const startIndex = (currentPage - 1) * usersPerPage;
  const paginatedUsers = sortedUsers.slice(startIndex, startIndex + usersPerPage);

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const SortIcon = ({ field }) => {
    if (sortBy !== field) return <ChevronDown className="w-4 h-4 text-slate-400" />;
    return sortOrder === 'desc' ? 
      <ChevronDown className="w-4 h-4 text-indigo-600" /> : 
      <ChevronUp className="w-4 h-4 text-indigo-600" />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200/60 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link to={createPageUrl('AdminDashboard')}>
                <Button variant="ghost" size="icon">
                  <ChevronLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl shadow-lg shadow-indigo-200">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">User Management</h1>
                <p className="text-sm text-slate-500">{sortedUsers.length} total users</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Filters */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10"
              />
            </div>
            <Select value={roleFilter} onValueChange={(value) => {
              setRoleFilter(value);
              setCurrentPage(1);
            }}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="teacher">Teacher</SelectItem>
                <SelectItem value="user">User</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Users Table */}
        {isLoading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto mb-4" />
            <p className="text-slate-600">Loading users...</p>
          </div>
        ) : paginatedUsers.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-800 mb-2">No users found</h3>
            <p className="text-slate-600">Try adjusting your search or filters</p>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th 
                        className="px-6 py-4 text-left text-sm font-semibold text-slate-700 cursor-pointer hover:bg-slate-100 transition-colors"
                        onClick={() => handleSort('full_name')}
                      >
                        <div className="flex items-center gap-2">
                          Name
                          <SortIcon field="full_name" />
                        </div>
                      </th>
                      <th 
                        className="px-6 py-4 text-left text-sm font-semibold text-slate-700 cursor-pointer hover:bg-slate-100 transition-colors"
                        onClick={() => handleSort('email')}
                      >
                        <div className="flex items-center gap-2">
                          Email
                          <SortIcon field="email" />
                        </div>
                      </th>
                      <th 
                        className="px-6 py-4 text-left text-sm font-semibold text-slate-700 cursor-pointer hover:bg-slate-100 transition-colors"
                        onClick={() => handleSort('role')}
                      >
                        <div className="flex items-center gap-2">
                          Role
                          <SortIcon field="role" />
                        </div>
                      </th>
                      <th 
                        className="px-6 py-4 text-left text-sm font-semibold text-slate-700 cursor-pointer hover:bg-slate-100 transition-colors"
                        onClick={() => handleSort('created_date')}
                      >
                        <div className="flex items-center gap-2">
                          Created Date
                          <SortIcon field="created_date" />
                        </div>
                      </th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-slate-700">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {paginatedUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                              {u.full_name?.charAt(0) || 'U'}
                            </div>
                            <div className="font-medium text-slate-800">{u.full_name || 'Unnamed User'}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-600">{u.email}</td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "px-2.5 py-1 rounded-full text-xs font-medium",
                            u.role === 'admin' 
                              ? "bg-purple-100 text-purple-700"
                              : u.role === 'teacher'
                              ? "bg-indigo-100 text-indigo-700"
                              : "bg-blue-100 text-blue-700"
                          )}>
                            {u.role === 'admin' ? 'Admin' : u.role === 'teacher' ? 'Teacher' : 'User'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-600 text-sm">
                          {u.created_date ? format(new Date(u.created_date), 'MMM d, yyyy') : 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link to={createPageUrl(`UserDetails?id=${u.id}`)}>
                            <Button size="sm" variant="outline" className="gap-2">
                              <Eye className="w-4 h-4" />
                              View
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <p className="text-sm text-slate-600">
                  Showing {startIndex + 1} to {Math.min(startIndex + usersPerPage, sortedUsers.length)} of {sortedUsers.length} users
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                          className={cn(
                            "w-10",
                            currentPage === pageNum && "bg-indigo-600 hover:bg-indigo-700"
                          )}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}