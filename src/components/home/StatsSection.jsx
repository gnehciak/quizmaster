import React from 'react';
import { Users, Star, FileCheck, Award } from 'lucide-react';

export default function StatsSection() {
  const stats = [
    { label: 'Families Served', value: '800+', icon: Users },
    { label: 'Parent Rating', value: '4.9/5', icon: Star },
    { label: 'Practice Tests', value: '400+', icon: FileCheck },
    { label: 'Verified Reviews', value: '42+', icon: Award },
  ];

  return (
    <div className="bg-indigo-600 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <div key={index} className="text-center text-white">
              <div className="flex justify-center mb-4">
                <stat.icon className="w-8 h-8 text-indigo-200" />
              </div>
              <div className="text-4xl font-bold mb-2">{stat.value}</div>
              <div className="text-indigo-100 font-medium">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}