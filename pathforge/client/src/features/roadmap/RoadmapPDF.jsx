/**
 * Roadmap PDF Document Generator
 * 
 * Generates a beautiful, colorful PDF of the student's learning roadmap
 * with all milestones, topics, subtopics, key concepts, and resources.
 * 
 * Uses @react-pdf/renderer for high-quality client-side PDF generation.
 */

import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  Link,
  StyleSheet,
  Font,
} from '@react-pdf/renderer';

// ─── Color Palette ──────────────────────────────────────────────────────────
const colors = {
  primary: '#7C3AED',
  primaryLight: '#EDE9FE',
  primaryDark: '#5B21B6',
  emerald: '#10B981',
  emeraldLight: '#D1FAE5',
  emeraldDark: '#065F46',
  blue: '#3B82F6',
  blueLight: '#DBEAFE',
  teal: '#14B8A6',
  gold: '#F59E0B',
  goldLight: '#FEF3C7',
  gray: '#6B7280',
  grayLight: '#F3F4F6',
  grayDark: '#374151',
  dark: '#1F2937',
  white: '#FFFFFF',
  red: '#EF4444',
  rose: '#FFF1F2',
  indigo: '#4F46E5',
  indigoLight: '#E0E7FF',
};

// ─── Resource Type Config ───────────────────────────────────────────────────
const resourceTypeConfig = {
  video: { label: '🎥 Video', color: colors.red, bg: colors.rose },
  article: { label: '📄 Article', color: colors.blue, bg: colors.blueLight },
  doc: { label: '📚 Docs', color: colors.indigo, bg: colors.indigoLight },
  course: { label: '🎓 Course', color: colors.primary, bg: colors.primaryLight },
  interactive: { label: '🔧 Interactive', color: colors.teal, bg: '#CCFBF1' },
};

// ─── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 50,
    paddingHorizontal: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: colors.dark,
    backgroundColor: colors.white,
  },
  // ── Cover Page ──
  coverPage: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
    padding: 50,
  },
  coverBadge: {
    backgroundColor: colors.primaryLight,
    color: colors.primary,
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 1.5,
    marginBottom: 20,
    textTransform: 'uppercase',
  },
  coverTitle: {
    fontSize: 32,
    fontFamily: 'Helvetica-Bold',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 1.3,
  },
  coverSubtitle: {
    fontSize: 13,
    color: colors.gray,
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 1.5,
    maxWidth: 400,
  },
  coverStatsRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 40,
  },
  coverStat: {
    alignItems: 'center',
    backgroundColor: colors.grayLight,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    minWidth: 100,
  },
  coverStatValue: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: colors.primary,
  },
  coverStatLabel: {
    fontSize: 8,
    color: colors.gray,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 2,
  },
  coverMeta: {
    fontSize: 9,
    color: colors.gray,
    textAlign: 'center',
    marginTop: 10,
  },
  coverBrand: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: colors.primary,
    marginTop: 50,
    letterSpacing: 2,
  },

  // ── Overview Page ──
  overviewHeader: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: colors.dark,
    marginBottom: 16,
  },
  progressBarOuter: {
    height: 12,
    backgroundColor: colors.grayLight,
    borderRadius: 6,
    marginBottom: 4,
    overflow: 'hidden',
  },
  progressBarInner: {
    height: 12,
    backgroundColor: colors.primary,
    borderRadius: 6,
  },
  progressLabel: {
    fontSize: 9,
    color: colors.gray,
    marginBottom: 20,
  },
  overviewTable: {
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  tableHeaderText: {
    color: colors.white,
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tableRowAlt: {
    backgroundColor: '#FAFAFA',
  },
  tableCell: {
    fontSize: 9,
    color: colors.dark,
  },
  tableCellBold: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: colors.dark,
  },
  statusCompleted: {
    color: colors.emerald,
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
  },
  statusInProgress: {
    color: colors.blue,
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
  },
  statusLocked: {
    color: colors.gray,
    fontSize: 9,
  },

  // ── Milestone Pages ──
  milestoneHeaderBar: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 16,
  },
  milestoneHeaderCompleted: {
    backgroundColor: colors.emeraldLight,
    borderLeftWidth: 4,
    borderLeftColor: colors.emerald,
  },
  milestoneHeaderInProgress: {
    backgroundColor: colors.primaryLight,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  milestoneHeaderLocked: {
    backgroundColor: colors.grayLight,
    borderLeftWidth: 4,
    borderLeftColor: colors.gray,
  },
  milestoneOrder: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  milestoneTitle: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: colors.dark,
    marginBottom: 4,
  },
  milestoneDesc: {
    fontSize: 10,
    color: colors.gray,
    lineHeight: 1.5,
    marginBottom: 6,
  },
  milestoneMetaRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 4,
  },
  milestoneMeta: {
    fontSize: 8,
    color: colors.gray,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // ── Topic Sections ──
  topicsSectionTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: colors.primary,
    marginBottom: 10,
    marginTop: 4,
    paddingBottom: 4,
    borderBottomWidth: 2,
    borderBottomColor: colors.primaryLight,
  },
  topicCard: {
    marginBottom: 12,
    padding: 12,
    backgroundColor: '#FAFBFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E8E8EF',
  },
  topicNumber: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 3,
  },
  topicTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: colors.dark,
    marginBottom: 4,
  },
  topicDesc: {
    fontSize: 9,
    color: colors.gray,
    lineHeight: 1.5,
    marginBottom: 8,
  },
  conceptsLabel: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: colors.grayDark,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  conceptPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 8,
  },
  conceptPill: {
    backgroundColor: colors.primaryLight,
    color: colors.primaryDark,
    fontSize: 8,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
  },

  // ── Resources ──
  resourcesLabel: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: colors.grayDark,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 5,
    marginTop: 4,
  },
  resourceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  resourceTypeBadge: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  resourceTitle: {
    fontSize: 8,
    color: colors.blue,
    textDecoration: 'underline',
  },
  resourceDuration: {
    fontSize: 7,
    color: colors.gray,
  },

  // ── Milestone Resources ──
  milestoneResourcesSection: {
    marginTop: 12,
    padding: 10,
    backgroundColor: colors.grayLight,
    borderRadius: 8,
  },
  milestoneResourcesTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: colors.grayDark,
    marginBottom: 6,
  },

  // ── Footer ──
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 8,
  },
  footerText: {
    fontSize: 7,
    color: colors.gray,
  },
  footerBrand: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: colors.primary,
  },
});

