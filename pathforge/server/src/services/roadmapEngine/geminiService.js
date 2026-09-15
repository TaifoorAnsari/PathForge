/**
 * Gemini Roadmap Generation Service
 * 
 * Core AI generation service implementing Step 3 of the Roadmap Engine (Section 7):
 * - Connects to Google's Generative AI SDK using gemini-3.6-flash.
 * - Forces structured JSON response schema adhering to RoadmapNodeSchema:
 *   nodes: [{ order, title, description, estimatedHours, resources: [...], quizQuestions: [...] }]
 * - Adapts content to user's skillLevel, hoursPerWeek, and learningStyle.
 * - Graceful fallback to domain-adaptive deterministic blueprint when GEMINI_API_KEY
 *   is missing or network fails.
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const { env } = require('../../config/env');
const { logger } = require('../../config/logger');
const { validateLearningGoal } = require('./domainValidator');

let geminiClient = null;

const getGeminiClient = () => {
  if (geminiClient) return geminiClient;
  if (env.GEMINI_API_KEY && process.env.NODE_ENV !== 'test') {
    geminiClient = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  }
  return geminiClient;
};

/**
 * Builds the structured system prompt for Gemini — universal across all domains
 */
const buildPrompt = ({ goalText, skillLevel = 'beginner', hoursPerWeek = 10, learningStyle = 'hands-on' }) => {
  return `You are PathForge AI, a world-class adaptive curriculum architect and educator with deep expertise across every academic, professional, and creative discipline.

YOUR CORE CAPABILITY:
You can design expert-level learning roadmaps for ANY legitimate field of study — including but not limited to:
- Technology & Engineering (programming, DevOps, system design, robotics)
- Natural & Medical Sciences (biology, neuroscience, chemistry, physics, anatomy, medicine)
- Humanities & Social Sciences (history, philosophy, psychology, sociology, linguistics, political science)
- Business, Finance & Economics (investing, accounting, marketing, management, entrepreneurship)
- Arts & Creative Skills (music, drawing, painting, filmmaking, creative writing, photography)
- Mathematics & Formal Sciences (calculus, statistics, linear algebra, discrete math, logic)
- Languages (English, Spanish, Mandarin, etc.)
- Practical & Vocational Skills (cooking, public speaking, leadership, carpentry, fitness)

IMPORTANT: You MUST adapt your language, milestones, resources, and quiz questions to the SPECIFIC DOMAIN of the student's goal. For example:
- For "human brain": use neuroscience terminology (neurons, synapses, cortex, neurotransmitters), NOT programming terms.
- For "world history": use historical methodology (primary sources, periodization, historiography), NOT coding terms.
- For "guitar": use music terminology (chords, scales, fingerpicking, rhythm), NOT software engineering terms.
- For "stock market": use financial terminology (equities, P/E ratio, diversification, market cap), NOT deployment terms.

CRITICAL ACADEMIC VALIDITY GUARDRAIL:
First, inspect the student's learning goal: "${goalText}".
Determine if "${goalText}" is a genuine, recognizable academic subject, science, engineering, mathematics, humanities, business, creative art, language, or professional skill.
If the goal is:
- Vulgarity, profanity, swearing, or aggressive slang (e.g. "what the hell", "wtf", "damn"),
- Conversational chat, questions, or nonsense (e.g. "who are you", "what is this", "tell me a joke", "hello"),
- A feeling, mood, biological need, or sleep (e.g. "i wanna sleep", "i am hungry", "i feel lazy"),
- Casual leisure, gaming, or sports without academic study context (e.g. "football", "play minecraft", "watch anime"),
- Or gibberish/non-educational text:

You MUST immediately reject it and return ONLY the following JSON object:
{
  "isValidTopic": false,
  "error": "INVALID_STUDY_TOPIC",
  "message": "The topic \\"${goalText}\\" is not recognized as a valid study subject or course. Please provide a genuine academic subject, technology, or professional skill (e.g. React & Node.js, Human Brain, World History, Guitar, or Financial Accounting)."
}

If and ONLY if the goal is a legitimate educational topic, generate a comprehensive learning roadmap:
- Learning Goal: "${goalText}"
- Current Skill Level: ${skillLevel}
- Available Study Commitment: ${hoursPerWeek} hours per week
- Preferred Learning Style: ${learningStyle} (prioritize matching resources: 'video' for visual, 'article'/'doc' for reading, and project-based for hands-on)

Generate between 4 and 6 sequential milestone nodes.
Each milestone MUST have:
1. order: (integer starting at 1)
2. title: (concise, professional milestone title using DOMAIN-APPROPRIATE terminology)
3. description: (detailed 2-3 sentence overview of concepts to master, using terminology authentic to the subject domain)
4. estimatedHours: (realistic hours based on total ${hoursPerWeek} hrs/week pacing)
5. topics: (array of 3 to 4 sequential, granular sub-topics covering every key topic of this milestone in detail)
   Each topic object MUST have:
   - title: (clear sub-topic title using domain-appropriate terminology, e.g. "Neuronal Structure & Synaptic Transmission" for neuroscience, "JSX Syntax & Virtual DOM" for React)
   - description: (detailed 2-sentence explanation of what to learn and why it matters)
   - keyConcepts: (array of 3-4 key takeaways/principles to master)
   - resources: (array of 2-3 specific learning resources for THIS specific topic:
     - 1 video tutorial: "type": "video", "duration": "15-30 min video", "difficulty": "${skillLevel.charAt(0).toUpperCase() + skillLevel.slice(1)}", "isStartHere": true, "source": "ai_suggested"
     - 1 official reference/documentation/textbook: "type": "doc", "duration": "Reference doc", "isOfficialDoc": true, "source": "ai_suggested"
     - 1 hands-on practice or deep-dive article: "type": "interactive" or "article", "duration": "15-20 min", "source": "ai_suggested"
   - isCompleted: false
6. resources: (array of 2-3 milestone-level overview resources for quick high-level reference:
   - 1 primary video/article matching learning style with "isStartHere": true
   - 1 official documentation/textbook reference with "isOfficialDoc": true
7. quizQuestions: (array of 3 diverse multiple-choice questions testing:
   - Question 1: Core foundational concept of this domain
   - Question 2: Core methodology, analytical technique, or practical application
   - Question 3: Common misconception, pitfall, or best practice
   Each with: question, options [4 distinct options], correctIndex (0-indexed), and detailed explanation)

Return ONLY a valid JSON object with the exact keys:
{
  "isValidTopic": true,
  "title": "Clear roadmap title",
  "category": "High-level category (e.g. Web Development, Neuroscience, World History, Financial Markets, Music Theory, Abstract Algebra)",
  "description": "2-3 sentence curriculum overview",
  "nodes": [...]
}
Do not enclose in markdown code fences. Output raw JSON only.`;
};

// ─────────────────────────────────────────────────────────────────────────────
// Domain Detection
// ─────────────────────────────────────────────────────────────────────────────

const DOMAIN_KEYWORDS = {
  technology: [
    'javascript', 'typescript', 'python', 'java', 'c++', 'cpp', 'c#', 'csharp', 'golang', 'go',
    'rust', 'ruby', 'php', 'swift', 'kotlin', 'scala', 'dart', 'sql', 'nosql', 'html', 'css',
    'react', 'vue', 'angular', 'svelte', 'nextjs', 'nuxt', 'nodejs', 'node', 'express', 'nestjs',
    'django', 'fastapi', 'flask', 'spring', 'rails', 'laravel', 'graphql', 'rest', 'api',
    'mongodb', 'postgresql', 'mysql', 'redis', 'database', 'frontend', 'backend', 'fullstack',
    'web', 'mobile', 'android', 'ios', 'flutter', 'react native', 'devops', 'cloud', 'aws',
    'azure', 'gcp', 'docker', 'kubernetes', 'terraform', 'linux', 'git', 'github', 'ci/cd',
    'microservices', 'system design', 'cybersecurity', 'blockchain', 'web3', 'solidity',
    'testing', 'qa', 'automation', 'programming', 'coding', 'software', 'compiler', 'runtime',
    'framework', 'library', 'operating system', 'computer network', 'embedded systems', 'iot',
    'robotics', 'data engineering', 'hadoop', 'spark', 'kafka', 'etl',
  ],
  science: [
    'biology', 'chemistry', 'physics', 'anatomy', 'physiology', 'neuroscience', 'brain',
    'human brain', 'neurology', 'genetics', 'genomics', 'biotechnology', 'bioinformatics',
    'cell biology', 'molecular biology', 'microbiology', 'biochemistry', 'organic chemistry',
    'inorganic chemistry', 'pharmacology', 'pathology', 'immunology', 'epidemiology',
    'ecology', 'evolution', 'zoology', 'botany', 'astronomy', 'astrophysics',
    'quantum computing', 'quantum mechanics', 'thermodynamics', 'optics', 'electromagnetism',
    'mechanics', 'environmental science', 'earth science', 'geology', 'oceanography',
    'meteorology', 'paleontology', 'medicine', 'clinical', 'biomedical',
  ],
  humanities: [
    'history', 'world history', 'philosophy', 'psychology', 'sociology', 'linguistics',
    'literature', 'political science', 'anthropology', 'geography', 'international relations',
    'public policy', 'criminology', 'education', 'pedagogy', 'law', 'jurisprudence',
    'theology', 'ethics', 'cultural studies', 'gender studies', 'archaeology',
  ],
  business: [
    'finance', 'accounting', 'economics', 'microeconomics', 'macroeconomics',
    'entrepreneurship', 'marketing', 'digital marketing', 'seo', 'copywriting',
    'product management', 'project management', 'agile', 'scrum',
    'stock market', 'investing', 'trading', 'supply chain', 'human resources',
    'management', 'business', 'real estate', 'taxation', 'banking', 'consulting',
    'business intelligence',
  ],
  arts: [
    'music', 'music production', 'guitar', 'piano', 'singing', 'music theory',
    'drawing', 'painting', 'sculpture', 'graphic design', 'animation', 'video editing',
    'photography', 'blender', '3d modeling', 'game development', 'unity', 'unreal engine',
    'creative writing', 'film', 'filmmaking', 'acting', 'dance', 'pottery', 'calligraphy',
    'ui', 'ux', 'ui/ux', 'user experience', 'user interface', 'figma', 'product design',
  ],
  math: [
    'mathematics', 'algebra', 'linear algebra', 'calculus', 'geometry', 'topology',
    'statistics', 'probability', 'discrete math', 'boolean algebra', 'number theory',
    'combinatorics', 'differential equations', 'numerical analysis', 'mathematical logic',
    'abstract algebra', 'real analysis', 'complex analysis', 'graph theory',
    'data structures', 'algorithms', 'dsa', 'computer science',
    'machine learning', 'deep learning', 'ai', 'artificial intelligence', 'data science',
    'nlp', 'natural language processing', 'computer vision', 'data analytics',
    'neural networks', 'large language models', 'generative ai', 'prompt engineering',
  ],
};

/**
 * Detects the academic domain of a learning goal by keyword matching.
 * Returns one of: 'technology', 'science', 'humanities', 'business', 'arts', 'math', 'general'
 */
const detectDomain = (goalText) => {
  const lower = goalText.toLowerCase().trim();
  const scores = {};

  for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
    scores[domain] = 0;
    for (const keyword of keywords) {
      if (lower === keyword || lower.includes(keyword)) {
        // Exact match gets higher score; longer keyword matches are more specific
        scores[domain] += keyword.split(' ').length;
      }
    }
  }

  const best = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  if (best[0][1] > 0) return best[0][0];
  return 'general';
};

// ─────────────────────────────────────────────────────────────────────────────
// Resource Helper
// ─────────────────────────────────────────────────────────────────────────────

