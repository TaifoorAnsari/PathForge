/**
 * Interactive Roadmap Visualizer Component
 * 
 * Renders the student's personal milestone learning tree:
 * - Multi-roadmap switcher bar allowing 2-3+ concurrent roadmaps (e.g. MERN + DSA)
 * - Add Another Roadmap button & modal
 * - Connected path linking milestones with dynamic status lines
 * - Milestone status styling (Completed: green check, In Progress: active brand pulse, Locked: muted lock)
 * - Overall progress bar and study hour counters
 * - Opens MilestoneDrawer on node click
 * - Hosts QuizModal for milestone comprehension assessments
 */

import React from 'react';
import { useRoadmapStore } from '@/store/roadmapStore';
import MilestoneDrawer from './MilestoneDrawer';
import QuizModal from './QuizModal';
import AddRoadmapModal from './AddRoadmapModal';
import {
  CheckCircle2,
  Lock,
  Play,
  Clock,
  BookOpen,
  Award,
  Sparkles,
  Compass,
  Plus,
  X,
} from 'lucide-react';

export default function RoadmapVisualizer({ roadmap }) {
  const {
    selectNode,
    selectedNode,
    myRoadmaps,
    switchRoadmap,
    removeRoadmap,
    openAddRoadmapModal,
  } = useRoadmapStore();

  if (!roadmap || !roadmap.nodes || roadmap.nodes.length === 0) {
    return null;
  }

  const nodes = roadmap.nodes;
  const completedCount = nodes.filter((n) => n.status === 'completed').length;
  const progressPercent = roadmap.overallProgress || 0;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* ─── Multi-Roadmap Switcher Bar ─────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-primary-100 dark:border-primary-900/60">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-none">
          <span className="text-xs font-bold uppercase tracking-wider text-surface-muted shrink-0 mr-1 hidden sm:inline">
            Active Roadmaps ({myRoadmaps.length}):
          </span>

          {myRoadmaps.map((r) => {
            const isActive = r._id === roadmap._id;
            return (
              <div
                key={r._id}
                className={`group inline-flex items-center gap-2 py-2 px-3.5 rounded-2xl border text-xs font-semibold transition-all cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-primary-600 text-white border-primary-600 shadow-soft'
                    : 'bg-white dark:bg-primary-950 border-primary-200 dark:border-primary-800 text-surface-dark dark:text-surface-light hover:border-primary-400'
                }`}
                onClick={() => switchRoadmap(r._id)}
              >
                <Compass size={14} className={isActive ? 'text-white' : 'text-primary-600'} />
                <span className="truncate max-w-[160px] sm:max-w-[220px]">{r.title}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300'
                  }`}
                >
                  {r.overallProgress || 0}%
                </span>
                {myRoadmaps.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm(`Remove "${r.title}" from your active roadmaps?`)) {
                        removeRoadmap(r._id);
                      }
                    }}
                    className={`opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-black/20 transition-opacity ${
                      isActive ? 'text-white' : 'text-surface-muted hover:text-red-500'
                    }`}
                    title="Remove roadmap"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <button
          onClick={openAddRoadmapModal}
          className="btn-primary text-xs py-2 px-3.5 inline-flex items-center gap-1.5 self-start sm:self-auto shrink-0 shadow-soft"
        >
          <Plus size={14} />
          Add Another Roadmap
        </button>
      </div>

      {/* ─── Header & Overall Progress Metrics ──────────────────────── */}
      <div className="card p-6 sm:p-8 bg-gradient-to-br from-white to-primary-50/50 dark:from-primary-950 dark:to-primary-900/30 border-primary-200 dark:border-primary-800/80 shadow-card">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">
              <Compass size={14} />
              {roadmap.category || 'Specialized Track'}
            </div>
            <h2 className="text-2xl sm:text-3xl font-heading font-bold text-surface-dark dark:text-white">
              {roadmap.title}
            </h2>
            {roadmap.description && (
              <p className="text-sm text-surface-muted max-w-2xl leading-relaxed pt-1">
                {roadmap.description}
              </p>
            )}
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-4 sm:gap-6 shrink-0 pt-2 md:pt-0">
            <div className="text-center">
              <div className="text-2xl font-heading font-bold text-primary-600 dark:text-primary-400">
                {completedCount}/{nodes.length}
              </div>
              <div className="text-xs text-surface-muted uppercase font-semibold">Milestones</div>
            </div>
            <div className="w-px h-10 bg-primary-200 dark:bg-primary-800" />
            <div className="text-center">
              <div className="text-2xl font-heading font-bold text-accent-teal">
                {roadmap.totalEstimatedHours || 0}h
              </div>
              <div className="text-xs text-surface-muted uppercase font-semibold">Est. Time</div>
            </div>
            <div className="w-px h-10 bg-primary-200 dark:bg-primary-800" />
            <div className="text-center">
              <div className="text-2xl font-heading font-bold text-accent-gold">
                {progressPercent}%
              </div>
              <div className="text-xs text-surface-muted uppercase font-semibold">Progress</div>
            </div>
          </div>
        </div>

        {/* Dynamic Progress Bar */}
        <div className="mt-6 space-y-2">
          <div className="w-full h-3 rounded-full bg-primary-100 dark:bg-primary-900 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary-600 via-primary-500 to-accent-teal rounded-full transition-all duration-700 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-surface-muted font-medium">
            <span>Stage 1: Core Foundations</span>
            <span>Stage {nodes.length}: Capstone Project</span>
          </div>
        </div>
      </div>

      {/* ─── Connected Milestone Path ────────────────────────────────── */}
      <div className="relative max-w-4xl mx-auto py-6 px-4">
        {nodes.map((node, index) => {
          const isCompleted = node.status === 'completed';
          const isInProgress = node.status === 'in_progress';
          const isLocked = node.status === 'locked';
          const isSelected = selectedNode?._id === node._id;
          const isLast = index === nodes.length - 1;

          return (
            <div key={node._id || index} className="relative flex items-start gap-3 sm:gap-6 pb-12 group">
              {/* Vertical Connecting Line */}
              {!isLast && (
                <div
                  className={`absolute top-14 left-[22px] sm:left-6 w-0.5 -bottom-2 -ml-[1px] transition-colors duration-500 ${
                    isCompleted
                      ? 'bg-emerald-500'
                      : isInProgress
                      ? 'bg-gradient-to-b from-primary-600 to-primary-200 dark:to-primary-900'
                      : 'border-l-2 border-dashed border-primary-200 dark:border-primary-800'
                  }`}
                />
              )}

              {/* Node Milestone Circle Icon */}
              <button
                type="button"
                onClick={() => selectNode(node)}
                className={`relative z-10 w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-300 shadow-soft focus:outline-none ${
                  isCompleted
                    ? 'bg-emerald-500 text-white hover:scale-105 shadow-emerald-500/20'
                    : isInProgress
                    ? 'bg-gradient-to-br from-primary-600 to-primary-700 text-white ring-4 ring-primary-500/30 animate-pulse hover:scale-105'
                    : 'bg-primary-100 dark:bg-primary-900 text-surface-muted cursor-not-allowed'
                }`}
              >
                {isCompleted ? (
                  <CheckCircle2 size={24} />
                ) : isInProgress ? (
                  <Play size={20} className="fill-current ml-0.5" />
                ) : (
                  <Lock size={18} />
                )}
              </button>

              <div
                onClick={() => selectNode(node)}
                className={`flex-1 min-w-0 card p-4 sm:p-6 transition-all duration-300 cursor-pointer border ${
                  isSelected
                    ? 'ring-2 ring-primary-500 border-primary-500 shadow-card'
                    : isInProgress
                    ? 'border-primary-300 dark:border-primary-700 bg-primary-50/30 dark:bg-primary-900/20 hover:border-primary-400'
                    : isCompleted
                    ? 'border-emerald-200 dark:border-emerald-900/40 bg-white dark:bg-primary-950 hover:border-emerald-400'
                    : 'border-primary-100 dark:border-primary-900/50 bg-white/50 dark:bg-primary-950/40 opacity-70 hover:opacity-100'
                }`}
              >
                <div className="flex flex-col gap-1.5 pb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold uppercase tracking-wider text-surface-muted">
                      Milestone {node.order}
                    </span>
                    {isInProgress && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-primary-600 text-white shadow-xs whitespace-nowrap">
                        Current
                      </span>
                    )}
                    {isCompleted && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 flex items-center gap-1 whitespace-nowrap">
                        <CheckCircle2 size={11} />
                        Completed
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 sm:gap-3 text-[11px] sm:text-xs text-surface-muted flex-wrap">
                    <span className="inline-flex items-center gap-1">
                      <Clock size={12} />
                      {node.estimatedHours}h
                    </span>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1">
                      <BookOpen size={12} />
                      {node.resources?.length || 0} Resources
                    </span>
                    {node.quizScore !== null && (
                      <>
                        <span>•</span>
                        <span className="inline-flex items-center gap-1 text-accent-gold font-bold">
                          <Award size={12} />
                          {node.quizScore}%
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <h3 className="text-base sm:text-lg font-heading font-bold text-surface-dark dark:text-white pt-1">
                  {node.title}
                </h3>
                <p className="text-sm text-surface-muted mt-1 line-clamp-2 leading-relaxed">
                  {node.description}
                </p>

                {/* Card Action Hint */}
                <div className="mt-3 sm:mt-4 pt-3 border-t border-primary-100 dark:border-primary-900/60 flex items-center justify-between gap-2 text-[11px] sm:text-xs">
                  <span className="text-primary-600 dark:text-primary-400 font-semibold group-hover:underline inline-flex items-center gap-1 truncate min-w-0">
                    {isCompleted ? 'Review resources & notes' : isLocked ? 'View overview' : 'Explore & take quiz'}
                    <Sparkles size={11} className="shrink-0" />
                  </span>
                  <span className="text-surface-muted font-medium whitespace-nowrap shrink-0">Click to open</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modals & Slide-over Drawers */}
      <AddRoadmapModal />
      <MilestoneDrawer />
      <QuizModal node={selectedNode} />
    </div>
  );
}
