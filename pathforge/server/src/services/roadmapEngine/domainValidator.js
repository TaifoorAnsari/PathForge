/**
 * Learning Goal Domain Validator
 * 
 * Validates that user learning goals represent genuine study subjects, skills,
 * academic fields, technologies, or professional courses — rejecting casual conversational
 * nonsense, random gibberish, feelings, or non-educational goals (e.g., "i wanna sleep",
 * "i am hungry", "play games", "asdfghjk").
 */

const { normalizeGoalText, extractKeywords } = require('./normalizer');

// Whitelist of valid academic, engineering, technology, scientific, business, creative & vocational domains
const VALID_DOMAIN_ROOTS = new Set([
  // Programming & Software Engineering
  'javascript', 'typescript', 'python', 'java', 'c++', 'cpp', 'c#', 'csharp', 'golang', 'go',
  'rust', 'ruby', 'php', 'swift', 'kotlin', 'scala', 'dart', 'r', 'matlab', 'sql', 'nosql',
  'html', 'css', 'react', 'reactjs', 'vue', 'vuejs', 'angular', 'svelte', 'nextjs', 'nuxt',
  'nodejs', 'node', 'express', 'nestjs', 'django', 'fastapi', 'flask', 'spring', 'springboot',
  'rails', 'laravel', 'graphql', 'rest', 'api', 'mongodb', 'postgresql', 'postgres', 'mysql',
  'redis', 'database', 'databases', 'frontend', 'backend', 'fullstack', 'web', 'mobile',
  'android', 'ios', 'flutter', 'react native', 'devops', 'cloud', 'aws', 'azure', 'gcp',
  'docker', 'kubernetes', 'k8s', 'terraform', 'ansible', 'linux', 'git', 'github', 'ci/cd',
  'microservices', 'system design', 'architecture', 'security', 'cybersecurity', 'cryptography',
  'blockchain', 'web3', 'solidity', 'smart contracts', 'testing', 'qa', 'automation',

  // Computer Science & Mathematics
  'data structures', 'algorithms', 'dsa', 'operating systems', 'computer networks',
  'networking', 'compilers', 'computer science', 'discrete math', 'linear algebra',
  'calculus', 'statistics', 'probability', 'boolean algebra', 'cryptography',
  'number theory', 'combinatorics', 'differential equations', 'numerical analysis',
  'mathematical logic', 'abstract algebra', 'real analysis', 'complex analysis',
  'graph theory', 'topology', 'geometry', 'algebra', 'mathematics',

  // Artificial Intelligence & Data Science
  'machine learning', 'deep learning', 'ai', 'artificial intelligence', 'data science',
  'nlp', 'natural language processing', 'computer vision', 'data analytics', 'data analysis',
  'neural networks', 'pandas', 'numpy', 'tensorflow', 'pytorch', 'scikit-learn', 'keras',
  'large language models', 'llm', 'generative ai', 'prompt engineering', 'data engineering',
  'hadoop', 'spark', 'kafka', 'etl', 'tableau', 'power bi', 'business intelligence',

  // Engineering & Physical Sciences
  'robotics', 'ros', 'ros2', 'embedded systems', 'iot', 'internet of things', 'electronics',
  'electrical engineering', 'mechanical engineering', 'civil engineering', 'chemical engineering',
  'physics', 'chemistry', 'quantum computing', 'quantum mechanics', 'thermodynamics',
  'optics', 'electromagnetism', 'mechanics', 'circuits', 'signals', 'dsp', 'embedded',

  // Natural & Medical Sciences
  'biology', 'cell biology', 'molecular biology', 'microbiology', 'biochemistry',
  'organic chemistry', 'inorganic chemistry', 'anatomy', 'physiology',
  'neuroscience', 'neurology', 'brain', 'human brain', 'genetics', 'genomics',
  'biotechnology', 'bioinformatics', 'pharmacology', 'pathology', 'immunology',
  'epidemiology', 'ecology', 'evolution', 'zoology', 'botany', 'medicine',
  'biomedical', 'clinical', 'nursing', 'dentistry', 'veterinary',
  'astronomy', 'astrophysics', 'environmental science', 'earth science',
  'geology', 'oceanography', 'meteorology', 'paleontology',

  // Business, Finance & Economics
  'finance', 'accounting', 'economics', 'microeconomics', 'macroeconomics',
  'entrepreneurship', 'marketing', 'digital marketing', 'seo', 'copywriting',
  'product management', 'project management', 'agile', 'scrum',
  'stock market', 'investing', 'trading', 'supply chain', 'human resources',
  'management', 'business', 'real estate', 'taxation', 'banking', 'consulting',
  'business administration', 'operations management', 'logistics',

  // Humanities, Social Sciences & Law
  'history', 'world history', 'philosophy', 'psychology', 'sociology', 'linguistics',
  'literature', 'political science', 'anthropology', 'geography',
  'international relations', 'public policy', 'criminology', 'education', 'pedagogy',
  'law', 'jurisprudence', 'theology', 'ethics', 'cultural studies',
  'gender studies', 'archaeology',

  // Arts, Music & Creative Skills
  'ui', 'ux', 'ui/ux', 'user experience', 'user interface', 'figma', 'product design',
  'graphic design', 'animation', 'video editing', 'blender', '3d modeling',
  'game development', 'unity', 'unreal engine', 'music production', 'photography',
  'music', 'music theory', 'guitar', 'piano', 'singing', 'violin', 'drums',
  'drawing', 'painting', 'sculpture', 'illustration', 'calligraphy',
  'creative writing', 'film', 'filmmaking', 'acting', 'dance', 'pottery',
  'ceramics', 'woodworking', 'knitting', 'jewelry',

  // Languages
  'english', 'spanish', 'french', 'german', 'mandarin', 'chinese', 'japanese',
  'korean', 'arabic', 'hindi', 'portuguese', 'italian', 'russian', 'turkish',
  'sign language', 'latin', 'greek', 'sanskrit',

  // Practical & Vocational Skills
  'cooking', 'culinary', 'baking', 'nutrition', 'dietetics',
  'fitness', 'yoga', 'martial arts', 'self defense',
  'public speaking', 'communication', 'leadership', 'negotiation',
  'first aid', 'carpentry', 'welding', 'plumbing', 'electrician',
  'agriculture', 'gardening', 'horticulture',
]);