const makeResource = (title, goalText, searchSuffix, type, duration, difficulty, opts = {}) => ({
  title,
  url: type === 'video'
    ? `https://www.youtube.com/results?search_query=${encodeURIComponent(goalText + ' ' + searchSuffix)}`
    : `https://duckduckgo.com/?q=${encodeURIComponent(goalText + ' ' + searchSuffix)}`,
  type,
  duration,
  difficulty,
  isStartHere: opts.isStartHere || false,
  isOfficialDoc: opts.isOfficialDoc || false,
  source: 'ai_suggested',
});

// ─────────────────────────────────────────────────────────────────────────────
// Domain-Specific Milestone Templates
// ─────────────────────────────────────────────────────────────────────────────
// Each domain defines 4 milestones. Each milestone has:
//   title, description, topics (3 each), quizQuestions (3 each)
// $G = goalText, $C = capitalized goalText — replaced at generation time

const getDomainMilestones = (domain, goalText, skillLevel) => {
  const cap = goalText.charAt(0).toUpperCase() + goalText.slice(1);
  const g = goalText;

  const TEMPLATES = {
    // ── TECHNOLOGY ──────────────────────────────────────────────────────────
    technology: [
      {
        title: `${cap} Core Foundations & Environment Setup`,
        description: `Set up your development environment, understand core concepts, and master fundamental syntax and paradigms of ${g}.`,
        topics: [
          {
            title: `${cap} Development Tooling & Environment Setup`,
            description: `Install compilers, runtimes, linters, and configure your local workspace for ${g} development.`,
            keyConcepts: ['Toolchain & runtime installation', 'Package management and workspace configuration', 'IDE extensions & debugging tools'],
            resources: [
              makeResource(`${cap} Complete Setup & Hello World`, g, 'environment setup tutorial', 'video', '20 min video', 'Beginner', { isStartHere: true }),
              makeResource(`Official ${cap} Getting Started Guide`, g, 'official getting started', 'doc', 'Reference doc', 'Beginner', { isOfficialDoc: true }),
              makeResource(`${cap} Interactive Sandbox Practice`, g, 'interactive sandbox exercises', 'interactive', '15 min practice', 'Beginner'),
            ],
            isCompleted: false,
          },
          {
            title: `Core Syntax, Data Types & Variables`,
            description: `Understand variable scoping, primary data types, operators, and basic statements in ${g}.`,
            keyConcepts: ['Strong vs dynamic typing paradigms', 'Memory allocation for primitives', 'Lexical scoping and hoisting'],
            resources: [
              makeResource(`${cap} Syntax & Data Types Deep Dive`, g, 'syntax data types tutorial', 'video', '25 min video', 'Beginner', { isStartHere: true }),
              makeResource(`Language Specifications & Syntax Reference`, g, 'syntax language reference', 'doc', '15 min read', 'Beginner', { isOfficialDoc: true }),
            ],
            isCompleted: false,
          },
          {
            title: `Control Flow, Functions & Modular Constructs`,
            description: `Master condition branches, loops, function declarations, parameters, and error handling fundamentals.`,
            keyConcepts: ['Pure functions and side effects', 'Branching execution & recursion', 'Handling runtime exceptions'],
            resources: [
              makeResource(`${cap} Control Flow & Functions Masterclass`, g, 'functions control flow', 'video', '30 min video', 'Beginner'),
              makeResource(`Hands-on Code Drills: Functions in ${cap}`, g, 'coding challenges functions', 'interactive', '20 min practice', 'Beginner'),
            ],
            isCompleted: false,
          },
        ],
        quizQuestions: [
          { question: `What is the foundational first step when starting with ${g}?`, options: ['Deploy directly to production servers', 'Understand core concepts, runtime environment, and directory tooling', 'Memorize all standard library functions', 'Skip syntax and write complex algorithms'], correctIndex: 1, explanation: 'Setting up the correct environment and grasping fundamental paradigms prevents downstream issues.' },
          { question: `Why is practicing with small isolated exercises effective in ${g}?`, options: ['It eliminates the need for testing', 'It reinforces syntax memory and clarifies error diagnostics', 'It requires no documentation', 'It completes the entire roadmap'], correctIndex: 1, explanation: 'Targeted drills build muscle memory and familiarity with debugging tools.' },
          { question: `Which approach is considered a best practice for managing errors in ${g}?`, options: ['Suppress all runtime exceptions silently', 'Catch exceptions at appropriate boundaries and provide descriptive error messages', 'Rely entirely on browser console warnings', 'Restart the server on every error'], correctIndex: 1, explanation: 'Structured error handling allows graceful degradation and clear logging for diagnosis.' },
        ],
      },
      {
        title: `Intermediate ${cap} Architecture & Patterns`,
        description: `Deepen your knowledge with design patterns, asynchronous workflows, data structures, and best practices in ${g}.`,
        topics: [
          {
            title: `Modular Architecture & File Organization`,
            description: `Structure real-world ${g} projects using design patterns, separation of concerns, and reusable modules.`,
            keyConcepts: ['Single responsibility principle', 'Import/export conventions', 'Dependency management'],
            resources: [
              makeResource(`${cap} Project Architecture Guide`, g, 'project architecture patterns', 'video', '25 min video', 'Intermediate', { isStartHere: true }),
              makeResource(`Official Architectural Style Guide for ${cap}`, g, 'style guide architecture', 'doc', 'Reference doc', 'Intermediate', { isOfficialDoc: true }),
            ],
            isCompleted: false,
          },
          {
            title: `Asynchronous Workflows, Events & Streams`,
            description: `Handle concurrency, non-blocking I/O, event loops, promises/futures, and data streams effectively.`,
            keyConcepts: ['Concurrency vs parallelism', 'Error propagation in async flows', 'Memory-safe streaming'],
            resources: [
              makeResource(`Async Programming & Streams in ${cap}`, g, 'async programming streams', 'video', '30 min video', 'Intermediate'),
              makeResource(`Async Patterns In-Depth Article`, g, 'async await patterns article', 'article', '15 min read', 'Intermediate'),
            ],
            isCompleted: false,
          },
          {
            title: `State Management & Data Structures`,
            description: `Design efficient in-memory data representations and state synchronization mechanisms.`,
            keyConcepts: ['Immutable state paradigms', 'Lookup optimization with maps/sets', 'Garbage collection considerations'],
            resources: [
              makeResource(`${cap} State Management Patterns`, g, 'state management data structures', 'video', '20 min video', 'Intermediate'),
              makeResource(`Interactive State & Data Modeling`, g, 'state exercises', 'interactive', '20 min practice', 'Intermediate'),
            ],
            isCompleted: false,
          },
        ],
        quizQuestions: [
          { question: `What is the primary benefit of adhering to standard patterns in ${g}?`, options: ['Code looks more complex', 'Improved maintainability, readability, and team scalability', 'Faster download times', 'Guaranteed zero bugs'], correctIndex: 1, explanation: 'Standard conventions reduce cognitive overhead and make applications maintainable.' },
          { question: `When modularizing code in ${g}, what key principle should be preserved?`, options: ['High coupling and low cohesion', 'Single responsibility and clear separation of concerns', 'Writing all logic in a single file', 'Avoiding parameter passing'], correctIndex: 1, explanation: 'Separation of concerns ensures modules can be developed, tested, and maintained independently.' },
          { question: `How should dependencies be managed across modules?`, options: ['Hardcode implementations inside calling classes', 'Use dependency injection or standard modular imports', 'Duplicate code across modules', 'Store all dependencies in global variables'], correctIndex: 1, explanation: 'Injecting or explicitly importing dependencies enables easy mocking and modular testing.' },
        ],
      },
      {
        title: `Performance, Testing & Security in ${cap}`,
        description: `Implement unit and integration testing, memory and query profiling, and security defenses specific to ${g}.`,
        topics: [
          {
            title: `Automated Unit Testing & Mocking`,
            description: `Set up test runners, write comprehensive assertions, and mock external service dependencies.`,
            keyConcepts: ['Test-driven design', 'Mocking I/O and network boundaries', 'Code coverage metrics'],
            resources: [
              makeResource(`${cap} Unit Testing Crash Course`, g, 'unit testing guide', 'video', '30 min video', 'Intermediate', { isStartHere: true }),
              makeResource(`Official Testing Framework Documentation`, g, 'testing framework docs', 'doc', 'Reference doc', 'Intermediate', { isOfficialDoc: true }),
            ],
            isCompleted: false,
          },
          {
            title: `Performance Profiling & Optimization`,
            description: `Profile CPU bottlenecks, benchmark algorithms, and inspect heap allocations to optimize throughput.`,
            keyConcepts: ['CPU time profiling', 'Detecting memory leaks', 'Cache invalidation strategies'],
            resources: [
              makeResource(`Profiling & Optimizing ${cap} Applications`, g, 'performance profiling optimization', 'video', '25 min video', 'Advanced'),
              makeResource(`High-Performance Engineering Article`, g, 'performance optimization best practices', 'article', '18 min read', 'Advanced'),
            ],
            isCompleted: false,
          },
          {
            title: `Security Hardening & Input Sanitization`,
            description: `Defend against injection vulnerabilities, implement authentication tokens, and audit dependencies.`,
            keyConcepts: ['Sanitizing untrusted inputs', 'OWASP vulnerability defenses', 'Secret management & HTTPS enforcement'],
            resources: [
              makeResource(`${cap} Security Checklist`, g, 'security best practices owasp', 'article', '20 min read', 'Advanced'),
              makeResource(`Hands-on Security Audit Exercises`, g, 'security audit lab', 'interactive', '25 min practice', 'Advanced'),
            ],
            isCompleted: false,
          },
        ],
        quizQuestions: [
          { question: `Why is automated testing critical before shipping ${g} projects?`, options: ['It generates documentation automatically', 'It catches regressions early and enables fearless refactoring', 'It eliminates server hosting costs', 'It replaces code linting'], correctIndex: 1, explanation: 'Automated test suites verify system behavior and prevent breaking regressions.' },
          { question: `What distinguishes integration tests from unit tests?`, options: ['Integration tests run faster', 'Integration tests verify combined interactions between modules or external services', 'Unit tests test the whole application simultaneously', 'Integration tests never use database connections'], correctIndex: 1, explanation: 'Unit tests isolate individual functions, whereas integration tests evaluate how components collaborate.' },
          { question: `What is the most common vulnerability vector when handling user inputs?`, options: ['Improper validation and unescaped input interpolation', 'Using HTTPS encryption', 'Storing data in JSON format', 'Using strong password hashes'], correctIndex: 0, explanation: 'Unsanitized input can lead to injection attacks, XSS, or memory corruption.' },
        ],
      },
      {
        title: `Capstone Project & Production Deployment`,
        description: `Build a production-ready ${g} application end-to-end, configure CI/CD automation, and deploy live.`,
        topics: [
          {
            title: `Production Architecture & Capstone Design`,
            description: `Architect a full-scale ${g} application adhering to industry standards and clean architecture paradigms.`,
            keyConcepts: ['Domain-driven modeling', 'Scalable component design', 'End-to-end telemetry'],
            resources: [
              makeResource(`Building a Production-Grade ${cap} App`, g, 'full capstone project tutorial', 'video', '45 min video', 'Advanced', { isStartHere: true }),
              makeResource(`System Architecture Case Study`, g, 'production architecture case study', 'article', '20 min read', 'Advanced'),
            ],
            isCompleted: false,
          },
          {
            title: `Containerization & Infrastructure`,
            description: `Package your application into reproducible container images with multi-stage builds.`,
            keyConcepts: ['Container isolation & layers', 'Optimizing image size', 'Environment variable injection'],
            resources: [
              makeResource(`Dockerizing ${cap} Applications`, 'dockerize ' + g, 'tutorial', 'video', '25 min video', 'Intermediate'),
              makeResource(`Official Docker Multi-Stage Guide`, '', '', 'doc', 'Reference doc', 'Intermediate', { isOfficialDoc: true }),
            ],
            isCompleted: false,
          },
          {
            title: `CI/CD Automation & Cloud Deployment`,
            description: `Configure automated pipelines to test, build, and deploy live to cloud infrastructure.`,
            keyConcepts: ['Continuous integration pipelines', 'Zero-downtime releases', 'Cloud hosting & DNS setup'],
            resources: [
              makeResource(`CI/CD Pipeline Setup for ${cap}`, 'github actions cicd ' + g, '', 'video', '30 min video', 'Advanced'),
              makeResource(`Interactive Cloud Deployment Lab`, g, 'cloud deployment guide', 'interactive', '30 min practice', 'Advanced'),
            ],
            isCompleted: false,
          },
        ],
        quizQuestions: [
          { question: `What is the primary benefit of containerizing a ${g} application?`, options: ['Guaranteed consistency across dev, staging, and production', 'Elimination of source code', 'It makes code run 100x faster', 'It removes the need for environment variables'], correctIndex: 0, explanation: 'Containers bundle code with dependencies, avoiding "works on my machine" issues.' },
          { question: `Why is CI/CD automation valuable in release cycles?`, options: ['It automates linting, testing, and deployment for stable releases', 'It replaces version control', 'It writes unit tests automatically', 'It guarantees zero downtime without monitoring'], correctIndex: 0, explanation: 'CI/CD pipelines automate testing and deployment for continuous delivery.' },
          { question: `Which monitoring metric is most critical for detecting production outages?`, options: ['Number of comments in the git repo', 'HTTP 5xx error rate, request latency, and health checks', 'Total lines of CSS in the bundle', 'Developer workstation OS version'], correctIndex: 1, explanation: 'Error rates and latency are direct signals of user-facing system degradation.' },
        ],
      },
    ],

    // ── NATURAL & MEDICAL SCIENCES ─────────────────────────────────────────
    science: [
      {
        title: `Foundations & Core Terminology of ${cap}`,
        description: `Build a solid foundation by learning essential terminology, classification systems, and the historical development of ${g}.`,
        topics: [
          {
            title: `Historical Background & Pioneers of ${cap}`,
            description: `Understand the key discoveries and scientists who shaped our understanding of ${g}. Historical context provides the framework for modern concepts.`,
            keyConcepts: ['Key historical discoveries', 'Influential scientists and researchers', 'Evolution of the field over time'],
            resources: [
              makeResource(`${cap} History & Key Discoveries`, g, 'history discoveries documentary', 'video', '20 min video', 'Beginner', { isStartHere: true }),
              makeResource(`${cap} Textbook Introduction`, g, 'textbook introduction fundamentals', 'doc', 'Reference doc', 'Beginner', { isOfficialDoc: true }),
              makeResource(`Interactive ${cap} Timeline`, g, 'interactive timeline history', 'interactive', '15 min practice', 'Beginner'),
            ],
            isCompleted: false,
          },
          {
            title: `Fundamental Principles & Definitions`,
            description: `Master the core vocabulary, laws, and definitions that form the bedrock of ${g}. Precise terminology is essential for advanced study.`,
            keyConcepts: ['Core scientific definitions', 'Fundamental laws and principles', 'Standard units and measurement'],
            resources: [
              makeResource(`${cap} Core Concepts Explained`, g, 'fundamental concepts explained', 'video', '25 min video', 'Beginner'),
              makeResource(`${cap} Glossary & Key Terms`, g, 'glossary key terms definitions', 'doc', '15 min read', 'Beginner', { isOfficialDoc: true }),
            ],
            isCompleted: false,
          },
          {
            title: `Classification Systems & Taxonomy`,
            description: `Learn how ${g} is organized into categories, types, and hierarchies to understand relationships between components.`,
            keyConcepts: ['Hierarchical classification', 'Nomenclature conventions', 'Comparative analysis across categories'],
            resources: [
              makeResource(`${cap} Classification & Taxonomy Overview`, g, 'classification taxonomy overview', 'video', '20 min video', 'Beginner'),
              makeResource(`${cap} Classification Exercises`, g, 'classification practice quiz', 'interactive', '15 min practice', 'Beginner'),
            ],
            isCompleted: false,
          },
        ],
        quizQuestions: [
          { question: `Why is learning precise terminology important when studying ${g}?`, options: ['It makes essays longer', 'It enables clear communication and accurate understanding of concepts', 'It is only needed for exams', 'Terminology is optional in science'], correctIndex: 1, explanation: 'Precise scientific terminology prevents miscommunication and is essential for understanding literature.' },
          { question: `What role does classification play in ${g}?`, options: ['It makes the subject harder to learn', 'It organizes knowledge into logical groups for easier study and comparison', 'Classification is only used in biology', 'It replaces the need for experimentation'], correctIndex: 1, explanation: 'Classification systems help organize complex information into understandable hierarchies.' },
          { question: `Why is historical context valuable when studying ${g}?`, options: ['It is not valuable — only current research matters', 'It shows how knowledge evolved and provides insight into why concepts are structured as they are', 'History is only for humanities students', 'It makes the subject easier to memorize'], correctIndex: 1, explanation: 'Understanding how discoveries were made helps grasp why modern theories exist and their limitations.' },
        ],
      },
      {
        title: `Structural Systems & Mechanisms in ${cap}`,
        description: `Study the internal structures, functional pathways, and mechanistic processes that govern how ${g} works at fundamental levels.`,
        topics: [
          {
            title: `Anatomical & Structural Organization`,
            description: `Explore the physical structures, components, and organizational levels relevant to ${g}. Understanding structure is key to understanding function.`,
            keyConcepts: ['Levels of structural organization', 'Component identification and labeling', 'Structure-function relationships'],
            resources: [
              makeResource(`${cap} Structural Anatomy Explained`, g, 'anatomy structure explained', 'video', '30 min video', 'Intermediate', { isStartHere: true }),
              makeResource(`${cap} Anatomy Atlas & Diagrams`, g, 'anatomy atlas diagrams reference', 'doc', 'Reference doc', 'Intermediate', { isOfficialDoc: true }),
            ],
            isCompleted: false,
          },
          {
            title: `Functional Processes & Pathways`,
            description: `Understand the dynamic processes, signaling pathways, and mechanisms through which ${g} functions and responds.`,
            keyConcepts: ['Signal transduction pathways', 'Feedback loops and regulation', 'Energy transfer and transformation'],
            resources: [
              makeResource(`${cap} Functional Mechanisms Deep Dive`, g, 'mechanisms pathways processes', 'video', '25 min video', 'Intermediate'),
              makeResource(`${cap} Processes Interactive Simulation`, g, 'interactive simulation processes', 'interactive', '20 min practice', 'Intermediate'),
            ],
            isCompleted: false,
          },
          {
            title: `Interactions & Regulatory Systems`,
            description: `Learn how different components of ${g} interact, regulate each other, and maintain balance within larger systems.`,
            keyConcepts: ['Homeostasis and equilibrium', 'Regulatory feedback mechanisms', 'System-level interactions'],
            resources: [
              makeResource(`${cap} Systems Interactions Explained`, g, 'systems interactions regulation', 'video', '25 min video', 'Intermediate'),
              makeResource(`${cap} Regulatory Systems Article`, g, 'regulation homeostasis article', 'article', '18 min read', 'Intermediate'),
            ],
            isCompleted: false,
          },
        ],
        quizQuestions: [
          { question: `Why is understanding structure important when studying ${g}?`, options: ['Structure is unrelated to function', 'Structure directly determines and constrains function', 'Only advanced researchers need structural knowledge', 'Structure is the same across all organisms'], correctIndex: 1, explanation: 'In science, form follows function — structural organization directly determines how systems operate.' },
          { question: `What is the role of feedback loops in ${g}?`, options: ['They cause systems to fail', 'They regulate processes to maintain stability and homeostasis', 'They only exist in engineering, not science', 'They make systems unpredictable'], correctIndex: 1, explanation: 'Feedback loops are fundamental regulatory mechanisms that maintain balance in biological and physical systems.' },
          { question: `How do different components of ${g} typically interact?`, options: ['They function in complete isolation', 'Through chemical signals, physical forces, or energy transfer that create integrated systems', 'Interactions only matter at the molecular level', 'Components never affect each other'], correctIndex: 1, explanation: 'Scientific systems are interconnected — components interact through multiple mechanisms to produce emergent behaviors.' },
        ],
      },
      {
        title: `Experimental Methods & Analysis in ${cap}`,
        description: `Learn the scientific methods, laboratory techniques, data collection strategies, and statistical analysis used in ${g} research.`,
        topics: [
          {
            title: `Research Methodology & Experimental Design`,
            description: `Understand how to design controlled experiments, form testable hypotheses, and apply the scientific method to ${g}.`,
            keyConcepts: ['Hypothesis formulation', 'Controlled variables and experimental groups', 'Reproducibility and peer review'],
            resources: [
              makeResource(`${cap} Research Methods Guide`, g, 'research methodology experimental design', 'video', '25 min video', 'Intermediate', { isStartHere: true }),
              makeResource(`Scientific Method & ${cap} Experiments`, g, 'scientific method guide', 'doc', 'Reference doc', 'Intermediate', { isOfficialDoc: true }),
            ],
            isCompleted: false,
          },
          {
            title: `Data Collection & Laboratory Techniques`,
            description: `Learn essential techniques for gathering reliable data and performing precise measurements in ${g}.`,
            keyConcepts: ['Measurement precision and accuracy', 'Standard laboratory protocols', 'Safety and ethical considerations'],
            resources: [
              makeResource(`${cap} Lab Techniques Demonstration`, g, 'laboratory techniques tutorial', 'video', '30 min video', 'Intermediate'),
              makeResource(`${cap} Lab Manual & Protocols`, g, 'lab manual protocols', 'doc', 'Reference doc', 'Intermediate', { isOfficialDoc: true }),
            ],
            isCompleted: false,
          },
          {
            title: `Statistical Analysis & Data Interpretation`,
            description: `Apply statistical methods to analyze experimental data, identify patterns, and draw valid conclusions in ${g}.`,
            keyConcepts: ['Descriptive vs inferential statistics', 'P-values and significance testing', 'Data visualization and reporting'],
            resources: [
              makeResource(`Statistics for ${cap} Research`, g, 'statistics data analysis research', 'video', '25 min video', 'Intermediate'),
              makeResource(`${cap} Data Analysis Practice Problems`, g, 'data analysis practice exercises', 'interactive', '20 min practice', 'Intermediate'),
            ],
            isCompleted: false,
          },
        ],
        quizQuestions: [
          { question: `What makes a scientific hypothesis valid in ${g}?`, options: ['It must be proven true', 'It must be testable, falsifiable, and based on observation', 'It must be popular among scientists', 'It must use complex mathematics'], correctIndex: 1, explanation: 'A valid hypothesis must be testable and capable of being disproven through experimentation.' },
          { question: `Why are controlled experiments essential in ${g}?`, options: ['They are faster than observational studies', 'They isolate variables to establish cause-and-effect relationships', 'Controls are optional in modern science', 'They eliminate all errors'], correctIndex: 1, explanation: 'Controlled experiments allow researchers to isolate variables and determine causation, not just correlation.' },
          { question: `What does a p-value of less than 0.05 indicate?`, options: ['The result is 95% accurate', 'There is less than a 5% probability the result occurred by chance, suggesting statistical significance', 'The experiment failed', 'The hypothesis is proven true'], correctIndex: 1, explanation: 'A p-value below 0.05 means the results are statistically significant — unlikely to be due to random chance.' },
        ],
      },
      {
        title: `Advanced Applications & Research Frontiers in ${cap}`,
        description: `Explore cutting-edge research, clinical applications, and interdisciplinary connections in ${g}.`,
        topics: [
          {
            title: `Clinical & Applied Applications`,
            description: `Discover how ${g} knowledge translates into real-world applications, treatments, technologies, and solutions.`,
            keyConcepts: ['Translational research', 'Applied vs basic science', 'Real-world impact and case studies'],
            resources: [
              makeResource(`${cap} Real-World Applications`, g, 'applications clinical real world', 'video', '30 min video', 'Advanced', { isStartHere: true }),
              makeResource(`${cap} Applied Research Review`, g, 'applied research review article', 'article', '20 min read', 'Advanced'),
            ],
            isCompleted: false,
          },
          {
            title: `Current Research & Emerging Discoveries`,
            description: `Stay current with the latest breakthroughs, publications, and open questions in ${g} research.`,
            keyConcepts: ['Recent breakthrough discoveries', 'Open research questions', 'Emerging technologies and methods'],
            resources: [
              makeResource(`Latest ${cap} Research Breakthroughs`, g, 'latest research breakthroughs 2024', 'video', '20 min video', 'Advanced'),
              makeResource(`${cap} Research Journals & Papers`, g, 'research journal papers latest', 'doc', 'Reference doc', 'Advanced', { isOfficialDoc: true }),
            ],
            isCompleted: false,
          },
          {
            title: `Interdisciplinary Connections & Future Directions`,
            description: `Explore how ${g} connects with other fields and where the discipline is heading in the future.`,
            keyConcepts: ['Cross-disciplinary applications', 'Ethical considerations', 'Future research directions'],
            resources: [
              makeResource(`${cap} Interdisciplinary Frontiers`, g, 'interdisciplinary connections future', 'video', '25 min video', 'Advanced'),
              makeResource(`Ethics & Future of ${cap}`, g, 'ethics future directions article', 'article', '15 min read', 'Advanced'),
            ],
            isCompleted: false,
          },
        ],
        quizQuestions: [
          { question: `What is translational research in ${g}?`, options: ['Research conducted in multiple languages', 'Research that bridges basic science discoveries to practical real-world applications', 'Research that only uses translation software', 'Research that has been translated from another field'], correctIndex: 1, explanation: 'Translational research moves discoveries from the laboratory to practical applications that benefit people.' },
          { question: `Why are ethical considerations important in ${g} research?`, options: ['Ethics slow down research unnecessarily', 'They ensure research protects participants, maintains integrity, and serves the public good', 'Ethics only apply to medical research', 'They are optional in modern science'], correctIndex: 1, explanation: 'Ethical frameworks protect research subjects, ensure data integrity, and maintain public trust in science.' },
          { question: `How does interdisciplinary study benefit ${g}?`, options: ['It makes the field more confusing', 'It brings new perspectives, methods, and tools that can solve previously intractable problems', 'Interdisciplinary work is discouraged in academia', 'It only benefits the other discipline, not this one'], correctIndex: 1, explanation: 'Combining insights from multiple fields often leads to breakthroughs that no single discipline could achieve alone.' },
        ],
      },
    ],

    // ── HUMANITIES & SOCIAL SCIENCES ───────────────────────────────────────
    humanities: [
      {
        title: `Historical Context & Key Concepts of ${cap}`,
        description: `Explore the origins, historical development, and foundational concepts that define ${g} as a field of study.`,
        topics: [
          { title: `Origins & Historical Development of ${cap}`, description: `Trace the origins and major turning points in the development of ${g}. Understanding historical roots is essential for contextualizing modern thought.`, keyConcepts: ['Key historical periods', 'Founding figures and early thinkers', 'Evolution of the discipline'], resources: [makeResource(`${cap} Origins & History`, g, 'history origins development', 'video', '25 min video', 'Beginner', { isStartHere: true }), makeResource(`${cap} Introduction Textbook`, g, 'textbook introduction', 'doc', 'Reference doc', 'Beginner', { isOfficialDoc: true }), makeResource(`${cap} Historical Timeline`, g, 'timeline history interactive', 'interactive', '15 min practice', 'Beginner')], isCompleted: false },
          { title: `Core Terminology & Definitions`, description: `Master the essential vocabulary and definitions used by scholars in ${g}. Clear terminology is the foundation for academic discourse.`, keyConcepts: ['Discipline-specific vocabulary', 'Precise definitions and distinctions', 'Usage in academic writing'], resources: [makeResource(`${cap} Key Terms Explained`, g, 'key terms definitions explained', 'video', '20 min video', 'Beginner'), makeResource(`${cap} Glossary & Reference Guide`, g, 'glossary reference guide', 'doc', '15 min read', 'Beginner', { isOfficialDoc: true })], isCompleted: false },
          { title: `Major Periods, Movements & Themes`, description: `Identify the major periods, movements, and recurring themes that structure the study of ${g}.`, keyConcepts: ['Periodization and chronology', 'Major intellectual movements', 'Recurring themes and debates'], resources: [makeResource(`${cap} Major Movements Overview`, g, 'major movements periods overview', 'video', '25 min video', 'Beginner'), makeResource(`${cap} Thematic Study Guide`, g, 'thematic study guide', 'article', '15 min read', 'Beginner')], isCompleted: false },
        ],
        quizQuestions: [
          { question: `Why is historical context important when studying ${g}?`, options: ['It is only relevant for history students', 'It provides essential background for understanding how current ideas and debates emerged', 'Historical context is outdated and irrelevant', 'It replaces the need for critical analysis'], correctIndex: 1, explanation: 'Historical context shows how ideas developed and why current debates exist in their present form.' },
          { question: `What is the purpose of periodization in ${g}?`, options: ['To make the subject harder', 'To organize events and ideas into meaningful chronological frameworks for analysis', 'Periodization is arbitrary and useless', 'To memorize dates for exams'], correctIndex: 1, explanation: 'Periodization helps scholars organize complex historical information into analyzable time periods.' },
          { question: `Why is precise terminology important in ${g}?`, options: ['To sound more academic', 'To enable clear communication, avoid ambiguity, and engage with scholarly literature', 'Terminology is optional in the humanities', 'It only matters in scientific fields'], correctIndex: 1, explanation: 'Precise vocabulary enables scholars to communicate complex ideas clearly and engage with existing research.' },
        ],
      },
      {
        title: `Major Theories & Influential Thinkers in ${cap}`,
        description: `Study the foundational theories, key thinkers, and competing schools of thought that have shaped ${g}.`,
        topics: [
          { title: `Foundational Theories & Frameworks`, description: `Examine the major theoretical frameworks that scholars use to analyze and interpret ${g}.`, keyConcepts: ['Major theoretical paradigms', 'Analytical frameworks', 'Theory application and limitations'], resources: [makeResource(`${cap} Major Theories Explained`, g, 'major theories frameworks explained', 'video', '30 min video', 'Intermediate', { isStartHere: true }), makeResource(`${cap} Theoretical Foundations Textbook`, g, 'theoretical foundations textbook', 'doc', 'Reference doc', 'Intermediate', { isOfficialDoc: true })], isCompleted: false },
          { title: `Key Figures & Their Contributions`, description: `Learn about the most influential thinkers and their lasting contributions to ${g}.`, keyConcepts: ['Biographical context of key figures', 'Major works and publications', 'Legacy and lasting influence'], resources: [makeResource(`Influential Thinkers in ${cap}`, g, 'influential thinkers figures contributions', 'video', '25 min video', 'Intermediate'), makeResource(`${cap} Key Figures Biography`, g, 'key figures biography contributions', 'article', '20 min read', 'Intermediate')], isCompleted: false },
          { title: `Competing Schools of Thought`, description: `Compare and contrast the major intellectual traditions and debates within ${g}.`, keyConcepts: ['Contrasting interpretations', 'Paradigm shifts', 'Ongoing academic debates'], resources: [makeResource(`Schools of Thought in ${cap}`, g, 'schools of thought debates comparison', 'video', '25 min video', 'Intermediate'), makeResource(`${cap} Debate Analysis Exercises`, g, 'critical debate analysis exercises', 'interactive', '20 min practice', 'Intermediate')], isCompleted: false },
        ],
        quizQuestions: [
          { question: `Why is it important to study multiple theoretical frameworks in ${g}?`, options: ['Only one theory can be correct', 'Different frameworks illuminate different aspects and provide richer understanding', 'Multiple theories are confusing and unnecessary', 'Theory is less important than memorizing facts'], correctIndex: 1, explanation: 'Multiple theoretical lenses provide complementary insights and deepen understanding.' },
          { question: `What is a paradigm shift in ${g}?`, options: ['A minor update to existing theory', 'A fundamental change in the basic concepts and practices of a discipline', 'A change in academic leadership', 'A new textbook edition'], correctIndex: 1, explanation: 'A paradigm shift represents a revolutionary change in how a field understands and approaches its subject matter.' },
          { question: `Why should we study the biographical context of key thinkers?`, options: ['Personal details are irrelevant to scholarship', 'Their context shaped their ideas and reveals biases, motivations, and limitations', 'Only to write biographical essays', 'It makes exams easier'], correctIndex: 1, explanation: 'Understanding a thinker\'s context helps us evaluate their ideas critically and recognize potential biases.' },
        ],
      },
      {
        title: `Critical Analysis & Research Methods in ${cap}`,
        description: `Develop analytical skills, learn research methodologies, and practice academic writing conventions used in ${g}.`,
        topics: [
          { title: `Primary vs Secondary Sources`, description: `Learn to identify, evaluate, and use primary and secondary sources effectively in ${g} research.`, keyConcepts: ['Source identification and classification', 'Evaluating reliability and bias', 'Contextualizing sources historically'], resources: [makeResource(`Source Analysis in ${cap}`, g, 'primary secondary source analysis', 'video', '25 min video', 'Intermediate', { isStartHere: true }), makeResource(`${cap} Source Evaluation Guide`, g, 'source evaluation methodology guide', 'doc', 'Reference doc', 'Intermediate', { isOfficialDoc: true })], isCompleted: false },
          { title: `Analytical Frameworks & Methodologies`, description: `Apply critical analytical methods to examine evidence, construct arguments, and evaluate claims in ${g}.`, keyConcepts: ['Critical thinking frameworks', 'Evidence-based argumentation', 'Identifying logical fallacies'], resources: [makeResource(`Critical Analysis Methods in ${cap}`, g, 'critical analysis methodology', 'video', '25 min video', 'Intermediate'), makeResource(`${cap} Analytical Writing Exercises`, g, 'analytical writing exercises practice', 'interactive', '20 min practice', 'Intermediate')], isCompleted: false },
          { title: `Academic Writing & Citation`, description: `Practice academic writing conventions, proper citation formats, and scholarly argumentation in ${g}.`, keyConcepts: ['Thesis construction', 'Citation styles (APA, MLA, Chicago)', 'Academic integrity and plagiarism avoidance'], resources: [makeResource(`Academic Writing for ${cap}`, g, 'academic writing citation guide', 'video', '20 min video', 'Intermediate'), makeResource(`Citation Style Guide`, g, 'citation style guide APA MLA Chicago', 'doc', '15 min read', 'Intermediate', { isOfficialDoc: true })], isCompleted: false },
        ],
        quizQuestions: [
          { question: `What distinguishes a primary source from a secondary source?`, options: ['Primary sources are always more reliable', 'Primary sources are original materials from the time period; secondary sources analyze or interpret them', 'There is no meaningful difference', 'Secondary sources are always longer'], correctIndex: 1, explanation: 'Primary sources are original documents or artifacts; secondary sources provide analysis and interpretation of them.' },
          { question: `Why is evidence-based argumentation essential in ${g}?`, options: ['Personal opinions are sufficient', 'It grounds claims in verifiable evidence, making arguments more convincing and rigorous', 'Evidence is only needed in science', 'It makes writing longer'], correctIndex: 1, explanation: 'Scholarly arguments must be supported by evidence to be credible and withstand peer scrutiny.' },
          { question: `Why is proper citation important in academic work?`, options: ['It fills up the bibliography page', 'It gives credit to original authors, allows verification, and avoids plagiarism', 'Citations are optional in the humanities', 'It makes the paper look more professional'], correctIndex: 1, explanation: 'Proper citation maintains academic integrity, gives credit, and enables readers to verify claims.' },
        ],
      },
      {
        title: `Contemporary Debates & Scholarly Practice in ${cap}`,
        description: `Engage with modern interpretations, current academic debates, and develop your own research voice in ${g}.`,
        topics: [
          { title: `Modern Interpretations & Revisionism`, description: `Examine how contemporary scholars reinterpret established narratives and challenge traditional views in ${g}.`, keyConcepts: ['Revisionist scholarship', 'Deconstructing dominant narratives', 'Incorporating marginalized perspectives'], resources: [makeResource(`Modern Interpretations in ${cap}`, g, 'modern interpretations revisionism', 'video', '25 min video', 'Advanced', { isStartHere: true }), makeResource(`${cap} Contemporary Scholarship Review`, g, 'contemporary scholarship review article', 'article', '20 min read', 'Advanced')], isCompleted: false },
          { title: `Current Debates & Open Questions`, description: `Explore the most active and contested debates happening in ${g} scholarship today.`, keyConcepts: ['Unresolved academic questions', 'Contested interpretations', 'Emerging research areas'], resources: [makeResource(`Current Debates in ${cap}`, g, 'current debates open questions', 'video', '20 min video', 'Advanced'), makeResource(`${cap} Academic Journals & Papers`, g, 'academic journal latest papers', 'doc', 'Reference doc', 'Advanced', { isOfficialDoc: true })], isCompleted: false },
          { title: `Research Project & Independent Study`, description: `Design and execute your own small-scale research project applying methodologies learned throughout your study of ${g}.`, keyConcepts: ['Research question formulation', 'Independent investigation', 'Presenting and defending findings'], resources: [makeResource(`Research Project Guide for ${cap}`, g, 'research project guide independent study', 'video', '30 min video', 'Advanced'), makeResource(`${cap} Research Proposal Template`, g, 'research proposal template', 'article', '15 min read', 'Advanced')], isCompleted: false },
        ],
        quizQuestions: [
          { question: `What is historical revisionism in ${g}?`, options: ['Denying established facts', 'Reexamining established interpretations using new evidence or perspectives', 'Rewriting textbooks with personal opinions', 'A conspiracy theory approach'], correctIndex: 1, explanation: 'Revisionism is a legitimate scholarly practice of reinterpreting history with new evidence or frameworks.' },
          { question: `Why is engaging with current debates valuable in ${g}?`, options: ['Debates are distractions from core knowledge', 'It develops critical thinking and connects you to the living scholarly community', 'Only professors need to follow debates', 'It helps you pick sides permanently'], correctIndex: 1, explanation: 'Engaging with current debates sharpens analytical skills and shows that knowledge is dynamic, not static.' },
          { question: `What makes a good research question in ${g}?`, options: ['It should be as broad as possible', 'It should be specific, arguable, and answerable with available evidence', 'It must have a definitive yes/no answer', 'It should confirm what you already believe'], correctIndex: 1, explanation: 'A good research question is focused enough to investigate rigorously but open enough to yield meaningful analysis.' },
        ],
      },
    ],

    // ── BUSINESS & FINANCE ─────────────────────────────────────────────────
    business: [
      {
        title: `Principles & Market Fundamentals of ${cap}`,
        description: `Understand the foundational principles, market dynamics, and key terminology essential for studying ${g}.`,
        topics: [
          { title: `Core Concepts & Terminology`, description: `Master the fundamental vocabulary and concepts that underpin ${g}. A solid grasp of terminology is essential for all further study.`, keyConcepts: ['Key industry terminology', 'Foundational economic principles', 'Market participant roles'], resources: [makeResource(`${cap} Fundamentals Crash Course`, g, 'fundamentals crash course beginner', 'video', '25 min video', 'Beginner', { isStartHere: true }), makeResource(`${cap} Textbook & Reference Guide`, g, 'textbook reference guide introduction', 'doc', 'Reference doc', 'Beginner', { isOfficialDoc: true }), makeResource(`${cap} Interactive Glossary`, g, 'interactive glossary quiz', 'interactive', '15 min practice', 'Beginner')], isCompleted: false },
          { title: `Market Structure & Dynamics`, description: `Learn how markets operate, including supply and demand forces, pricing mechanisms, and market cycles in ${g}.`, keyConcepts: ['Supply and demand fundamentals', 'Market cycles and trends', 'Pricing mechanisms and efficiency'], resources: [makeResource(`${cap} Market Dynamics Explained`, g, 'market structure dynamics explained', 'video', '20 min video', 'Beginner'), makeResource(`Market Structure Analysis`, g, 'market structure analysis article', 'article', '15 min read', 'Beginner')], isCompleted: false },
          { title: `Regulatory Environment & Ethics`, description: `Understand the legal and ethical frameworks that govern ${g}, including regulations, compliance, and professional standards.`, keyConcepts: ['Key regulations and laws', 'Compliance requirements', 'Professional ethics and standards'], resources: [makeResource(`${cap} Regulations & Ethics`, g, 'regulations ethics compliance overview', 'video', '20 min video', 'Beginner'), makeResource(`${cap} Regulatory Framework Guide`, g, 'regulatory framework guide', 'doc', '15 min read', 'Beginner', { isOfficialDoc: true })], isCompleted: false },
        ],
        quizQuestions: [
          { question: `Why is understanding market dynamics essential in ${g}?`, options: ['Markets are unpredictable so studying them is pointless', 'It enables informed decision-making and helps identify opportunities and risks', 'Only professional traders need market knowledge', 'Market dynamics never change'], correctIndex: 1, explanation: 'Understanding market dynamics helps make informed decisions and anticipate changes in the business environment.' },
          { question: `What role do regulations play in ${g}?`, options: ['Regulations only exist to create paperwork', 'They protect stakeholders, ensure fair practices, and maintain market integrity', 'Regulations are optional guidelines', 'They only apply to large corporations'], correctIndex: 1, explanation: 'Regulations create a level playing field, protect participants, and maintain trust in the system.' },
          { question: `Why are ethics important in ${g}?`, options: ['Ethics are a personal choice with no business impact', 'Ethical practices build trust, prevent legal issues, and ensure long-term sustainability', 'Ethics only matter in non-profit organizations', 'Ethical businesses are less profitable'], correctIndex: 1, explanation: 'Ethical conduct builds reputation, prevents costly legal problems, and fosters sustainable business relationships.' },
        ],
      },
      {
        title: `Strategic Frameworks & Analysis in ${cap}`,
        description: `Apply analytical tools, strategic frameworks, and decision-making models to real problems in ${g}.`,
        topics: [
          { title: `Analytical Tools & Models`, description: `Learn industry-standard analytical frameworks used to evaluate performance, competition, and opportunities in ${g}.`, keyConcepts: ['SWOT, PESTLE, and Porter\'s Five Forces', 'Financial ratio analysis', 'Benchmarking and KPIs'], resources: [makeResource(`${cap} Analytical Frameworks`, g, 'analytical frameworks SWOT Porter', 'video', '25 min video', 'Intermediate', { isStartHere: true }), makeResource(`${cap} Analysis Tools Reference`, g, 'analysis tools reference guide', 'doc', 'Reference doc', 'Intermediate', { isOfficialDoc: true })], isCompleted: false },
          { title: `Strategic Planning & Decision-Making`, description: `Develop strategic plans, set measurable goals, and apply decision-making frameworks to ${g} scenarios.`, keyConcepts: ['Goal setting (SMART framework)', 'Decision trees and scenario planning', 'Risk-reward assessment'], resources: [makeResource(`Strategic Planning in ${cap}`, g, 'strategic planning decision making', 'video', '25 min video', 'Intermediate'), makeResource(`${cap} Strategy Case Exercises`, g, 'strategy case study exercises', 'interactive', '20 min practice', 'Intermediate')], isCompleted: false },
          { title: `Competitive Analysis & Positioning`, description: `Analyze competitive landscapes and develop positioning strategies within ${g}.`, keyConcepts: ['Competitive advantage identification', 'Market positioning strategies', 'Differentiation and value proposition'], resources: [makeResource(`Competitive Analysis in ${cap}`, g, 'competitive analysis positioning strategy', 'video', '20 min video', 'Intermediate'), makeResource(`${cap} Competitive Landscape Article`, g, 'competitive landscape analysis article', 'article', '15 min read', 'Intermediate')], isCompleted: false },
        ],
        quizQuestions: [
          { question: `What does SWOT analysis evaluate in ${g}?`, options: ['Only financial performance', 'Strengths, Weaknesses, Opportunities, and Threats', 'Software quality metrics', 'Employee satisfaction'], correctIndex: 1, explanation: 'SWOT analysis provides a structured framework for evaluating internal capabilities and external factors.' },
          { question: `Why is strategic planning important in ${g}?`, options: ['Plans never work so planning is wasteful', 'It provides direction, aligns resources, and prepares for challenges and opportunities', 'Only large organizations need strategy', 'Strategy replaces the need for tactical execution'], correctIndex: 1, explanation: 'Strategic planning provides a roadmap for achieving goals and adapting to changing conditions.' },
          { question: `What is a competitive advantage in ${g}?`, options: ['Having the largest office', 'A unique attribute or capability that allows outperformance of competitors', 'Spending the most on advertising', 'Having been in business the longest'], correctIndex: 1, explanation: 'Competitive advantage comes from offering unique value that competitors cannot easily replicate.' },
        ],
      },
      {
        title: `Quantitative Analysis & Operations in ${cap}`,
        description: `Apply quantitative methods, financial modeling, risk assessment, and operational best practices to ${g}.`,
        topics: [
          { title: `Quantitative Analysis & Key Metrics`, description: `Learn to calculate, interpret, and apply key quantitative metrics used in ${g} for data-driven decision making.`, keyConcepts: ['Financial statements and ratios', 'Statistical analysis methods', 'Data-driven decision making'], resources: [makeResource(`${cap} Quantitative Analysis`, g, 'quantitative analysis metrics', 'video', '30 min video', 'Intermediate', { isStartHere: true }), makeResource(`${cap} Financial Metrics Guide`, g, 'financial metrics reference guide', 'doc', 'Reference doc', 'Intermediate', { isOfficialDoc: true })], isCompleted: false },
          { title: `Operational Processes & Efficiency`, description: `Understand operational workflows, process optimization, and efficiency frameworks in ${g}.`, keyConcepts: ['Process mapping and optimization', 'Lean and Six Sigma principles', 'Operational KPIs and measurement'], resources: [makeResource(`${cap} Operations Management`, g, 'operations management efficiency', 'video', '25 min video', 'Intermediate'), makeResource(`${cap} Process Optimization Exercises`, g, 'process optimization exercises', 'interactive', '20 min practice', 'Intermediate')], isCompleted: false },
          { title: `Risk Assessment & Mitigation`, description: `Identify, quantify, and develop mitigation strategies for risks in ${g}.`, keyConcepts: ['Risk identification frameworks', 'Probability and impact assessment', 'Hedging and diversification strategies'], resources: [makeResource(`Risk Management in ${cap}`, g, 'risk assessment management strategies', 'video', '25 min video', 'Advanced'), makeResource(`${cap} Risk Analysis Article`, g, 'risk analysis mitigation article', 'article', '18 min read', 'Advanced')], isCompleted: false },
        ],
        quizQuestions: [
          { question: `Why is quantitative analysis important in ${g}?`, options: ['Numbers are always misleading', 'It provides objective evidence for decision-making and performance evaluation', 'Qualitative judgment is always superior', 'Only accountants need quantitative skills'], correctIndex: 1, explanation: 'Quantitative analysis provides objective, measurable evidence to support and validate business decisions.' },
          { question: `What is the purpose of risk assessment in ${g}?`, options: ['To avoid all risks entirely', 'To identify, evaluate, and prepare strategies for potential threats and uncertainties', 'Risk assessment is only for insurance companies', 'To eliminate the need for insurance'], correctIndex: 1, explanation: 'Risk assessment helps organizations understand potential threats and develop proactive mitigation strategies.' },
          { question: `How does process optimization benefit ${g}?`, options: ['It always requires expensive technology', 'It reduces waste, improves efficiency, and maximizes value delivery', 'Optimization makes processes more complex', 'It only applies to manufacturing'], correctIndex: 1, explanation: 'Process optimization eliminates inefficiencies and ensures resources are used effectively to deliver value.' },
        ],
      },
      {
        title: `Case Studies & Professional Practice in ${cap}`,
        description: `Apply knowledge to real-world case studies, develop professional skills, and build practical expertise in ${g}.`,
        topics: [
          { title: `Real-World Case Studies`, description: `Analyze real-world cases to apply theoretical knowledge to practical ${g} scenarios and develop analytical judgment.`, keyConcepts: ['Case study methodology', 'Applying frameworks to real scenarios', 'Learning from successes and failures'], resources: [makeResource(`${cap} Real-World Case Studies`, g, 'case study analysis real world', 'video', '30 min video', 'Advanced', { isStartHere: true }), makeResource(`${cap} Case Study Collection`, g, 'case study collection Harvard', 'article', '25 min read', 'Advanced')], isCompleted: false },
          { title: `Industry Best Practices & Standards`, description: `Learn the professional standards, certifications, and best practices recognized in ${g}.`, keyConcepts: ['Industry certifications and standards', 'Professional development paths', 'Best practice frameworks'], resources: [makeResource(`${cap} Industry Standards`, g, 'industry best practices standards', 'video', '20 min video', 'Advanced'), makeResource(`${cap} Professional Standards Guide`, g, 'professional standards certification guide', 'doc', 'Reference doc', 'Advanced', { isOfficialDoc: true })], isCompleted: false },
          { title: `Professional Development & Networking`, description: `Build your professional presence, develop networking skills, and plan your career path in ${g}.`, keyConcepts: ['Building professional networks', 'Career development planning', 'Continuous learning and adaptation'], resources: [makeResource(`Career Development in ${cap}`, g, 'career development networking professional', 'video', '20 min video', 'Advanced'), makeResource(`${cap} Professional Community Guide`, g, 'professional community networking guide', 'article', '15 min read', 'Advanced')], isCompleted: false },
        ],
        quizQuestions: [
          { question: `Why are case studies valuable for learning ${g}?`, options: ['They are easier than textbooks', 'They bridge theory and practice by applying concepts to real-world scenarios', 'Case studies are outdated teaching methods', 'They replace the need for theoretical knowledge'], correctIndex: 1, explanation: 'Case studies develop practical analytical skills by applying frameworks to real situations.' },
          { question: `What is the value of professional certifications in ${g}?`, options: ['They guarantee immediate employment', 'They validate expertise, demonstrate commitment, and meet industry standards', 'Certifications are meaningless credentials', 'They replace the need for experience'], correctIndex: 1, explanation: 'Professional certifications signal competence, dedication, and adherence to recognized standards.' },
          { question: `Why is continuous learning important in ${g}?`, options: ['Once you learn something, it never changes', 'Markets, regulations, and best practices evolve, requiring ongoing knowledge updates', 'Continuous learning is only for beginners', 'Experience alone is sufficient'], correctIndex: 1, explanation: 'The business landscape constantly evolves, making continuous learning essential for staying relevant and effective.' },
        ],
      },
    ],

    // ── ARTS & CREATIVE SKILLS ─────────────────────────────────────────────
    arts: [
      {
        title: `Fundamentals & Essential Techniques of ${cap}`,
        description: `Build core skills, learn foundational techniques, and understand the essential materials and tools used in ${g}.`,
        topics: [
          { title: `History & Cultural Context of ${cap}`, description: `Explore the history and cultural significance of ${g} to understand its evolution and major influences.`, keyConcepts: ['Major historical periods and styles', 'Cultural influences and context', 'Influential practitioners and works'], resources: [makeResource(`${cap} History & Evolution`, g, 'history evolution cultural context', 'video', '25 min video', 'Beginner', { isStartHere: true }), makeResource(`${cap} History Reference Guide`, g, 'history reference guide', 'doc', 'Reference doc', 'Beginner', { isOfficialDoc: true }), makeResource(`${cap} Style Identification Quiz`, g, 'style identification quiz interactive', 'interactive', '15 min practice', 'Beginner')], isCompleted: false },
          { title: `Core Techniques & Materials`, description: `Master the fundamental techniques, materials, and tools that form the foundation of ${g} practice.`, keyConcepts: ['Essential tools and materials', 'Basic techniques and methods', 'Proper form and best practices'], resources: [makeResource(`${cap} Beginner Techniques Tutorial`, g, 'beginner techniques tutorial', 'video', '30 min video', 'Beginner'), makeResource(`${cap} Techniques Reference`, g, 'techniques materials reference', 'doc', '15 min read', 'Beginner', { isOfficialDoc: true })], isCompleted: false },
          { title: `Foundational Exercises & Daily Practice`, description: `Develop a consistent practice routine with structured exercises designed to build ${g} skills progressively.`, keyConcepts: ['Structured practice routines', 'Skill progression milestones', 'Building muscle memory and intuition'], resources: [makeResource(`${cap} Daily Practice Routine`, g, 'daily practice routine exercises beginner', 'video', '20 min video', 'Beginner'), makeResource(`${cap} Practice Exercises Collection`, g, 'practice exercises drills beginner', 'interactive', '20 min practice', 'Beginner')], isCompleted: false },
        ],
        quizQuestions: [
          { question: `Why is consistent daily practice important in ${g}?`, options: ['Only natural talent matters', 'Regular practice builds muscle memory, develops skills, and deepens understanding over time', 'Practicing once a week is sufficient', 'Practice is only for beginners'], correctIndex: 1, explanation: 'Consistent practice is the single most important factor in developing artistic skills at any level.' },
          { question: `Why study the history and context of ${g}?`, options: ['History is irrelevant to current practice', 'It provides inspiration, contextualizes techniques, and helps develop informed artistic choices', 'Only academics need historical knowledge', 'It replaces the need for practicing'], correctIndex: 1, explanation: 'Understanding history enriches creative work by providing context, inspiration, and awareness of traditions.' },
          { question: `What role do foundational techniques play in ${g}?`, options: ['They limit creativity', 'They provide the essential building blocks needed for more advanced and creative work', 'Advanced practitioners don\'t need fundamentals', 'Fundamentals are boring and unnecessary'], correctIndex: 1, explanation: 'Strong fundamentals enable creative freedom — you must know the rules before you can meaningfully break them.' },
        ],
      },
      {
        title: `Style Development & Composition in ${cap}`,
        description: `Develop your personal style, learn composition principles, and study the work of influential practitioners in ${g}.`,
        topics: [
          { title: `Composition Principles & Theory`, description: `Learn the theoretical principles of composition, arrangement, and structure in ${g}.`, keyConcepts: ['Balance, contrast, and harmony', 'Structural frameworks and forms', 'Rhythm, movement, and emphasis'], resources: [makeResource(`${cap} Composition Theory`, g, 'composition theory principles', 'video', '25 min video', 'Intermediate', { isStartHere: true }), makeResource(`${cap} Composition Reference`, g, 'composition theory reference guide', 'doc', 'Reference doc', 'Intermediate', { isOfficialDoc: true })], isCompleted: false },
          { title: `Developing Personal Style`, description: `Explore different styles and approaches in ${g} to begin developing your own creative voice and artistic identity.`, keyConcepts: ['Experimentation with styles', 'Finding your creative voice', 'Balancing influence and originality'], resources: [makeResource(`Finding Your Style in ${cap}`, g, 'developing personal style', 'video', '20 min video', 'Intermediate'), makeResource(`Style Development Exercises`, g, 'style development exercises practice', 'interactive', '20 min practice', 'Intermediate')], isCompleted: false },
          { title: `Influential Artists & Movements`, description: `Study the masters and movements that have defined ${g} to broaden your creative perspective and vocabulary.`, keyConcepts: ['Key practitioners and their techniques', 'Major artistic movements', 'Critical analysis of masterworks'], resources: [makeResource(`Master Practitioners of ${cap}`, g, 'influential artists masters analysis', 'video', '25 min video', 'Intermediate'), makeResource(`${cap} Masterwork Analysis`, g, 'masterwork analysis study', 'article', '18 min read', 'Intermediate')], isCompleted: false },
        ],
        quizQuestions: [
          { question: `What is the value of learning composition principles in ${g}?`, options: ['Composition rules limit creativity', 'They provide structure that makes creative work more effective and impactful', 'Composition is only for classical art', 'Professionals don\'t use composition principles'], correctIndex: 1, explanation: 'Composition principles help organize creative elements for maximum impact and communicative power.' },
          { question: `How does studying other artists benefit your ${g} practice?`, options: ['Copying others is always plagiarism', 'It expands your creative vocabulary, reveals techniques, and inspires original work', 'Only original ideas matter', 'Studying others makes you less creative'], correctIndex: 1, explanation: 'All artists build on tradition — studying others provides tools and inspiration for finding your own voice.' },
          { question: `What is the best way to develop a personal style in ${g}?`, options: ['Pick one style and never change', 'Experiment widely, practice consistently, and gradually discover what resonates with your creative vision', 'Copy your favorite artist exactly', 'Style develops only through natural talent'], correctIndex: 1, explanation: 'Personal style emerges through broad experimentation, consistent practice, and honest self-reflection.' },
        ],
      },
      {
        title: `Portfolio Building & Critique in ${cap}`,
        description: `Create a cohesive body of work, learn to give and receive constructive feedback, and refine your ${g} practice.`,
        topics: [
          { title: `Creating a Body of Work`, description: `Develop a cohesive collection of ${g} pieces that showcase your range, growth, and creative vision.`, keyConcepts: ['Thematic coherence', 'Showcasing range and depth', 'Documenting creative process'], resources: [makeResource(`Building Your ${cap} Portfolio`, g, 'portfolio building guide', 'video', '25 min video', 'Intermediate', { isStartHere: true }), makeResource(`${cap} Portfolio Best Practices`, g, 'portfolio best practices guide', 'article', '15 min read', 'Intermediate')], isCompleted: false },
          { title: `Peer Review & Constructive Critique`, description: `Learn how to give and receive constructive criticism to improve your ${g} work and develop critical thinking.`, keyConcepts: ['Constructive feedback frameworks', 'Separating personal attachment from work', 'Using critique for growth'], resources: [makeResource(`Art Critique & Feedback Skills`, g, 'constructive critique feedback skills', 'video', '20 min video', 'Intermediate'), makeResource(`${cap} Critique Exercises`, g, 'critique exercises peer review', 'interactive', '20 min practice', 'Intermediate')], isCompleted: false },
          { title: `Refinement & Iterative Improvement`, description: `Practice revising and improving your ${g} work through iterative cycles of creation and reflection.`, keyConcepts: ['Iterative creative process', 'Self-assessment techniques', 'When to refine vs when to move on'], resources: [makeResource(`Iterative Improvement in ${cap}`, g, 'revision refinement process', 'video', '20 min video', 'Intermediate'), makeResource(`${cap} Revision Techniques`, g, 'revision techniques improvement article', 'article', '15 min read', 'Intermediate')], isCompleted: false },
        ],
        quizQuestions: [
          { question: `Why is a portfolio important for ${g} practitioners?`, options: ['Portfolios are only for job applications', 'It documents growth, showcases ability, and provides a basis for reflection and professional opportunity', 'Only professionals need portfolios', 'A single best piece is sufficient'], correctIndex: 1, explanation: 'A portfolio demonstrates your journey, range, and capability — essential for growth and professional development.' },
          { question: `How should constructive critique be approached in ${g}?`, options: ['All criticism is harmful', 'Focus on specific, actionable observations that help improve the work', 'Only positive feedback is useful', 'Critique should focus on the person, not the work'], correctIndex: 1, explanation: 'Good critique is specific, focused on the work itself, and offers actionable suggestions for improvement.' },
          { question: `Why is iterative revision important in ${g}?`, options: ['First drafts are always the best', 'Revision deepens quality, reveals new possibilities, and develops critical judgment', 'Revision means you failed the first time', 'Professional artists never revise'], correctIndex: 1, explanation: 'Iterative revision is how creative work reaches its full potential — all great art goes through multiple drafts.' },
        ],
      },
      {
        title: `Professional Practice & Exhibition in ${cap}`,
        description: `Learn to present your work professionally, understand industry standards, and build a career in ${g}.`,
        topics: [
          { title: `Exhibition, Presentation & Sharing`, description: `Learn how to present, exhibit, and share your ${g} work effectively with different audiences.`, keyConcepts: ['Presentation best practices', 'Digital and physical exhibition', 'Audience engagement strategies'], resources: [makeResource(`Presenting & Exhibiting ${cap}`, g, 'exhibition presentation sharing', 'video', '25 min video', 'Advanced', { isStartHere: true }), makeResource(`${cap} Exhibition Guide`, g, 'exhibition guide best practices', 'article', '20 min read', 'Advanced')], isCompleted: false },
          { title: `Professional Standards & Creative Ethics`, description: `Understand professional standards, intellectual property, and ethical considerations in ${g}.`, keyConcepts: ['Copyright and intellectual property', 'Professional conduct and standards', 'Creative commons and fair use'], resources: [makeResource(`Professional Ethics in ${cap}`, g, 'professional standards ethics copyright', 'video', '20 min video', 'Advanced'), makeResource(`${cap} Copyright & IP Guide`, g, 'copyright intellectual property guide', 'doc', 'Reference doc', 'Advanced', { isOfficialDoc: true })], isCompleted: false },
          { title: `Career Development & Opportunities`, description: `Explore career paths, build your professional network, and develop a sustainable practice in ${g}.`, keyConcepts: ['Career paths and opportunities', 'Freelancing and commissions', 'Building an audience and brand'], resources: [makeResource(`Career Paths in ${cap}`, g, 'career development opportunities', 'video', '20 min video', 'Advanced'), makeResource(`${cap} Career Planning Guide`, g, 'career planning freelance guide', 'article', '15 min read', 'Advanced')], isCompleted: false },
        ],
        quizQuestions: [
          { question: `Why is understanding copyright important in ${g}?`, options: ['Copyright doesn\'t apply to creative work', 'It protects your work and ensures you respect others\' intellectual property', 'Copyright is only for published authors', 'It limits artistic freedom'], correctIndex: 1, explanation: 'Understanding copyright protects your own creations and ensures you ethically use others\' work.' },
          { question: `What makes an effective presentation of ${g} work?`, options: ['Quantity over quality', 'Clear context, professional presentation, and engagement with the audience', 'Technical perfection is all that matters', 'Presentations are unnecessary for creative work'], correctIndex: 1, explanation: 'Effective presentation combines quality work with clear context and thoughtful audience engagement.' },
          { question: `How can a creative professional build a sustainable practice in ${g}?`, options: ['Wait for opportunities to come to you', 'Develop multiple revenue streams, build networks, and continuously improve skills', 'Only rely on gallery representation', 'Stop learning once you have a degree'], correctIndex: 1, explanation: 'A sustainable creative career requires proactive networking, diverse income sources, and continuous growth.' },
        ],
      },
    ],

    // ── MATHEMATICS & FORMAL SCIENCES ──────────────────────────────────────
    math: [
      {
        title: `Axioms, Definitions & Notation in ${cap}`,
        description: `Master the foundational definitions, notational conventions, and axiomatic frameworks that underpin ${g}.`,
        topics: [
          { title: `Mathematical Language & Notation`, description: `Learn the precise symbolic notation, set-builder notation, and formal language used in ${g}.`, keyConcepts: ['Standard mathematical symbols', 'Set theory notation', 'Formal logical expressions'], resources: [makeResource(`${cap} Notation & Language Guide`, g, 'notation language symbols tutorial', 'video', '20 min video', 'Beginner', { isStartHere: true }), makeResource(`${cap} Notation Reference`, g, 'notation reference guide symbols', 'doc', 'Reference doc', 'Beginner', { isOfficialDoc: true }), makeResource(`${cap} Notation Practice`, g, 'notation practice exercises', 'interactive', '15 min practice', 'Beginner')], isCompleted: false },
          { title: `Foundational Axioms & Postulates`, description: `Understand the fundamental axioms and postulates that serve as the starting points for reasoning in ${g}.`, keyConcepts: ['Axiomatic systems', 'Consistency and independence', 'Building from first principles'], resources: [makeResource(`${cap} Axioms & Foundations`, g, 'axioms foundations first principles', 'video', '25 min video', 'Beginner'), makeResource(`${cap} Foundations Textbook`, g, 'foundations textbook introduction', 'doc', '15 min read', 'Beginner', { isOfficialDoc: true })], isCompleted: false },
          { title: `Basic Proof Techniques`, description: `Learn fundamental proof strategies including direct proof, proof by contradiction, and mathematical induction.`, keyConcepts: ['Direct proof construction', 'Proof by contradiction', 'Mathematical induction'], resources: [makeResource(`Proof Techniques for ${cap}`, g, 'proof techniques tutorial beginner', 'video', '30 min video', 'Beginner'), makeResource(`${cap} Proof Practice Problems`, g, 'proof practice problems exercises', 'interactive', '20 min practice', 'Beginner')], isCompleted: false },
        ],
        quizQuestions: [
          { question: `Why are precise definitions essential in ${g}?`, options: ['Definitions are just formalities', 'They eliminate ambiguity and provide the exact foundation on which proofs and theorems are built', 'Intuitive understanding is always sufficient', 'Definitions only matter for written exams'], correctIndex: 1, explanation: 'Mathematical definitions must be precise because all subsequent reasoning depends on their exact meaning.' },
          { question: `What is the purpose of axioms in ${g}?`, options: ['Axioms are theorems that need proving', 'They are self-evident truths accepted without proof as the foundation for all other results', 'Axioms are outdated and no longer used', 'Axioms are the most complex theorems'], correctIndex: 1, explanation: 'Axioms are the accepted starting points from which all other mathematical truths are derived.' },
          { question: `Why is proof by contradiction a powerful technique?`, options: ['It avoids the need for logic', 'It works by assuming the negation of what you want to prove, and showing this leads to a logical impossibility', 'It only works for simple problems', 'Contradiction proofs are not accepted in mathematics'], correctIndex: 1, explanation: 'Proof by contradiction is especially useful when direct proof is difficult — it shows the negation is impossible.' },
        ],
      },
      {
        title: `Core Theorems & Proof Techniques in ${cap}`,
        description: `Study the major theorems, develop advanced proof strategies, and practice applying them through worked examples.`,
        topics: [
          { title: `Major Theorems & Their Proofs`, description: `Study the central theorems of ${g}, understand their proofs, and appreciate their significance and applications.`, keyConcepts: ['Key theorems and their statements', 'Understanding proof structure', 'Significance and applications of each theorem'], resources: [makeResource(`${cap} Major Theorems Explained`, g, 'major theorems explained proofs', 'video', '30 min video', 'Intermediate', { isStartHere: true }), makeResource(`${cap} Theorems Reference`, g, 'theorems reference proofs textbook', 'doc', 'Reference doc', 'Intermediate', { isOfficialDoc: true })], isCompleted: false },
          { title: `Advanced Proof Strategies`, description: `Master advanced proof techniques including strong induction, pigeonhole principle, and constructive proofs.`, keyConcepts: ['Strong induction', 'Pigeonhole principle', 'Constructive vs non-constructive proofs'], resources: [makeResource(`Advanced Proof Methods in ${cap}`, g, 'advanced proof strategies techniques', 'video', '25 min video', 'Intermediate'), makeResource(`${cap} Advanced Proof Exercises`, g, 'advanced proof exercises practice', 'interactive', '25 min practice', 'Intermediate')], isCompleted: false },
          { title: `Worked Examples & Counter-Examples`, description: `Work through detailed examples and learn to construct counter-examples to disprove false conjectures.`, keyConcepts: ['Step-by-step problem solving', 'Constructing counter-examples', 'Distinguishing necessary and sufficient conditions'], resources: [makeResource(`${cap} Worked Examples`, g, 'worked examples step by step', 'video', '25 min video', 'Intermediate'), makeResource(`${cap} Problem Set`, g, 'practice problem set solutions', 'article', '20 min read', 'Intermediate')], isCompleted: false },
        ],
        quizQuestions: [
          { question: `Why is it important to understand the proof of a theorem, not just its statement?`, options: ['Proofs are unnecessary if you memorize the theorem', 'Understanding proofs reveals the reasoning, shows how to apply the theorem, and develops mathematical thinking', 'Only mathematicians need to read proofs', 'Proofs are just formalities'], correctIndex: 1, explanation: 'Understanding proofs deepens comprehension, reveals assumptions, and teaches transferable reasoning skills.' },
          { question: `What is the purpose of a counter-example in ${g}?`, options: ['To prove a theorem is true', 'To disprove a conjecture by showing a specific case where it fails', 'Counter-examples are errors', 'They only exist in abstract mathematics'], correctIndex: 1, explanation: 'A single valid counter-example is sufficient to disprove a universal claim, making them powerful tools.' },
          { question: `What distinguishes a necessary condition from a sufficient condition?`, options: ['They mean the same thing', 'A necessary condition must hold for the result to be true; a sufficient condition guarantees the result', 'Necessary conditions are more important', 'Sufficient conditions are always necessary'], correctIndex: 1, explanation: 'Distinguishing necessary from sufficient conditions is fundamental to precise mathematical reasoning.' },
        ],
      },
      {
        title: `Problem-Solving & Computation in ${cap}`,
        description: `Develop problem-solving heuristics, learn computational techniques, and apply ${g} to practical problems.`,
        topics: [
          { title: `Problem-Solving Heuristics & Strategies`, description: `Learn systematic approaches to attacking unfamiliar problems using Polya's method and other strategies.`, keyConcepts: ['Polya\'s four-step method', 'Pattern recognition and analogy', 'Working backwards and simplifying'], resources: [makeResource(`Problem-Solving Strategies in ${cap}`, g, 'problem solving strategies heuristics', 'video', '25 min video', 'Intermediate', { isStartHere: true }), makeResource(`${cap} Problem-Solving Guide`, g, 'problem solving guide Polya method', 'doc', 'Reference doc', 'Intermediate', { isOfficialDoc: true })], isCompleted: false },
          { title: `Computational Techniques & Algorithms`, description: `Master computational methods and algorithms commonly used in ${g} for solving complex problems efficiently.`, keyConcepts: ['Algorithm design for mathematical computation', 'Complexity and efficiency', 'Numerical vs symbolic computation'], resources: [makeResource(`Computational Methods in ${cap}`, g, 'computational techniques algorithms', 'video', '25 min video', 'Intermediate'), makeResource(`${cap} Computation Practice`, g, 'computation practice exercises', 'interactive', '20 min practice', 'Intermediate')], isCompleted: false },
          { title: `Applications to Related Fields`, description: `See how ${g} concepts apply to physics, engineering, computer science, economics, and other disciplines.`, keyConcepts: ['Mathematical modeling', 'Cross-disciplinary applications', 'Real-world problem formulation'], resources: [makeResource(`${cap} Real-World Applications`, g, 'applications real world physics engineering', 'video', '20 min video', 'Intermediate'), makeResource(`${cap} Applied Problems Collection`, g, 'applied problems exercises real world', 'article', '18 min read', 'Intermediate')], isCompleted: false },
        ],
        quizQuestions: [
          { question: `What is Polya's first step in problem solving?`, options: ['Solve the problem immediately', 'Understand the problem — identify what is given, what is asked, and any constraints', 'Look up the answer', 'Guess and check randomly'], correctIndex: 1, explanation: 'Polya\'s method starts with thoroughly understanding the problem before attempting a solution.' },
          { question: `Why is computational efficiency important in ${g}?`, options: ['Efficiency doesn\'t matter as long as you get the answer', 'Efficient methods solve larger problems faster and reveal deeper mathematical structure', 'Only computers need efficient algorithms', 'Efficiency is only relevant to computer science'], correctIndex: 1, explanation: 'Efficient computation enables tackling larger problems and often reflects deeper mathematical understanding.' },
          { question: `How does ${g} connect to other fields?`, options: ['Mathematics is purely abstract with no applications', 'It provides precise modeling tools, analytical frameworks, and computational methods used across all sciences', 'Only applied mathematics has real-world uses', 'The connection only works in one direction'], correctIndex: 1, explanation: 'Mathematics is the universal language of science — its tools underpin analysis and modeling across all fields.' },
        ],
      },
      {
        title: `Advanced Topics & Open Problems in ${cap}`,
        description: `Explore advanced extensions, connections to other mathematical branches, and open research questions in ${g}.`,
        topics: [
          { title: `Extensions & Generalizations`, description: `Study how core ${g} concepts generalize to higher dimensions, abstract structures, or broader mathematical contexts.`, keyConcepts: ['Abstraction and generalization', 'Higher-dimensional extensions', 'Categorical and structural perspectives'], resources: [makeResource(`Advanced ${cap} Extensions`, g, 'advanced topics extensions generalizations', 'video', '30 min video', 'Advanced', { isStartHere: true }), makeResource(`${cap} Advanced Textbook`, g, 'advanced textbook graduate level', 'doc', 'Reference doc', 'Advanced', { isOfficialDoc: true })], isCompleted: false },
          { title: `Connections to Other Mathematical Branches`, description: `Explore the deep connections between ${g} and other areas of mathematics, revealing unified perspectives.`, keyConcepts: ['Inter-branch connections', 'Unifying themes across mathematics', 'Transfer of techniques between fields'], resources: [makeResource(`${cap} Connections & Unified Perspectives`, g, 'connections other branches mathematics', 'video', '25 min video', 'Advanced'), makeResource(`${cap} Survey Article`, g, 'survey article connections overview', 'article', '20 min read', 'Advanced')], isCompleted: false },
          { title: `Research Literature & Open Questions`, description: `Learn to read research papers and explore the unsolved problems and active research areas in ${g}.`, keyConcepts: ['Reading mathematical research papers', 'Famous open problems', 'Current active research areas'], resources: [makeResource(`Open Problems in ${cap}`, g, 'open problems unsolved research', 'video', '20 min video', 'Advanced'), makeResource(`${cap} Research Papers Archive`, g, 'research papers arXiv latest', 'doc', 'Reference doc', 'Advanced', { isOfficialDoc: true })], isCompleted: false },
        ],
        quizQuestions: [
          { question: `Why is generalization important in ${g}?`, options: ['It makes problems more complicated unnecessarily', 'It reveals deeper structure, unifies seemingly different results, and opens new areas of inquiry', 'Only pure mathematicians care about generalization', 'Generalization always makes solutions simpler'], correctIndex: 1, explanation: 'Generalization reveals the essential structure behind specific cases and connects different areas of mathematics.' },
          { question: `What can we learn from open (unsolved) problems in ${g}?`, options: ['Open problems mean the field is incomplete and unreliable', 'They drive research, inspire new methods, and reveal the frontiers of mathematical knowledge', 'Unsolved problems should be avoided', 'Open problems are only for Fields Medal winners'], correctIndex: 1, explanation: 'Open problems are the engine of mathematical progress — they motivate new theories and techniques.' },
          { question: `How should a student approach reading mathematical research papers?`, options: ['Read every word linearly from start to finish', 'Start with the introduction and main results, then study proofs selectively, accepting that multiple readings are normal', 'Only read the abstract', 'Avoid research papers until you have a PhD'], correctIndex: 1, explanation: 'Research papers are dense — strategic reading with multiple passes is more effective than linear reading.' },
        ],
      },
    ],
  };

  // General / fallback — uses learning-neutral language
  TEMPLATES.general = TEMPLATES.science;

  return TEMPLATES[domain] || TEMPLATES.general;
};

