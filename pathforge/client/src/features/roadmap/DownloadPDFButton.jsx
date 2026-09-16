/**
 * Download Roadmap PDF Button
 * 
 * Renders a button that generates and downloads a PDF of the student's
 * active roadmap with all topics, subtopics, key concepts, and resources.
 * 
 * Uses dynamic import to lazy-load @react-pdf/renderer only when the user
 * clicks download — keeping the initial bundle size small.
 */

import React, { useState, useCallback } from 'react';
import { Download, Loader2 } from 'lucide-react';

export default function DownloadPDFButton({ roadmap, userName, compact = false }) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownload = useCallback(async () => {
    if (!roadmap || !roadmap.nodes || isGenerating) return;

    setIsGenerating(true);
    try {
      // Dynamic import — loads PDF library only on first click (~400KB)
      const [{ pdf }, { default: RoadmapPDF }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('./RoadmapPDF'),
      ]);

      const blob = await pdf(
        <RoadmapPDF roadmap={roadmap} userName={userName} />
      ).toBlob();

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${roadmap.title.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_')}_Roadmap.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('PDF generation failed:', error);
    } finally {
      setIsGenerating(false);
    }
  }, [roadmap, userName, isGenerating]);

  if (compact) {
    return (
      <button
        onClick={handleDownload}
        disabled={isGenerating || !roadmap}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        title="Download roadmap as PDF"
      >
        {isGenerating ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <Download size={14} />
        )}
        {isGenerating ? 'Generating...' : 'Download PDF'}
      </button>
    );
  }

  return (
    <button
      onClick={handleDownload}
      disabled={isGenerating || !roadmap}
      className="btn-secondary text-xs py-2 px-3.5 inline-flex items-center gap-1.5 shadow-soft disabled:opacity-50 disabled:cursor-not-allowed"
      title="Download roadmap as PDF"
    >
      {isGenerating ? (
        <Loader2 size={14} className="animate-spin" />
      ) : (
        <Download size={14} />
      )}
      {isGenerating ? 'Generating PDF...' : 'Download PDF'}
    </button>
  );
}
