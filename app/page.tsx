'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { ChevronDown, Grid3x3, List, Play, X } from 'lucide-react';

// Initialize Supabase with environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check .env.local');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface Project {
  id: string;
  title: string;
  category: string;
  subcategory: string;
  type: 'image' | 'video' | 'website';
  thumbnail: string;
  media: string;
  description: string;
}

interface CategoryStructure {
  [key: string]: string[];
}

const categoryStructure: CategoryStructure = {
  'AI': ['AI Commercials', 'AI UGC'],
  'Websites': [],
  'Images': []
};

export default function Portfolio() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedCategory, setSelectedCategory] = useState('AI');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>('AI Commercials');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProjects();
  }, [selectedCategory, selectedSubcategory]);

  const fetchProjects = async () => {
    setIsLoading(true);
    setError(null);
    try {
      let query = supabase.from('projects').select('*');
      
      if (selectedCategory && selectedSubcategory) {
        query = query
          .eq('category', selectedCategory)
          .eq('subcategory', selectedSubcategory);
      } else if (selectedCategory) {
        query = query.eq('category', selectedCategory);
      }

      const { data, error: supabaseError } = await query.order('created_at', { ascending: false });
      
      if (supabaseError) {
        console.error('Supabase error:', supabaseError);
        setError('Failed to load projects. Check console.');
        setProjects([]);
      } else {
        setProjects(data || []);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      setError('Error loading projects');
      setProjects([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredProjects = selectedSubcategory 
    ? projects.filter(p => p.subcategory === selectedSubcategory)
    : projects.filter(p => p.category === selectedCategory);

  const hasSubcategories = categoryStructure[selectedCategory]?.length > 0;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-black tracking-tight">Portfolio</h1>
            
            {/* View Toggle */}
            <div className="flex gap-2 bg-gray-50 p-1 rounded-lg border border-gray-200">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-black text-white'
                    : 'text-gray-600 hover:text-black'
                }`}
                title="Grid view"
              >
                <Grid3x3 size={20} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded transition-colors ${
                  viewMode === 'list'
                    ? 'bg-black text-white'
                    : 'text-gray-600 hover:text-black'
                }`}
                title="List view"
              >
                <List size={20} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-100 sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 py-4 overflow-x-auto">
            {Object.keys(categoryStructure).map((cat) => (
              <div key={cat} className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => {
                    setSelectedCategory(cat);
                    setSelectedSubcategory(
                      categoryStructure[cat]?.[0] || null
                    );
                    setShowCategoryMenu(false);
                  }}
                  className={`px-4 py-2 rounded-lg font-medium transition-all text-sm whitespace-nowrap ${
                    selectedCategory === cat
                      ? 'bg-black text-white'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {cat}
                </button>

                {/* Subcategories dropdown */}
                {hasSubcategories && selectedCategory === cat && (
                  <div className="relative">
                    <button
                      onClick={() => setShowCategoryMenu(!showCategoryMenu)}
                      className="p-2 text-gray-600 hover:text-black transition-colors"
                    >
                      <ChevronDown size={18} className={showCategoryMenu ? 'rotate-180' : ''} />
                    </button>
                    
                    {showCategoryMenu && (
                      <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg py-2 z-50">
                        {categoryStructure[cat].map((subcat) => (
                          <button
                            key={subcat}
                            onClick={() => {
                              setSelectedSubcategory(subcat);
                              setShowCategoryMenu(false);
                            }}
                            className={`block w-full text-left px-4 py-2 text-sm transition-colors ${
                              selectedSubcategory === subcat
                                ? 'bg-gray-100 text-black font-medium'
                                : 'text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            {subcat}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
            <p className="text-red-800 text-sm">{error}</p>
            <p className="text-red-700 text-xs mt-2">Check browser console (F12) for details</p>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-400">Loading projects...</div>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-400 text-center">
              <p className="mb-2">No projects in this category yet</p>
              <p className="text-sm">Add projects via Supabase SQL Editor</p>
            </div>
          </div>
        ) : (
          <>
            {/* Grid View */}
            {viewMode === 'grid' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProjects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onClick={() => setSelectedProject(project)}
                  />
                ))}
              </div>
            )}

            {/* List View */}
            {viewMode === 'list' && (
              <div className="space-y-3">
                {filteredProjects.map((project) => (
                  <ProjectListItem
                    key={project.id}
                    project={project}
                    onClick={() => setSelectedProject(project)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* Project Modal */}
      {selectedProject && (
        <ProjectModal
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
        />
      )}
    </div>
  );
}

function ProjectCard({ project, onClick }: { project: Project; onClick: () => void }) {
  const isVideo = project.type === 'video';

  return (
    <button
      onClick={onClick}
      className="group bg-white rounded-lg border border-gray-200 overflow-hidden hover:border-gray-300 hover:shadow-lg transition-all duration-300 text-left"
    >
      <div className="relative bg-gray-100 aspect-video overflow-hidden">
        <img
          src={project.thumbnail}
          alt={project.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {isVideo && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all">
            <div className="bg-black text-white p-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
              <Play size={20} fill="white" />
            </div>
          </div>
        )}
      </div>
      <div className="p-4">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-2">
          {project.subcategory || project.category}
        </p>
        <h3 className="font-semibold text-black text-sm line-clamp-2 group-hover:text-gray-700 transition-colors">
          {project.title}
        </h3>
        {project.description && (
          <p className="text-gray-600 text-xs mt-2 line-clamp-2">
            {project.description}
          </p>
        )}
      </div>
    </button>
  );
}

function ProjectListItem({ project, onClick }: { project: Project; onClick: () => void }) {
  const isVideo = project.type === 'video';

  return (
    <button
      onClick={onClick}
      className="w-full bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 hover:shadow-md transition-all text-left group flex gap-4"
    >
      <div className="relative bg-gray-100 rounded w-24 h-24 flex-shrink-0 overflow-hidden">
        <img
          src={project.thumbnail}
          alt={project.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {isVideo && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all">
            <Play size={16} className="text-white opacity-0 group-hover:opacity-100" fill="white" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">
          {project.subcategory || project.category}
        </p>
        <h3 className="font-semibold text-black text-sm mb-1">
          {project.title}
        </h3>
        {project.description && (
          <p className="text-gray-600 text-sm line-clamp-2">
            {project.description}
          </p>
        )}
      </div>
    </button>
  );
}

function ProjectModal({ project, onClose }: { project: Project; onClose: () => void }) {
  const isVideo = project.type === 'video';

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <X size={20} />
        </button>

        {/* Media */}
        <div className="bg-gray-100 aspect-video relative">
          {isVideo ? (
            <video
              src={project.media}
              controls
              autoPlay
              className="w-full h-full object-contain bg-black"
            />
          ) : (
            <img
              src={project.media}
              alt={project.title}
              className="w-full h-full object-contain"
            />
          )}
        </div>

        {/* Details */}
        <div className="p-8">
          <p className="text-sm text-gray-500 font-medium uppercase tracking-wide mb-3">
            {project.subcategory || project.category}
          </p>
          <h2 className="text-3xl font-bold text-black mb-4">
            {project.title}
          </h2>
          {project.description && (
            <p className="text-gray-700 text-base leading-relaxed mb-6">
              {project.description}
            </p>
          )}
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
            {project.type.toUpperCase()}
          </p>
        </div>
      </div>
    </div>
  );
}