// ─── Helper: Status Label ───────────────────────────────────────────────────
const getStatusLabel = (status) => {
  if (status === 'completed') return '✅ Completed';
  if (status === 'in_progress') return '🔵 In Progress';
  return '🔒 Locked';
};

const getStatusStyle = (status) => {
  if (status === 'completed') return styles.statusCompleted;
  if (status === 'in_progress') return styles.statusInProgress;
  return styles.statusLocked;
};

const getMilestoneHeaderStyle = (status) => {
  if (status === 'completed') return styles.milestoneHeaderCompleted;
  if (status === 'in_progress') return styles.milestoneHeaderInProgress;
  return styles.milestoneHeaderLocked;
};

const getOrderColor = (status) => {
  if (status === 'completed') return colors.emeraldDark;
  if (status === 'in_progress') return colors.primary;
  return colors.gray;
};

// ─── Footer Component ───────────────────────────────────────────────────────
const PageFooter = ({ pageNum }) => (
  <View style={styles.footer} fixed>
    <Text style={styles.footerBrand}>PathForge</Text>
    <Text style={styles.footerText}>
      Generated on {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
    </Text>
    <Text style={styles.footerText}>Page {pageNum}</Text>
  </View>
);

// ─── Resource Item ──────────────────────────────────────────────────────────
const ResourceItem = ({ resource }) => {
  const config = resourceTypeConfig[resource.type] || resourceTypeConfig.article;
  return (
    <View style={styles.resourceItem}>
      <Text style={[styles.resourceTypeBadge, { backgroundColor: config.bg, color: config.color }]}>
        {config.label}
      </Text>
      <Link src={resource.url} style={styles.resourceTitle}>
        {resource.title}
      </Link>
      {resource.duration && (
        <Text style={styles.resourceDuration}>({resource.duration})</Text>
      )}
    </View>
  );
};

// ─── Topic Card ─────────────────────────────────────────────────────────────
const TopicCard = ({ topic, index }) => (
  <View style={styles.topicCard} wrap={false}>
    <Text style={styles.topicNumber}>
      Topic {index + 1} {topic.isCompleted ? ' ✓ Completed' : ''}
    </Text>
    <Text style={styles.topicTitle}>{topic.title}</Text>
    {topic.description ? (
      <Text style={styles.topicDesc}>{topic.description}</Text>
    ) : null}

    {/* Key Concepts */}
    {topic.keyConcepts && topic.keyConcepts.length > 0 && (
      <>
        <Text style={styles.conceptsLabel}>Key Concepts</Text>
        <View style={styles.conceptPillsRow}>
          {topic.keyConcepts.map((concept, i) => (
            <Text key={i} style={styles.conceptPill}>
              {concept}
            </Text>
          ))}
        </View>
      </>
    )}

    {/* Topic Resources */}
    {topic.resources && topic.resources.length > 0 && (
      <>
        <Text style={styles.resourcesLabel}>Resources</Text>
        {topic.resources.map((resource, i) => (
          <ResourceItem key={i} resource={resource} />
        ))}
      </>
    )}
  </View>
);

// ─── Cover Page ─────────────────────────────────────────────────────────────
const CoverPage = ({ roadmap, userName }) => {
  const completedCount = roadmap.nodes?.filter(n => n.status === 'completed').length || 0;
  const totalNodes = roadmap.nodes?.length || 0;

  return (
    <Page size="A4" style={[styles.page, { padding: 0 }]}>
      {/* Top gradient bar */}
      <View style={{ height: 8, backgroundColor: colors.primary }} />

      <View style={styles.coverPage}>
        <Text style={styles.coverBadge}>Learning Roadmap</Text>
        <Text style={styles.coverTitle}>{roadmap.title}</Text>
        <Text style={styles.coverSubtitle}>
          {roadmap.description || `A comprehensive learning path covering all essential topics and skills for mastering ${roadmap.title}.`}
        </Text>

        {/* Stats */}
        <View style={styles.coverStatsRow}>
          <View style={styles.coverStat}>
            <Text style={styles.coverStatValue}>{totalNodes}</Text>
            <Text style={styles.coverStatLabel}>Milestones</Text>
          </View>
          <View style={styles.coverStat}>
            <Text style={[styles.coverStatValue, { color: colors.teal }]}>
              {roadmap.totalEstimatedHours || 0}h
            </Text>
            <Text style={styles.coverStatLabel}>Est. Hours</Text>
          </View>
          <View style={styles.coverStat}>
            <Text style={[styles.coverStatValue, { color: colors.gold }]}>
              {completedCount}/{totalNodes}
            </Text>
            <Text style={styles.coverStatLabel}>Completed</Text>
          </View>
        </View>

        {/* Student & Category */}
        <Text style={styles.coverMeta}>
          Student: {userName || 'PathForge Learner'}
        </Text>
        <Text style={styles.coverMeta}>
          Category: {roadmap.category || 'Specialized Track'}
        </Text>
        <Text style={styles.coverMeta}>
          Generated: {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
        </Text>

        <Text style={styles.coverBrand}>PATHFORGE</Text>
      </View>

      {/* Bottom gradient bar */}
      <View style={{ height: 8, backgroundColor: colors.primary }} />
    </Page>
  );
};

// ─── Overview Page ──────────────────────────────────────────────────────────
const OverviewPage = ({ roadmap }) => {
  const progressPercent = roadmap.overallProgress || 0;

  return (
    <Page size="A4" style={styles.page}>
      <Text style={styles.overviewHeader}>Roadmap Overview</Text>

      {/* Progress Bar */}
      <View style={styles.progressBarOuter}>
        <View style={[styles.progressBarInner, { width: `${Math.max(progressPercent, 2)}%` }]} />
      </View>
      <Text style={styles.progressLabel}>
        Overall Progress: {progressPercent}% complete
      </Text>

      {/* Milestone Table */}
      <View style={styles.overviewTable}>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderText, { width: '6%' }]}>#</Text>
          <Text style={[styles.tableHeaderText, { width: '44%' }]}>Milestone</Text>
          <Text style={[styles.tableHeaderText, { width: '12%', textAlign: 'center' }]}>Hours</Text>
          <Text style={[styles.tableHeaderText, { width: '12%', textAlign: 'center' }]}>Topics</Text>
          <Text style={[styles.tableHeaderText, { width: '12%', textAlign: 'center' }]}>Score</Text>
          <Text style={[styles.tableHeaderText, { width: '14%', textAlign: 'right' }]}>Status</Text>
        </View>

        {roadmap.nodes?.map((node, index) => (
          <View key={index} style={[styles.tableRow, index % 2 !== 0 && styles.tableRowAlt]}>
            <Text style={[styles.tableCellBold, { width: '6%' }]}>{node.order}</Text>
            <Text style={[styles.tableCellBold, { width: '44%' }]}>{node.title}</Text>
            <Text style={[styles.tableCell, { width: '12%', textAlign: 'center' }]}>{node.estimatedHours}h</Text>
            <Text style={[styles.tableCell, { width: '12%', textAlign: 'center' }]}>{node.topics?.length || 0}</Text>
            <Text style={[styles.tableCell, { width: '12%', textAlign: 'center' }]}>
              {node.quizScore !== null && node.quizScore !== undefined ? `${node.quizScore}%` : '—'}
            </Text>
            <Text style={[getStatusStyle(node.status), { width: '14%', textAlign: 'right' }]}>
              {getStatusLabel(node.status)}
            </Text>
          </View>
        ))}
      </View>

      <PageFooter pageNum={2} />
    </Page>
  );
};

