/**
 * Roadmap Zustand Store
 * 
 * Manages:
 * - Active student roadmap state & list of all enrolled roadmaps (multi-roadmap support)
 * - Automatic generation & enrollment pipeline
 * - Status polling for custom AI generation
 * - Roadmap switching & archiving
 * - Add Roadmap modal state
 * - Milestone slide-over drawer & interactive quiz modal state
 * - Quiz submissions, progress syncing, and XP reflection
 */

import { create } from 'zustand';
import api from '@/lib/axios';
import { useAuthStore } from './authStore';
import { useGamificationStore } from './gamificationStore';

export const useRoadmapStore = create((set, get) => ({
  activeRoadmap: null,
  myRoadmaps: [],
  isLoading: false,
  isGenerating: false,
  generationProgress: 0,
  selectedNode: null,
  isDrawerOpen: false,
  isQuizOpen: false,
  isAddRoadmapModalOpen: false,
  quizResult: null,
  error: null,

  /**
   * Fetches the student's active enrolled roadmaps from MongoDB
   */
  fetchActiveRoadmap: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.get('/roadmaps/my');
      if (res.data?.success) {
        const roadmaps = res.data.data.roadmaps || [];
        const primary = res.data.data.roadmap || roadmaps[0] || null;
        set({
          activeRoadmap: primary,
          myRoadmaps: roadmaps,
          isLoading: false,
        });
        return primary;
      }
      set({ isLoading: false });
      return null;
    } catch (err) {
      set({ isLoading: false, error: err.response?.data?.message || err.message });
      return null;
    }
  },

  /**
   * Switches the active roadmap display
   */
  switchRoadmap: async (roadmapId) => {
    const { myRoadmaps } = get();
    const target = myRoadmaps.find((r) => r._id === roadmapId);
    if (target) {
      set({ activeRoadmap: target, selectedNode: null, isDrawerOpen: false, isQuizOpen: false });
    }

    try {
      const res = await api.post(`/roadmaps/${roadmapId}/select`);
      if (res.data?.success) {
        set({
          activeRoadmap: res.data.data.roadmap,
          myRoadmaps: res.data.data.roadmaps || myRoadmaps,
        });
      }
    } catch (err) {
      console.error('Failed to update active roadmap selection:', err);
    }
  },

  /**
   * Archives / removes a roadmap from the student's active list
   */
  removeRoadmap: async (roadmapId) => {
    try {
      const res = await api.delete(`/roadmaps/${roadmapId}`);
      if (res.data?.success) {
        const remaining = res.data.data.roadmaps || [];
        const primary = res.data.data.roadmap || remaining[0] || null;
        set({
          myRoadmaps: remaining,
          activeRoadmap: primary,
          selectedNode: null,
          isDrawerOpen: false,
        });
      }
    } catch (err) {
      console.error('Failed to remove roadmap:', err);
    }
  },

  /**
   * Initiates the full generation & enrollment pipeline
   * 1. Calls /roadmaps/generate
   * 2. If cluster match -> immediately enrolls (<5ms)
   * 3. If AI generation needed -> polls /status/:jobId until complete, then enrolls!
   */
  generateAndEnroll: async (params = {}) => {
    set({ isGenerating: true, generationProgress: 15, error: null });

    try {
      const generateRes = await api.post('/roadmaps/generate', params);
      const data = generateRes.data?.data;

      // ─── Case A: Instant Cluster Match (<5ms) ─────────────────────
      if (data?.isInstantClusterMatch && data.templateId) {
        set({ generationProgress: 75 });
        const enrollRes = await api.post('/roadmaps/enroll', {
          templateId: data.templateId,
        });

        if (enrollRes.data?.success) {
          const roadmap = enrollRes.data.data.roadmap;
          const roadmaps = enrollRes.data.data.roadmaps || [roadmap];
          set({
            activeRoadmap: roadmap,
            myRoadmaps: roadmaps,
            isGenerating: false,
            generationProgress: 100,
            isAddRoadmapModalOpen: false,
          });
          return roadmap;
        }
      }

      // ─── Case B: Asynchronous Background Generation ───────────────
      if (data?.jobId) {
        set({ generationProgress: 35 });
        const jobId = data.jobId;

        // Poll status every 800ms
        const pollInterval = setInterval(async () => {
          try {
            const statusRes = await api.get(`/roadmaps/generate/status/${jobId}`);
            const statusData = statusRes.data?.data;

            if (statusData?.status === 'generating') {
              set({ generationProgress: Math.min(85, Math.max(40, statusData.progress || 50)) });
            } else if (statusData?.status === 'completed' && statusData.result) {
              clearInterval(pollInterval);
              set({ generationProgress: 90 });

              // Enroll in the generated custom roadmap
              const enrollRes = await api.post('/roadmaps/enroll', {
                customRoadmap: statusData.result,
              });

              if (enrollRes.data?.success) {
                const roadmap = enrollRes.data.data.roadmap;
                const roadmaps = enrollRes.data.data.roadmaps || [roadmap];
                set({
                  activeRoadmap: roadmap,
                  myRoadmaps: roadmaps,
                  isGenerating: false,
                  generationProgress: 100,
                  isAddRoadmapModalOpen: false,
                });
              }
            } else if (statusData?.status === 'failed') {
              clearInterval(pollInterval);
              set({
                isGenerating: false,
                error: statusData.error || 'Roadmap generation failed. Please try again.',
              });
            }
          } catch (pollErr) {
            clearInterval(pollInterval);
            const errorMsg =
              pollErr.response?.data?.error?.message ||
              pollErr.response?.data?.message ||
              'Generation was interrupted. Please try again.';
            set({
              isGenerating: false,
              error: errorMsg,
            });
          }
        }, 800);
      }
    } catch (err) {
      const serverMsg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        'Could not generate roadmap. Please check your topic and try again.';
      set({
        isGenerating: false,
        error: serverMsg,
      });
    }
  },

  /**
   * UI Modal & Drawer Actions
   */
  openAddRoadmapModal: () => {
    set({ isAddRoadmapModalOpen: true, error: null });
  },

  closeAddRoadmapModal: () => {
    set({ isAddRoadmapModalOpen: false });
  },

  selectNode: (node) => {
    set({ selectedNode: node, isDrawerOpen: true, isQuizOpen: false, quizResult: null });
  },

  closeDrawer: () => {
    set({ isDrawerOpen: false, selectedNode: null });
  },

  openQuiz: () => {
    set({ isQuizOpen: true });
  },

  closeQuiz: () => {
    set({ isQuizOpen: false, quizResult: null });
  },

  /**
   * Toggles completion of a sub-topic under a milestone node
   */
  toggleTopicCompletion: async (nodeId, topicId) => {
    const { activeRoadmap, myRoadmaps, selectedNode } = get();
    if (!activeRoadmap) return;

    // Optimistically update activeRoadmap, myRoadmaps, and selectedNode
    const updateNodes = (nodes) =>
      nodes.map((n) => {
        if (n._id !== nodeId) return n;
        const updatedTopics = (n.topics || []).map((t) =>
          t._id === topicId ? { ...t, isCompleted: !t.isCompleted } : t
        );
        return { ...n, topics: updatedTopics };
      });

    const optimisticRoadmap = {
      ...activeRoadmap,
      nodes: updateNodes(activeRoadmap.nodes),
    };

    const optimisticMyRoadmaps = myRoadmaps.map((r) =>
      r._id === activeRoadmap._id ? optimisticRoadmap : r
    );

    let optimisticSelectedNode = selectedNode;
    if (selectedNode && selectedNode._id === nodeId) {
      optimisticSelectedNode = {
        ...selectedNode,
        topics: (selectedNode.topics || []).map((t) =>
          t._id === topicId ? { ...t, isCompleted: !t.isCompleted } : t
        ),
      };
    }

    set({
      activeRoadmap: optimisticRoadmap,
      myRoadmaps: optimisticMyRoadmaps,
      selectedNode: optimisticSelectedNode,
    });

    try {
      const res = await api.patch(
        `/roadmaps/${activeRoadmap._id}/nodes/${nodeId}/topics/${topicId}`
      );
      if (res.data?.success) {
        const savedRoadmap = res.data.data.roadmap;
        const savedList = res.data.data.roadmaps || myRoadmaps.map((r) =>
          r._id === savedRoadmap._id ? savedRoadmap : r
        );
        set({
          activeRoadmap: savedRoadmap,
          myRoadmaps: savedList,
        });
        if (selectedNode && selectedNode._id === nodeId) {
          const updatedNode = savedRoadmap.nodes.find((n) => n._id === nodeId);
          if (updatedNode) set({ selectedNode: updatedNode });
        }
      }
    } catch (err) {
      console.error('Failed to toggle topic completion:', err);
      // Rollback on failure
      set({
        activeRoadmap,
        myRoadmaps,
        selectedNode,
      });
    }
  },

  /**
   * Save user study notes on a specific node
   */
  saveNodeNotes: async (nodeId, userNotes) => {
    const { activeRoadmap, myRoadmaps } = get();
    if (!activeRoadmap) return;

    try {
      const res = await api.patch(`/roadmaps/${activeRoadmap._id}/nodes/${nodeId}`, {
        userNotes,
      });

      if (res.data?.success) {
        const updatedRoadmap = res.data.data.roadmap;
        const updatedList = myRoadmaps.map((r) =>
          r._id === updatedRoadmap._id ? updatedRoadmap : r
        );
        set({
          activeRoadmap: updatedRoadmap,
          myRoadmaps: updatedList,
        });
        const updated = updatedRoadmap.nodes.find((n) => n._id === nodeId);
        if (updated) set({ selectedNode: updated });
      }
    } catch (err) {
      console.error('Failed to save study notes:', err);
    }
  },

  /**
   * Submits answers to the milestone comprehension quiz
   */
  submitQuiz: async (nodeId, answers) => {
    const { activeRoadmap, myRoadmaps } = get();
    if (!activeRoadmap) return;

    try {
      const res = await api.post(`/roadmaps/${activeRoadmap._id}/nodes/${nodeId}/quiz`, {
        answers,
      });

      if (res.data?.success) {
        const result = res.data.data;
        const updatedRoadmap = result.roadmap;
        const updatedList = myRoadmaps.map((r) =>
          r._id === updatedRoadmap._id ? updatedRoadmap : r
        );

        set({
          quizResult: result,
          activeRoadmap: updatedRoadmap,
          myRoadmaps: updatedList,
        });

        const updated = updatedRoadmap.nodes.find((n) => n._id === nodeId);
        if (updated) set({ selectedNode: updated });

        // If passed, refresh user XP in auth store & gamification store
        if (result.passed) {
          const gamification = result.gamification;
          const authUser = useAuthStore.getState().user;
          if (authUser) {
            useAuthStore.setState({
              user: {
                ...authUser,
                xp: gamification?.newXp ?? ((authUser.xp || 0) + (result.xpAwarded || 0)),
                level: gamification?.newLevel ?? authUser.level,
                currentStreak: gamification?.currentStreak ?? authUser.currentStreak,
              },
            });
          }

          // Refresh gamification stats & badges in background
          useGamificationStore.getState().fetchStats();
          useGamificationStore.getState().fetchBadges();

          // If any badges were newly unlocked, trigger celebration modal
          if (gamification?.newlyEarnedBadges && gamification.newlyEarnedBadges.length > 0) {
            useGamificationStore.getState().showBadgeCelebration(gamification.newlyEarnedBadges[0]);
          }
        }

        return result;
      }
    } catch (err) {
      console.error('Quiz submission error:', err);
      throw err;
    }
  },
}));