// ─────────────────────────────────────────────────────────────────────────────
// Blueprint Fallback Generator (domain-adaptive)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Helper to get sub-topics for a given milestone order using domain templates
 */
const createBlueprintTopics = (goalText, order, isVisual, skillLevel) => {
  const domain = detectDomain(goalText);
  const milestones = getDomainMilestones(domain, goalText, skillLevel);
  const milestone = milestones[Math.min(order - 1, milestones.length - 1)];
  return milestone.topics;
};

/**
 * Smart Blueprint / Mock Generator Fallback (Domain-Adaptive)
 * Used when GEMINI_API_KEY is not configured or offline during development/testing.
 * Automatically detects the domain and generates domain-appropriate milestones.
 */
const generateBlueprintFallback = ({ goalText, skillLevel = 'beginner', hoursPerWeek = 10, learningStyle = 'hands-on' }) => {
  // Guard against non-educational/invalid topics
  const validation = validateLearningGoal(goalText);
  if (!validation.isValid) {
    const err = new Error(validation.error || `"${goalText}" is not recognized as a valid study subject or course.`);
    err.code = 'ERR_INVALID_LEARNING_GOAL';
    err.statusCode = 400;
    throw err;
  }

  const domain = detectDomain(goalText);
  const milestones = getDomainMilestones(domain, goalText, skillLevel);
  const isVisual = learningStyle === 'visual';
  const totalWeeks = skillLevel === 'beginner' ? 8 : skillLevel === 'intermediate' ? 6 : 4;
  const hoursPerMilestone = Math.max(5, Math.round((hoursPerWeek * totalWeeks) / 4));

  logger.info(`📋 Generating ${domain}-domain blueprint fallback for: "${goalText}"`);

  const categoryMap = {
    technology: 'Technology & Engineering',
    science: 'Natural & Medical Sciences',
    humanities: 'Humanities & Social Sciences',
    business: 'Business & Finance',
    arts: 'Arts & Creative Skills',
    math: 'Mathematics & Formal Sciences',
    general: 'Custom AI Curriculum',
  };

  return {
    title: `${goalText.charAt(0).toUpperCase() + goalText.slice(1)} Mastery Path`,
    category: categoryMap[domain] || 'Custom AI Curriculum',
    description: `A personalized ${skillLevel}-level curriculum tailored for ${hoursPerWeek} hours/week of study, focusing on ${learningStyle} learning.`,
    nodes: milestones.map((milestone, index) => ({
      order: index + 1,
      title: milestone.title,
      description: milestone.description,
      estimatedHours: hoursPerMilestone + (index * 1),
      topics: milestone.topics,
      resources: [
        {
          title: isVisual ? `${goalText} Comprehensive Video Course` : `${goalText} Core Study Guide`,
          url: isVisual
            ? `https://www.youtube.com/results?search_query=${encodeURIComponent(goalText + ' ' + milestone.title.toLowerCase().split(' ').slice(0, 3).join(' '))}`
            : `https://duckduckgo.com/?q=${encodeURIComponent(goalText + ' ' + milestone.title.toLowerCase().split(' ').slice(0, 3).join(' '))}`,
          type: isVisual ? 'video' : 'article',
          isStartHere: true,
          isOfficialDoc: false,
          duration: isVisual ? '30 min video' : '15 min read',
          difficulty: index < 2 ? 'Beginner' : 'Intermediate',
          source: 'ai_suggested',
        },
        {
          title: `${goalText} Reference & Documentation`,
          url: `https://duckduckgo.com/?q=${encodeURIComponent(goalText + ' textbook reference guide')}`,
          type: 'doc',
          isStartHere: false,
          isOfficialDoc: true,
          duration: 'Reference guide',
          difficulty: 'Intermediate',
          source: 'ai_suggested',
        },
      ],
      quizQuestions: milestone.quizQuestions,
    })),
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Gemini Roadmap Generation Function
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Main Gemini Roadmap Generation Function
 * 
 * @param {Object} params
 * @param {string} params.goalText - Topic/goal to learn
 * @param {string} params.skillLevel - 'beginner' | 'intermediate' | 'advanced'
 * @param {number} params.hoursPerWeek - Number of hours per week
 * @param {string} params.learningStyle - 'hands-on' | 'visual' | 'reading'
 * @returns {Promise<{ roadmap: Object, source: 'gemini' | 'blueprint' }>}
 */
const generateRoadmapWithGemini = async ({
  goalText,
  skillLevel = 'beginner',
  hoursPerWeek = 10,
  learningStyle = 'hands-on',
}) => {
  const client = getGeminiClient();

  if (client) {
    try {
      logger.info(`🤖 Calling Gemini AI (${env.GEMINI_MODEL || 'gemini-3.6-flash'}) to generate roadmap for: "${goalText}"`);
      const model = client.getGenerativeModel({
        model: env.GEMINI_MODEL || 'gemini-3.6-flash',
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.3, // Low temperature for consistent structural output
        },
      });

      const prompt = buildPrompt({ goalText, skillLevel, hoursPerWeek, learningStyle });
      const response = await model.generateContent(prompt);
      const text = response.response.text();

      if (text) {
        // Parse and validate JSON structure
        const parsed = JSON.parse(text);

        // Check if Gemini rejected the topic as non-academic / nonsense
        if (parsed.isValidTopic === false || parsed.error === 'INVALID_STUDY_TOPIC') {
          const msg = parsed.message || `"${goalText}" is not recognized as a valid study subject or course.`;
          logger.warn(`Gemini rejected invalid study topic: "${goalText}" - ${msg}`);
          const err = new Error(msg);
          err.code = 'ERR_INVALID_LEARNING_GOAL';
          err.statusCode = 400;
          throw err;
        }

        if (parsed.title && Array.isArray(parsed.nodes) && parsed.nodes.length > 0) {
          logger.info(`✨ Gemini successfully generated roadmap: "${parsed.title}" with ${parsed.nodes.length} nodes`);
          return { roadmap: parsed, source: 'gemini' };
        }
      }
    } catch (error) {
      if (error.code === 'ERR_INVALID_LEARNING_GOAL') {
        throw error;
      }
      logger.warn(`Gemini generation call failed (${error.message}). Falling back to blueprint generator.`);
    }
  } else {
    logger.info(`ℹ️ GEMINI_API_KEY not configured. Using smart blueprint generator for: "${goalText}"`);
  }

  // Fallback to domain-adaptive deterministic blueprint
  const blueprint = generateBlueprintFallback({ goalText, skillLevel, hoursPerWeek, learningStyle });
  return { roadmap: blueprint, source: 'blueprint' };
};

module.exports = {
  generateRoadmapWithGemini,
  buildPrompt,
  generateBlueprintFallback,
  createBlueprintTopics,
  detectDomain,
};
