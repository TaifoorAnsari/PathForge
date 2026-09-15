/**
 * Gemini Roadmap Generator & Queue Unit/Integration Tests
 * 
 * Verifies:
 * 1. Prompt Builder & Parameter Adaptability
 * 2. Smart Blueprint Generator Fallback
 * 3. Gemini Generation Service
 * 4. Job Worker Processor & Validation
 * 5. Generation Queue & Job Status Polling
 * 6. HTTP Endpoints (/roadmaps/generate and /roadmaps/generate/status/:jobId)
 */

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../src/app');
const { env } = require('../../src/config/env');
const {
  buildPrompt,
  generateBlueprintFallback,
  generateRoadmapWithGemini,
} = require('../../src/services/roadmapEngine/geminiService');
const { processGenerationJob } = require('../../src/queues/roadmapWorker');
const { addRoadmapGenerationJob, getJobStatus } = require('../../src/queues/roadmapQueue');

const ClusterTemplate = require('../../src/models/ClusterTemplate');

describe('Gemini Roadmap Service & Generation Queue', () => {
  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(env.MONGO_URI);
    }
    // Clean up test-promoted templates so tests are deterministic
    await ClusterTemplate.deleteMany({ createdBy: 'promoted_from_gemini' });
  });

  afterAll(async () => {
    await ClusterTemplate.deleteMany({ createdBy: 'promoted_from_gemini' });
    await mongoose.connection.close();
  });

  // ─── 1. Prompt Builder Tests ──────────────────────────────────────────
  describe('Gemini Prompt Builder', () => {
    it('should inject user personalization parameters into the prompt', () => {
      const prompt = buildPrompt({
        goalText: 'Quantum Computing with Qiskit',
        skillLevel: 'advanced',
        hoursPerWeek: 20,
        learningStyle: 'reading',
      });

      expect(prompt).toContain('Quantum Computing with Qiskit');
      expect(prompt).toContain('advanced');
      expect(prompt).toContain('20');
      expect(prompt).toContain('reading');
      expect(prompt).toContain('estimatedHours');
      expect(prompt).toContain('quizQuestions');
    });
  });

  // ─── 2. Smart Blueprint Generator Tests ────────────────────────────────
  describe('Smart Blueprint Generator Fallback', () => {
    it('should generate a 4-milestone roadmap with valid resources and quizzes', () => {
      const result = generateBlueprintFallback({
        goalText: 'Solidity Smart Contracts',
        skillLevel: 'beginner',
        hoursPerWeek: 15,
        learningStyle: 'hands-on',
      });

      expect(result).toHaveProperty('title');
      expect(result).toHaveProperty('category');
      expect(result).toHaveProperty('nodes');
      expect(result.nodes.length).toBe(4);

      // Node structure validation
      const firstNode = result.nodes[0];
      expect(firstNode).toHaveProperty('order', 1);
      expect(firstNode).toHaveProperty('title');
      expect(firstNode).toHaveProperty('description');
      expect(firstNode.estimatedHours).toBeGreaterThan(0);
      expect(Array.isArray(firstNode.resources)).toBe(true);
      expect(firstNode.resources.length).toBeGreaterThan(0);
      expect(Array.isArray(firstNode.quizQuestions)).toBe(true);
      expect(firstNode.quizQuestions.length).toBeGreaterThan(0);

      // Quiz structure validation
      const quiz = firstNode.quizQuestions[0];
      expect(quiz).toHaveProperty('question');
      expect(quiz).toHaveProperty('options');
      expect(quiz.options.length).toBeGreaterThanOrEqual(3);
      expect(typeof quiz.correctIndex).toBe('number');
      expect(quiz).toHaveProperty('explanation');
    });

    it('should adapt estimated hours based on study commitment', () => {
      const lowCommitment = generateBlueprintFallback({
        goalText: 'Go',
        hoursPerWeek: 5,
      });
      const highCommitment = generateBlueprintFallback({
        goalText: 'Go',
        hoursPerWeek: 25,
      });

      const lowHours = lowCommitment.nodes.reduce((s, n) => s + n.estimatedHours, 0);
      const highHours = highCommitment.nodes.reduce((s, n) => s + n.estimatedHours, 0);

      expect(highHours).toBeGreaterThan(lowHours);
    });
  });

  // ─── 3. Gemini Generation Service Tests ────────────────────────────────
  describe('Gemini Generation Service', () => {
    it('should return a valid structured roadmap with source flag', async () => {
      const { roadmap, source } = await generateRoadmapWithGemini({
        goalText: 'Rust Systems Programming',
        skillLevel: 'intermediate',
        hoursPerWeek: 12,
        learningStyle: 'hands-on',
      });

      expect(roadmap).toBeDefined();
      expect(roadmap).toHaveProperty('title');
      expect(Array.isArray(roadmap.nodes)).toBe(true);
      expect(roadmap.nodes.length).toBeGreaterThanOrEqual(4);
      expect(['gemini', 'blueprint']).toContain(source);
    }, 30000);
  });

  // ─── 4. Worker Processing Tests ────────────────────────────────────────
  describe('Roadmap Worker Processor', () => {
    it('should process generation job and calculate total estimated hours', async () => {
      const jobData = {
        goalText: 'Bioinformatics with Python',
        skillLevel: 'beginner',
        hoursPerWeek: 10,
        learningStyle: 'visual',
      };

      const progressSteps = [];
      const result = await processGenerationJob(jobData, (p) => progressSteps.push(p));

      expect(result).toBeDefined();
      expect(result.title).toContain('Bioinformatics');
      expect(result.nodeCount).toBeGreaterThanOrEqual(4);
      expect(result.totalEstimatedHours).toBeGreaterThan(0);
      expect(progressSteps.length).toBeGreaterThan(0);
    }, 30000);
  });

  // ─── 5. Generation Queue Tests ─────────────────────────────────────────
  describe('Roadmap Generation Queue', () => {
    it('should enqueue job, return jobId, and complete in background', async () => {
      const { jobId, status } = await addRoadmapGenerationJob({
        goalText: 'WebAssembly Fundamentals',
        skillLevel: 'beginner',
        hoursPerWeek: 10,
      });

      expect(jobId).toBeDefined();
      expect(['pending', 'generating']).toContain(status);

      // Wait a short tick for in-memory worker to process
      await new Promise((resolve) => setTimeout(resolve, 200));

      const jobStatus = await getJobStatus(jobId);
      expect(jobStatus).not.toBeNull();
      expect(jobStatus.jobId).toBe(jobId);
      expect(['generating', 'completed']).toContain(jobStatus.status);
    });
  });

  // ─── 6. HTTP Endpoints Tests ───────────────────────────────────────────
  describe('Roadmap HTTP Endpoints', () => {
    it('POST /roadmaps/generate should return instant cluster hit for known topic', async () => {
      const res = await request(app)
        .post('/api/v1/roadmaps/generate')
        .send({ goalText: 'I want to learn React' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.isInstantClusterMatch).toBe(true);
      expect(res.body.data.status).toBe('completed');
      expect(res.body.data.roadmap.title).toMatch(/React/i);
    });

    it('POST /roadmaps/generate should enqueue background job for custom topic', async () => {
      await ClusterTemplate.deleteMany({ createdBy: 'promoted_from_gemini' });

      const res = await request(app)
        .post('/api/v1/roadmaps/generate')
        .send({
          goalText: 'Robotics Operating System ROS2 Autonomous Navigation',
          skillLevel: 'intermediate',
          hoursPerWeek: 15,
        })
        .expect(202);

      expect(res.body.success).toBe(true);
      expect(res.body.data.isInstantClusterMatch).toBe(false);
      expect(res.body.data.jobId).toBeDefined();
      expect(res.body.data.status).toBe('pending');
      expect(res.body.data.statusUrl).toContain('/status/');

      const jobId = res.body.data.jobId;

      // Poll status endpoint
      // Allow async tick to complete
      await new Promise((resolve) => setTimeout(resolve, 250));

      const statusRes = await request(app)
        .get(`/api/v1/roadmaps/generate/status/${jobId}`)
        .expect(200);

      expect(statusRes.body.success).toBe(true);
      expect(statusRes.body.data.jobId).toBe(jobId);
      expect(['generating', 'completed']).toContain(statusRes.body.data.status);
    });

    it('GET /roadmaps/generate/status/:jobId should return 404 for non-existent job', async () => {
      const res = await request(app)
        .get('/api/v1/roadmaps/generate/status/non_existent_job_12345')
        .expect(404);

      expect(res.body.success).toBe(false);
    });

    it('POST /roadmaps/generate should reject request with missing goalText', async () => {
      const res = await request(app)
        .post('/api/v1/roadmaps/generate')
        .send({})
        .expect(400);

      expect(res.body.success).toBe(false);
    });
  });
});