// ─── Milestone Detail Pages ─────────────────────────────────────────────────
const MilestonePages = ({ nodes }) => {
  return nodes.map((node, nodeIndex) => (
    <Page key={nodeIndex} size="A4" style={styles.page} wrap>
      {/* Milestone Header */}
      <View style={[styles.milestoneHeaderBar, getMilestoneHeaderStyle(node.status)]}>
        <Text style={[styles.milestoneOrder, { color: getOrderColor(node.status) }]}>
          Milestone {node.order} — {getStatusLabel(node.status)}
        </Text>
        <Text style={styles.milestoneTitle}>{node.title}</Text>
        <Text style={styles.milestoneDesc}>{node.description}</Text>
        <View style={styles.milestoneMetaRow}>
          <Text style={styles.milestoneMeta}>⏱ {node.estimatedHours} hours</Text>
          <Text style={styles.milestoneMeta}>📚 {node.topics?.length || 0} topics</Text>
          <Text style={styles.milestoneMeta}>📝 {node.resources?.length || 0} resources</Text>
          {node.quizScore !== null && node.quizScore !== undefined && (
            <Text style={styles.milestoneMeta}>🏆 Quiz: {node.quizScore}%</Text>
          )}
        </View>
      </View>

      {/* Topics */}
      {node.topics && node.topics.length > 0 && (
        <>
          <Text style={styles.topicsSectionTitle}>
            Topics to Study ({node.topics.length})
          </Text>
          {node.topics.map((topic, tIndex) => (
            <TopicCard key={tIndex} topic={topic} index={tIndex} />
          ))}
        </>
      )}

      {/* Milestone-Level Resources */}
      {node.resources && node.resources.length > 0 && (
        <View style={styles.milestoneResourcesSection} wrap={false}>
          <Text style={styles.milestoneResourcesTitle}>
            Milestone Resources ({node.resources.length})
          </Text>
          {node.resources.map((resource, rIndex) => (
            <ResourceItem key={rIndex} resource={resource} />
          ))}
        </View>
      )}

      <PageFooter pageNum={nodeIndex + 3} />
    </Page>
  ));
};

// ─── Main PDF Document ──────────────────────────────────────────────────────
const RoadmapPDF = ({ roadmap, userName }) => {
  if (!roadmap || !roadmap.nodes) return null;

  return (
    <Document
      title={`${roadmap.title} - Learning Roadmap`}
      author="PathForge"
      subject={`Learning roadmap for ${roadmap.title}`}
      creator="PathForge AI Learning Platform"
    >
      <CoverPage roadmap={roadmap} userName={userName} />
      <OverviewPage roadmap={roadmap} />
      <MilestonePages nodes={roadmap.nodes} />
    </Document>
  );
};

export default RoadmapPDF;
