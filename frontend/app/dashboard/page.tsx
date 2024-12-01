import React from 'react';
import { DndContext, DragOverlay, MeasuringStrategy } from '@dnd-kit/core';
import { SortableContext } from '@dnd-kit/sortable';
import { Search, GripVertical } from 'lucide-react';
import { SemesterContainer } from '@/components/Dashboard/SemesterContainer';

const DashboardDemo = () => {
  // Mock data
  const containers = ['Search Results', 'Fall 2024', 'Spring 2025', 'Fall 2025', 'Spring 2026'];
  const items = {
    'Search Results': ['COS126|COS', 'COS226|COS'],
    'Fall 2024': ['ELE301|ELE'],
    'Spring 2025': ['COS333|COS'],
    'Fall 2025': [],
    'Spring 2026': ['COS426|COS'],
  };

  // Mock course data
  const courses = {
    'COS126|COS': { title: 'Computer Science: An Interdisciplinary Approach' },
    'COS226|COS': { title: 'Algorithms and Data Structures' },
    'ELE301|ELE': { title: 'Signals and Systems' },
    'COS333|COS': { title: 'Advanced Programming Techniques' },
    'COS426|COS': { title: 'Computer Graphics' },
  };

  return (
    <main className="flex flex-grow z-10 rounded pt-0.5vh pb-0.5vh pl-0.5vw pr-0.5vw">
      <div className="flex flex-row items-start w-full gap-4">
        {/* Search Results Column */}
        <div className="w-96">
          <SemesterContainer
            id="Search Results"
            items={items['Search Results']}
            label={
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4" />
                <span>Search Results</span>
              </div>
            }
            scrollable
            shadow
            className="h-[calc(100vh-8rem)]"
          >
            {items['Search Results'].map((courseId) => (
              <div key={courseId} className="bg-white p-3 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2">
                  <GripVertical className="h-4 w-4 text-gray-400" />
                  <span>{courses[courseId].title}</span>
                </div>
              </div>
            ))}
          </SemesterContainer>
        </div>

        {/* Semester Grid */}
        <div className="flex-1 grid grid-cols-2 gap-4 auto-rows-fr">
          {containers
            .filter(id => id !== 'Search Results')
            .map((semesterId) => (
              <SemesterContainer
                key={semesterId}
                id={semesterId}
                items={items[semesterId]}
                label={semesterId}
                scrollable
                shadow
                className="h-[calc((100vh-8rem)/4)]"
              >
                {items[semesterId].map((courseId) => (
                  <div key={courseId} className="bg-white p-3 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 text-gray-400" />
                      <span>{courses[courseId].title}</span>
                    </div>
                  </div>
                ))}
              </SemesterContainer>
            ))}
        </div>

        {/* Requirements Panel */}
        <div className="w-80 bg-white rounded-lg shadow-md">
          <div className="p-4 border-b">
            <h2 className="font-semibold">Requirements</h2>
          </div>
          <div className="p-4">
            <div className="space-y-2">
              <div className="h-8 bg-gray-100 rounded w-full" />
              <div className="h-8 bg-gray-100 rounded w-full" />
              <div className="h-8 bg-gray-100 rounded w-full" />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default DashboardDemo;