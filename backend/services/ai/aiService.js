/**
 * AI Service — public interface for the rest of the application.
 *
 * The application never imports Gemini or Groq directly.
 * All AI interaction goes through analyzeScenario().
 *
 * Provider priority:
 *   1. Gemini  (requires GEMINI_API_KEY)
 *   2. Fallback (always available — deterministic, no external call)
 *
 * The Groq provider is defined as a future extension point.
 * When GROQ_API_KEY is configured and a Groq provider module is added,
 * it can be inserted between Gemini and Fallback with no changes to the
 * calling code.
 *
 * AI is non-authoritative:
 *   - the caller always receives { result, alternatives } from the deterministic layer
 *   - the { analysis, aiAvailable } fields are additive
 *   - if AI fails for any reason the deterministic fields are unchanged
 */

import { analyzeWithGemini } from "./providers/geminiProvider.js";
import { analyzeFallback } from "./providers/fallbackProvider.js";

/**
 * Runs AI analysis on deterministic simulation data.
 *
 * @param {object} scenarioData
 * @param {object}  scenarioData.disruption   - { type, durationDays }
 * @param {object}  scenarioData.impact       - risk engine result
 * @param {Array}   [scenarioData.alternatives] - alternative route results
 * @returns {Promise<{
 *   analysis: { summary: string, riskExplanation: string, recommendations: string[], tradeoffs: string[] },
 *   aiAvailable: boolean,
 *   provider: string
 * }>}
 */
export const analyzeScenario = async (scenarioData) => {
  // --- Attempt Gemini ---
  let geminiResult = null;
  try {
    geminiResult = await analyzeWithGemini(scenarioData);
  } catch (unexpectedError) {
    // analyzeWithGemini is already defensive, but guard the abstraction layer too.
    console.error("[aiService] Unexpected error from Gemini provider:", unexpectedError?.message);
  }

  if (geminiResult) {
    return {
      analysis: geminiResult,
      aiAvailable: true,
      provider: "gemini",
    };
  }

  // --- Attempt Groq (future provider — placeholder) ---
  // When groqProvider.js is implemented, insert it here:
  //   const groqResult = await analyzeWithGroq(scenarioData);
  //   if (groqResult) return { analysis: groqResult, aiAvailable: true, provider: "groq" };

  // --- Deterministic fallback ---
  const fallbackResult = analyzeFallback(scenarioData);

  return {
    analysis: fallbackResult,
    aiAvailable: false,
    provider: "fallback",
  };
};