// Academic indicators that denote legitimate educational intent
const ACADEMIC_INDICATORS = new Set([
  'development', 'engineering', 'programming', 'architecture', 'curriculum',
  'course', 'bootcamp', 'algorithms', 'structures', 'analysis', 'analytics',
  'systems', 'design', 'theory', 'foundations', 'fundamentals', 'principles',
  'security', 'infrastructure', 'protocol', 'science', 'management', 'mathematics',
  'studies', 'computation', 'automation', 'modeling', 'intelligence', 'learning',
  'synthesis', 'optimization', 'methodology',
  // Domain-neutral academic indicators
  'brain', 'human', 'body', 'market', 'world', 'art', 'music', 'language',
  'history', 'culture', 'clinical', 'research', 'professional', 'applied',
  'advanced', 'introduction', 'basics', 'practical', 'anatomy', 'physiology',
  'theory', 'practice', 'technique', 'method', 'skill', 'craft',
  'composition', 'performance', 'production', 'writing', 'reading',
]);

// Non-study activity, conversational mood, vulgarity & leisure blacklist
const NONSENSE_PATTERNS = [
  // Profanity, vulgarity & slang expletives
  /\b(hell|wtf|fuck|fucking|shit|damn|crap|bitch|bastard|asshole|piss|dick|pussy|whore|slut|cunt|suck|stupid|dumb|idiot)\b/i,
  // Conversational questions, filler & chatter
  /\b(what the hell|what is this|who are you|how are you|hello|hi there|hey bro|testing|test 123|nothing|idk|i don'?t know|whatever|random|no idea|help me please|tell me)\b/i,
  // Bodily states, physical functions & sleep
  /\b(sleep|sleeping|nap|bed|tired|exhausted|slumber)\b/i,
  /\b(eat|eating|food|hungry|starving|lunch|dinner|breakfast|snack|cook|cooking|pizza|burger|drink|drinking|thirsty|pee|poop|bath|shower)\b/i,
  // Moods & feelings
  /\b(chill|relax|bored|boring|lazy|hangout|couch|party|clubbing|depressed|crying|sad)\b/i,
  /\b(hate|kill|die|suicide|shut up)\b/i,
  /\b(crypto moon|get rich quick|lottery|gambling|casino|betting)\b/i,
  // Casual video games & entertainment
  /\b(movie|watch tv|netflix|anime|gaming|play(ing)? (video\s?)?games?|videogames?|roblox|fortnite|minecraft|pubg|call of duty|free fire)\b/i,
  /\b(boy|girl|dating|kiss|marry|girlfriend|boyfriend|tinder)\b/i,
  // Casual sports as raw hobby (unless paired with an academic indicator like "analytics" or "science")
  /\b(football|soccer|cricket|basketball|baseball|tennis|volleyball|badminton|swimming|gym|workout|bodybuilding|running)\b/i,
];

/**
 * Validates whether a learning goal string represents a genuine study topic or course.
 * 
 * @param {string} rawGoalText - The goal provided by the student
 * @returns {{ isValid: boolean, error?: string, normalizedQuery: string }}
 */
function validateLearningGoal(rawGoalText) {
  if (!rawGoalText || typeof rawGoalText !== 'string') {
    return {
      isValid: false,
      error: 'Please enter a subject, skill, or technology you want to learn.',
      normalizedQuery: '',
    };
  }

  const trimmed = rawGoalText.trim();

  // 1. Length checks
  if (trimmed.length < 2) {
    return {
      isValid: false,
      error: 'Please enter a valid learning goal (at least 2 characters).',
      normalizedQuery: '',
    };
  }

  // 2. Check for obvious non-study moods, profanity, bodily states or leisure
  for (const pattern of NONSENSE_PATTERNS) {
    if (pattern.test(trimmed)) {
      // Exception: If paired with academic/analytical indicator (e.g. "football analytics" or "sports science")
      const lower = trimmed.toLowerCase();
      const hasEducationalContext = Array.from(ACADEMIC_INDICATORS).some((ind) => lower.includes(ind));
      const hasProfanity = /\b(hell|wtf|fuck|shit|damn|crap|bitch|bastard|asshole)\b/i.test(trimmed);

      if (hasProfanity || !hasEducationalContext) {
        return {
          isValid: false,
          error: `"${trimmed}" is not a recognized study topic. Please enter a genuine academic subject, technology, or professional skill (e.g., "Full-Stack Development", "Python for Data Science", or "System Design").`,
          normalizedQuery: '',
        };
      }
    }
  }

  // 3. Normalization & keyword extraction
  const normalized = normalizeGoalText(trimmed);
  const keywords = extractKeywords(trimmed);

  // If after removing conversational phrases ("i want to", "i need to", etc.) nothing meaningful is left
  if (!normalized || normalized.length < 2 || keywords.length === 0) {
    return {
      isValid: false,
      error: 'Please be specific about what subject or technology you want to learn (e.g. "React and Node.js" or "Machine Learning").',
      normalizedQuery: '',
    };
  }

  // 4. Repeated character or keyboard-mash gibberish check (e.g. "asdfasdf", "zzzzzz", "qwertyuiop")
  if (/([a-zA-Z])\1{3,}/.test(normalized)) {
    return {
      isValid: false,
      error: 'The entered text appears invalid. Please enter a real study subject or skill.',
      normalizedQuery: normalized,
    };
  }

  const consonantVowelRatio = (normalized.match(/[aeiou]/gi) || []).length / Math.max(1, (normalized.match(/[bcdfghjklmnpqrstvwxyz]/gi) || []).length);
  // Pure random consonant smashing like "sdfghjk"
  if (normalized.length > 5 && !normalized.includes(' ') && consonantVowelRatio < 0.1) {
    return {
      isValid: false,
      error: 'Please enter a recognized study subject or course name.',
      normalizedQuery: normalized,
    };
  }

  // 5. Check if at least one meaningful token matches known study fields OR an academic indicator
  const hasDomainRoot = Array.from(VALID_DOMAIN_ROOTS).some((root) => {
    return normalized.includes(root) || keywords.some((k) => k === root);
  });

  const hasAcademicIndicator = keywords.some((k) => ACADEMIC_INDICATORS.has(k));

  if (!hasDomainRoot && !hasAcademicIndicator) {
    return {
      isValid: false,
      error: `"${trimmed}" is not recognized as a valid educational subject or course. Please enter a genuine academic topic, programming technology, or professional skill (e.g. "React and Node.js", "Python Data Science", or "System Design").`,
      normalizedQuery: normalized,
    };
  }

  return {
    isValid: true,
    normalizedQuery: normalized,
  };
}

module.exports = {
  validateLearningGoal,
  VALID_DOMAIN_ROOTS,
};
