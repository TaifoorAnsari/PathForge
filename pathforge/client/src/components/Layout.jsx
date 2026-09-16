/**
 * Layout Component
 * 
 * The shell that wraps every page: sticky navbar, main content, footer.
 * Supports dark mode toggle with persistent preference in localStorage.
 * Connects directly to Zustand authStore for live session state.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Sun,
  Moon,
  Menu,
  X,
  LogOut,
  User,
  Settings,
  ChevronDown,
  Zap,
  Flame,
  Award,
  ChevronRight,
  Map,
  Calendar,
  Trophy,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useGamificationStore } from '@/store/gamificationStore';
import BadgeIcon from '@/components/BadgeIcon';
import api from '@/lib/axios';

export default function Layout() {
  const { isAuthenticated, user, logout } = useAuthStore();
  const { stats, badges, fetchStats, fetchBadges, showBadgeCelebration } = useGamificationStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('pf_theme') === 'dark';
    }
    return false;
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const profileMenuRef = useRef(null);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('pf_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('pf_theme', 'light');
    }
  }, [darkMode]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchStats();
      fetchBadges();
    }
  }, [isAuthenticated, fetchStats, fetchBadges]);

  // Close menus on route navigation
  useEffect(() => {
    setIsProfileModalOpen(false);
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Handle click outside to close the profile modal
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target)
      ) {
        setIsProfileModalOpen(false);
      }
    };

    if (isProfileModalOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isProfileModalOpen]);

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore network failure on logout
    }
    logout();
    navigate('/login');
  };

  const currentLevel = stats?.level || user?.level || 1;
  const currentXp = stats?.xp ?? (user?.xp || 0);
  const levelProg = stats?.levelProgression || {
    xpCurrentLevel: 0,
    xpForNextLevel: 100,
    progressPercentage: 0,
    xpToNextLevel: 100,
  };
  const earnedBadges = badges.filter((b) => b.isEarned);

  return (
    <div className="min-h-screen flex flex-col bg-primary-50 dark:bg-surface-dark transition-colors duration-300">
      {/* ─── Navbar ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 glass border-b border-primary-100 dark:border-surface-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center group-hover:bg-primary-700 transition-colors">
                <span className="text-white font-heading font-bold text-sm">P</span>
              </div>
              <span className="font-heading font-bold text-xl text-primary-900 dark:text-white">
                PathForge
              </span>
            </Link>

            {/* Desktop Navigation & Actions */}
            <div className="hidden md:flex items-center gap-6">
              {isAuthenticated && (
                <nav className="flex items-center gap-6">
                  <Link
                    to="/dashboard"
                    className={`text-sm font-medium transition-colors ${
                      location.pathname === '/dashboard'
                        ? 'text-primary-600 dark:text-primary-400 font-semibold'
                        : 'text-surface-muted hover:text-primary-600 dark:hover:text-primary-300'
                    }`}
                  >
                    My Roadmap
                  </Link>
                  <Link
                    to="/schedule"
                    className={`text-sm font-medium transition-colors ${
                      location.pathname === '/schedule'
                        ? 'text-primary-600 dark:text-primary-400 font-semibold'
                        : 'text-surface-muted hover:text-primary-600 dark:hover:text-primary-300'
                    }`}
                  >
                    Schedule
                  </Link>
                  <Link
                    to="/leaderboard"
                    className={`text-sm font-medium transition-colors ${
                      location.pathname === '/leaderboard'
                        ? 'text-primary-600 dark:text-primary-400 font-semibold'
                        : 'text-surface-muted hover:text-primary-600 dark:hover:text-primary-300'
                    }`}
                  >
                    Leaderboard
                  </Link>
                </nav>
              )}

              <div className="flex items-center gap-3">
                {/* Dark mode toggle */}
                <button
                  onClick={() => setDarkMode(!darkMode)}
                  className="p-2 rounded-xl text-surface-muted hover:text-surface-dark dark:hover:text-white hover:bg-primary-100 dark:hover:bg-surface-card transition-colors"
                  aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                  {darkMode ? <Sun size={18} /> : <Moon size={18} />}
                </button>

                {/* Profile icon & trigger */}
                {isAuthenticated ? (
                  <div className="relative" ref={profileMenuRef}>
                    <button
                      onClick={() => setIsProfileModalOpen(!isProfileModalOpen)}
                      className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl border transition-all duration-200 ${
                        isProfileModalOpen
                          ? 'bg-primary-100/80 dark:bg-surface-card border-primary-400 dark:border-primary-600 shadow-soft'
                          : 'bg-primary-100/40 dark:bg-surface-card border-primary-200 dark:border-surface-border hover:border-primary-400 dark:hover:border-primary-700'
                      }`}
                      aria-expanded={isProfileModalOpen}
                      aria-label="User account and stats menu"
                    >
                      <div className="w-7 h-7 rounded-full bg-primary-600 text-white flex items-center justify-center text-xs font-bold shadow-xs">
                        {user?.name ? user.name.charAt(0).toUpperCase() : <User size={13} />}
                      </div>
                      <span className="text-sm font-medium text-surface-dark dark:text-white max-w-[130px] truncate">
                        {user?.name || 'Student'}
                      </span>
                      <ChevronDown
                        size={14}
                        className={`text-surface-muted transition-transform duration-200 ${
                          isProfileModalOpen ? 'rotate-180 text-primary-600 dark:text-primary-400' : ''
                        }`}
                      />
                    </button>

                    {/* ─── Profile Modal on the Right Side ─────────────────────── */}
                    {isProfileModalOpen && (
                      <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-3xl bg-white dark:bg-surface-card border border-primary-200 dark:border-surface-border shadow-2xl p-4 z-50 animate-slide-up origin-top-right max-h-[85vh] overflow-y-auto space-y-3.5">
                        {/* Header: User Profile Details */}
                        <div className="flex items-center justify-between pb-3 border-b border-primary-100 dark:border-surface-border">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-primary-600 to-accent-teal text-white flex items-center justify-center font-heading font-bold text-base shadow-soft shrink-0">
                              {user?.name ? user.name.charAt(0).toUpperCase() : <User size={16} />}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-surface-dark dark:text-white truncate">
                                {user?.name || 'Student'}
                              </p>
                              <p className="text-xs text-surface-muted truncate">
                                {user?.email || 'student@pathforge.dev'}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => setIsProfileModalOpen(false)}
                            className="p-1.5 rounded-lg text-surface-muted hover:text-surface-dark dark:hover:text-white hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-colors"
                            aria-label="Close profile modal"
                          >
                            <X size={16} />
                          </button>
                        </div>

                        {/* 1. PLAYER RANK Card */}
                        <div className="p-4 rounded-2xl bg-gradient-to-br from-primary-50/50 via-white to-primary-100/30 dark:from-primary-950/40 dark:via-surface-card dark:to-primary-900/30 border border-primary-200/80 dark:border-primary-800/70">
                          <div className="flex items-start justify-between">
                            <div className="space-y-0.5">
                              <span className="text-[10px] uppercase font-bold tracking-wider text-surface-muted">
                                Player Rank
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-xl font-heading font-bold text-surface-dark dark:text-white">
                                  Level {currentLevel}
                                </span>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300">
                                  {currentLevel < 3 ? 'Novice' : currentLevel < 7 ? 'Practitioner' : 'Master'}
                                </span>
                              </div>
                            </div>
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary-600 to-accent-teal text-white flex items-center justify-center font-heading font-bold text-sm shadow-soft">
                              {currentLevel}
                            </div>
                          </div>

                          <div className="mt-3 space-y-1.5">
                            <div className="flex justify-between text-xs">
                              <span className="font-semibold text-surface-dark dark:text-surface-light flex items-center gap-1 text-[11px]">
                                <Zap size={13} className="text-accent-gold fill-accent-gold" />
                                {currentXp} Total XP
                              </span>
                              <span className="text-surface-muted font-medium text-[11px]">
                                {levelProg.xpToNextLevel} XP to Lv {currentLevel + 1}
                              </span>
                            </div>
                            <div className="w-full h-2 rounded-full bg-primary-100 dark:bg-primary-900/60 overflow-hidden p-0.5 border border-primary-200/50 dark:border-primary-800">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-primary-600 via-primary-500 to-accent-teal transition-all duration-700 ease-out"
                                style={{ width: `${Math.min(100, Math.max(5, levelProg.progressPercentage))}%` }}
                              />
                            </div>
                            <div className="flex justify-between text-[10px] text-surface-muted">
                              <span>XP</span>
                              <span>XP required</span>
                            </div>
                          </div>
                        </div>

                        {/* 2. DAILY DISCIPLINE Card */}
                        <div className="p-4 rounded-2xl bg-gradient-to-br from-white via-orange-50/20 to-amber-100/20 dark:from-surface-card dark:via-orange-950/20 dark:to-amber-900/20 border border-orange-200/60 dark:border-orange-900/40">
                          <div className="flex items-start justify-between">
                            <div className="space-y-0.5">
                              <span className="text-[10px] uppercase font-bold tracking-wider text-surface-muted">
                                Daily Discipline
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-xl font-heading font-bold text-orange-500">
                                  {stats?.currentStreak || user?.currentStreak || 0} Day Streak
                                </span>
                              </div>
                            </div>
                            <div className="w-9 h-9 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center shadow-soft">
                              <Flame size={20} className="animate-pulse fill-orange-500/30" />
                            </div>
                          </div>

                          <div className="mt-3 pt-2.5 border-t border-orange-100 dark:border-orange-950/80 space-y-1.5">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-surface-dark dark:text-white font-medium flex items-center gap-1">
                                <Flame size={12} className="text-orange-500" />
                                <span>All-Time Best:</span>
                                <span className="font-bold text-orange-500">
                                  {stats?.longestStreak || user?.longestStreak || 0} Days
                                </span>
                              </span>
                              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-orange-500/10 text-orange-600 dark:text-orange-400">
                                {(stats?.currentStreak || user?.currentStreak || 0) > 0 ? 'Active Habit' : 'Start Today'}
                              </span>
                            </div>
                            <p className="text-[10px] text-surface-muted leading-tight">
                              Pass a milestone quiz each day to keep your daily study streak burning!
                            </p>
                          </div>
                        </div>

                        {/* 3. ACHIEVEMENTS Card */}
                        <div className="p-4 rounded-2xl bg-gradient-to-br from-white via-amber-50/20 to-yellow-100/20 dark:from-surface-card dark:via-amber-950/20 dark:to-yellow-900/20 border border-amber-200/60 dark:border-amber-900/40">
                          <div className="flex items-start justify-between">
                            <div className="space-y-0.5">
                              <span className="text-[10px] uppercase font-bold tracking-wider text-surface-muted">
                                Achievements
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-xl font-heading font-bold text-surface-dark dark:text-white">
                                  {earnedBadges.length} / {badges.length || 11}
                                </span>
                                <span className="text-[11px] text-surface-muted font-medium">Unlocked</span>
                              </div>
                            </div>
                            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shadow-soft">
                              <Award size={20} />
                            </div>
                          </div>

                          <div className="mt-3 pt-2 space-y-2">
                            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                              {badges.length === 0 ? (
                                <span className="text-[11px] text-surface-muted">Loading achievements...</span>
                              ) : (
                                badges.slice(0, 6).map((badge) => {
                                  const isEarned = badge.isEarned;
                                  return (
                                    <button
                                      key={badge._id || badge.code}
                                      onClick={() => showBadgeCelebration(badge)}
                                      className={`relative w-8 h-8 rounded-lg flex items-center justify-center transition-transform hover:scale-110 shrink-0 ${
                                        isEarned
                                          ? 'bg-amber-500/15 border border-amber-500/50 shadow-xs cursor-pointer'
                                          : 'bg-primary-100/60 dark:bg-primary-900/40 border border-dashed border-primary-300 dark:border-primary-800 opacity-40 grayscale cursor-default'
                                      }`}
                                      title={`${badge.name}: ${badge.description} (${badge.xpReward} XP)`}
                                    >
                                      <BadgeIcon icon={badge.icon} size={15} />
                                      {isEarned && (
                                        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border border-white dark:border-primary-950" />
                                      )}
                                    </button>
                                  );
                                })
                              )}
                            </div>

                            <div className="flex items-center justify-between text-[11px] pt-0.5">
                              <span className="text-surface-muted truncate max-w-[160px]">
                                {earnedBadges.length === 0
                                  ? 'Complete a quiz to earn badges'
                                  : `Recent: ${earnedBadges[earnedBadges.length - 1]?.name}`}
                              </span>
                              <Link
                                to="/leaderboard"
                                onClick={() => setIsProfileModalOpen(false)}
                                className="text-primary-600 dark:text-primary-400 font-semibold hover:underline inline-flex items-center gap-0.5 shrink-0"
                              >
                                Catalog <ChevronRight size={12} />
                              </Link>
                            </div>
                          </div>
                        </div>

                        {/* Account Settings & Log Out Actions */}
                        <div className="pt-2 border-t border-primary-100 dark:border-surface-border space-y-1">
                          <Link
                            to="/settings"
                            onClick={() => setIsProfileModalOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium text-surface-dark dark:text-surface-light hover:bg-primary-50 dark:hover:bg-surface-card hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                          >
                            <Settings size={16} className="text-primary-600 dark:text-primary-400" />
                            <span>Account Settings</span>
                          </Link>

                          <button
                            onClick={() => {
                              setIsProfileModalOpen(false);
                              handleLogout();
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium text-accent-rose hover:bg-accent-rose/10 transition-colors text-left"
                          >
                            <LogOut size={16} />
                            <span>Log Out</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Link to="/login" className="btn-ghost text-sm py-1.5 px-3">
                      Log in
                    </Link>
                    <Link to="/register" className="btn-primary text-sm py-1.5 px-4">
                      Sign up
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 rounded-lg text-surface-muted hover:bg-primary-100 dark:hover:bg-primary-900/50"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>

          {/* Mobile Navigation Drawer */}
          {mobileMenuOpen && (
            <div className="md:hidden pb-4 border-t border-primary-100 dark:border-surface-border mt-2 pt-4">
              <div className="flex flex-col gap-2">
                {isAuthenticated ? (
                  <>
                    <div className="px-2 py-2 flex items-center gap-3 mb-1 pb-3 border-b border-primary-100 dark:border-surface-border">
                      <div className="w-9 h-9 rounded-full bg-primary-600 text-white flex items-center justify-center text-sm font-bold shrink-0">
                        {user?.name ? user.name.charAt(0).toUpperCase() : <User size={14} />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-surface-dark dark:text-white truncate">
                          {user?.name || 'Student'}
                        </p>
                        <p className="text-xs text-surface-muted truncate">
                          {user?.email || 'student@pathforge.dev'}
                        </p>
                      </div>
                    </div>

                    {/* ─── Compact Mobile Stats Widget (Rank, Streak, Badges) ─── */}
                    <div className="px-2 py-1 space-y-2 mb-2 pb-3 border-b border-primary-100 dark:border-surface-border">
                      {/* Row 1: Dual Pill (Rank & Level | Daily Discipline Streak) */}
                      <div className="grid grid-cols-2 gap-2">
                        {/* Player Rank Pill */}
                        <div className="p-2.5 rounded-xl bg-primary-50/70 dark:bg-surface-card border border-primary-200/80 dark:border-primary-900/60 flex flex-col justify-between">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] uppercase font-bold tracking-wider text-surface-muted">
                              Rank
                            </span>
                            <span className="text-[10px] font-semibold text-primary-700 dark:text-primary-300">
                              {currentLevel < 3 ? 'Novice' : currentLevel < 7 ? 'Practitioner' : 'Master'}
                            </span>
                          </div>
                          <div className="flex items-baseline justify-between mt-1">
                            <span className="text-sm font-heading font-bold text-surface-dark dark:text-white">
                              Lvl {currentLevel}
                            </span>
                            <span className="text-[10px] font-medium text-surface-muted">
                              {currentXp} XP
                            </span>
                          </div>
                          {/* Mini Progress Bar */}
                          <div className="w-full bg-primary-100 dark:bg-primary-950 rounded-full h-1 mt-1.5 overflow-hidden">
                            <div
                              className="bg-primary-600 h-1 rounded-full transition-all duration-300"
                              style={{ width: `${Math.min(100, Math.max(0, levelProg.progressPercentage || 0))}%` }}
                            />
                          </div>
                        </div>

                        {/* Daily Discipline Streak Pill */}
                        <div className="p-2.5 rounded-xl bg-accent-amber/5 dark:bg-surface-card border border-accent-amber/20 dark:border-primary-900/60 flex flex-col justify-between">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] uppercase font-bold tracking-wider text-surface-muted">
                              Discipline
                            </span>
                            <Flame size={12} className="text-accent-amber fill-accent-amber" />
                          </div>
                          <div className="flex items-baseline justify-between mt-1">
                            <span className="text-sm font-heading font-bold text-surface-dark dark:text-white">
                              {stats?.currentStreak ?? 0} {stats?.currentStreak === 1 ? 'day' : 'days'}
                            </span>
                            <span className="text-[10px] font-medium text-surface-muted">
                              Best: {stats?.bestStreak ?? 0}d
                            </span>
                          </div>
                          <div className="w-full bg-accent-amber/20 dark:bg-primary-950 rounded-full h-1 mt-1.5 overflow-hidden">
                            <div
                              className="bg-accent-amber h-1 rounded-full transition-all duration-300"
                              style={{ width: `${Math.min(100, ((stats?.currentStreak ?? 0) / Math.max(1, stats?.bestStreak || 7)) * 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Row 2: Achievements Strip */}
                      <div className="p-2 rounded-xl bg-primary-50/50 dark:bg-surface-card border border-primary-200/60 dark:border-primary-900/40 flex items-center justify-between">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Award size={13} className="text-primary-600 dark:text-primary-400 shrink-0" />
                          <span className="text-xs font-semibold text-surface-dark dark:text-white truncate">
                            {earnedBadges.length} {earnedBadges.length === 1 ? 'Badge' : 'Badges'} Unlocked
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {earnedBadges.slice(0, 3).map((badge) => (
                            <div
                              key={badge._id}
                              className="w-5 h-5 rounded-md bg-white dark:bg-primary-900/70 border border-primary-200 dark:border-primary-800 flex items-center justify-center text-[10px]"
                              title={badge.name}
                            >
                              <BadgeIcon iconName={badge.icon} size={11} />
                            </div>
                          ))}
                          {earnedBadges.length > 3 && (
                            <span className="text-[10px] font-bold text-primary-600 dark:text-primary-400 px-1">
                              +{earnedBadges.length - 3}
                            </span>
                          )}
                          {earnedBadges.length === 0 && (
                            <span className="text-[10px] text-surface-muted italic">
                              Earn on quizzes
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <Link
                      to="/dashboard"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-2.5 text-surface-dark dark:text-surface-light hover:text-primary-600 text-sm font-medium px-2 py-2 rounded-lg hover:bg-primary-100/50 dark:hover:bg-surface-card"
                    >
                      <Map size={16} className="text-primary-600 dark:text-primary-400" />
                      My Roadmap
                    </Link>
                    <Link
                      to="/schedule"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-2.5 text-surface-dark dark:text-surface-light hover:text-primary-600 text-sm font-medium px-2 py-2 rounded-lg hover:bg-primary-100/50 dark:hover:bg-surface-card"
                    >
                      <Calendar size={16} className="text-primary-600 dark:text-primary-400" />
                      Schedule
                    </Link>
                    <Link
                      to="/leaderboard"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-2.5 text-surface-dark dark:text-surface-light hover:text-primary-600 text-sm font-medium px-2 py-2 rounded-lg hover:bg-primary-100/50 dark:hover:bg-surface-card"
                    >
                      <Trophy size={16} className="text-primary-600 dark:text-primary-400" />
                      Leaderboard
                    </Link>
                    <Link
                      to="/settings"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-2.5 text-surface-dark dark:text-surface-light hover:text-primary-600 text-sm font-medium px-2 py-2 rounded-lg hover:bg-primary-100/50 dark:hover:bg-surface-card"
                    >
                      <Settings size={16} className="text-primary-600 dark:text-primary-400" />
                      Account Settings
                    </Link>
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        handleLogout();
                      }}
                      className="text-left text-accent-rose text-sm font-medium px-2 py-2 flex items-center gap-2.5 rounded-lg hover:bg-accent-rose/10"
                    >
                      <LogOut size={16} />
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      to="/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-surface-muted hover:text-primary-600 text-sm font-medium px-2 py-1"
                    >
                      Log in
                    </Link>
                    <Link
                      to="/register"
                      onClick={() => setMobileMenuOpen(false)}
                      className="btn-primary text-sm py-1.5 text-center"
                    >
                      Sign up
                    </Link>
                  </>
                )}
                <button
                  onClick={() => setDarkMode(!darkMode)}
                  className="flex items-center gap-2 text-surface-muted text-sm px-2 py-1 pt-2 border-t border-primary-100 dark:border-surface-border mt-1"
                >
                  {darkMode ? <Sun size={16} /> : <Moon size={16} />}
                  {darkMode ? 'Light mode' : 'Dark mode'}
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* ─── Main Content ───────────────────────────────────── */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* ─── Footer ─────────────────────────────────────────── */}
      <footer className="border-t border-primary-100 dark:border-surface-border py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-primary-600 rounded flex items-center justify-center">
                <span className="text-white font-heading font-bold text-xs">P</span>
              </div>
              <span className="text-sm text-surface-muted">
                PathForge &copy; {new Date().getFullYear()}
              </span>
            </div>
            <p className="text-xs text-surface-muted">
              Built for learners, powered by AI.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
