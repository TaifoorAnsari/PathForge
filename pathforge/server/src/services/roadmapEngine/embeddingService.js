/**
 * Embedding & Vector Similarity Service
 * 
 * Computes dense vector embeddings and evaluates Cosine Similarity:
 * 1. If GEMINI_API_KEY is present: Uses Gemini's text-embedding-004 model.
 * 2. If GEMINI_API_KEY is missing/offline: Uses a fast deterministic term-frequency
 *    character/word n-gram vectorizer with vocabulary projection so semantic matching
 *    works locally without external API dependencies.
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const { env } = require('../../config/env');
const { logger } = require('../../config/logger');

let geminiClient = null;

const getGeminiClient = () => {
  if (geminiClient) return geminiClient;
  if (env.GEMINI_API_KEY && process.env.NODE_ENV !== 'test') {
    geminiClient = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  }
  return geminiClient;
};

/**
 * Computes dot product and cosine similarity between two numeric vectors.
 * Returns value between 0.0 and 1.0.
 */
const calculateCosineSimilarity = (vecA = [], vecB = []) => {
  if (!Array.isArray(vecA) || !Array.isArray(vecB) || vecA.length === 0 || vecB.length === 0) {
    return 0;
  }

  // If vector lengths differ, truncate to minimum length
  const len = Math.min(vecA.length, vecB.length);
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < len; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;

  const similarity = dotProduct / denominator;
  return Math.max(0, Math.min(1, similarity));
};

/**
 * Local deterministic vectorizer (768 dimensions):
 * Produces a stable embedding vector from word/n-gram hashing
 * for consistent local testing without external API calls.
 */
const generateLocalVector = (text = '', dimensions = 768) => {
  const vector = new Array(dimensions).fill(0);
  const normalized = text.toLowerCase().trim();
  if (!normalized) return vector;

  // Words and character trigrams
  const tokens = normalized.split(/\s+/);
  for (let i = 0; i < normalized.length - 2; i++) {
    tokens.push(normalized.substring(i, i + 3));
  }

  tokens.forEach((token, idx) => {
    let hash = 0;
    for (let j = 0; j < token.length; j++) {
      hash = (hash << 5) - hash + token.charCodeAt(j);
      hash |= 0;
    }
    const bucket = Math.abs(hash) % dimensions;
    vector[bucket] += 1 / (1 + idx * 0.05);
  });

  // Normalize to unit vector
  let norm = 0;
  for (let i = 0; i < dimensions; i++) {
    norm += vector[i] * vector[i];
  }
  norm = Math.sqrt(norm);
  if (norm > 0) {
    for (let i = 0; i < dimensions; i++) {
      vector[i] = Number((vector[i] / norm).toFixed(6));
    }
  }

  return vector;
};

/**
 * Generates an embedding vector for a given text snippet
 * @param {string} text - The input query or title
 * @returns {Promise<number[]>} - Array of floats representing the embedding vector
 */
const generateEmbedding = async (text = '') => {
  const client = getGeminiClient();

  if (client) {
    try {
      const model = client.getGenerativeModel({ model: 'text-embedding-004' });
      const result = await model.embedContent(text);
      if (result?.embedding?.values) {
        return result.embedding.values;
      }
    } catch (error) {
      logger.warn(`Gemini embedding call failed (${error.message}). Falling back to local vector.`);
    }
  }

  // Fallback to local deterministic embedding
  return generateLocalVector(text, 768);
};

module.exports = {
  generateEmbedding,
  generateLocalVector,
  calculateCosineSimilarity,
};
