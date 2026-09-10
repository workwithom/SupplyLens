import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Gemini provider for the AI service.
 *
 * Sends deterministic simulation facts to Gemini and parses the structured
 * JSON response.  The prompt explicitly instructs the model not to invent
 * numbers and to use only the supplied facts.
 *
 * Returns null when the key is missing or the call fails — the AI service
 * then falls back to the local provider.
 */

const MODEL_NAME = "gemini-2.5-flash";

/**
 * Builds the prompt that is sent to Gemini.
 * The model is given the deterministic facts and asked to produce structured
 * JSON only — no commentary outside the JSON block.
 */
const buildPrompt = ({ disruption, impact, alternatives }) => {
  const { durationDays, type } = disruption ?? {};
  const {
    riskLevel,
    inventoryCoverageDays,
    stockoutDays,
    affectedNodes = [],
    product,
    dailyDemand,
  } = impact ?? {};

  const nodeNames = affectedNodes
    .map((n) => n.location || n.name)
    .filter(Boolean)
    .join(", ");

  const altText =
    alternatives && alternatives.length > 0
      ? alternatives
          .map(
            (alt) =>
              `- Mode: ${alt.transportMode ?? "unknown"}, Transit: ${alt.transitDays ?? "?"} days, ` +
              `Cost: ${alt.cost != null ? "₹" + alt.cost.toLocaleString("en-IN") : "unknown"}, ` +
              `Additional cost: ${alt.additionalCost != null ? "₹" + alt.additionalCost.toLocaleString("en-IN") : "unknown"}, ` +
              `Time saved: ${alt.timeSaved ?? "?"} days, ` +
              `Stockout avoided: ${alt.stockoutAvoided === true ? "Yes" : alt.stockoutAvoided === false ? "No" : "Unknown"}`,
          )
          .join("\n")
      : "None available";

  return `You are a supply chain disruption analyst. You have been given the deterministic results of a supply chain disruption simulation. Your job is to explain the results in plain language and recommend actions.

STRICT RULES:
1. Use ONLY the facts provided below. Do NOT invent numbers, costs, durations, inventory quantities, or route details.
2. If a value is missing or null, say "data unavailable" — do NOT estimate.
3. Your output must be valid JSON matching the exact schema shown. No text outside the JSON.
4. Recommendations must be based on the available alternatives listed below.
5. Do not claim to predict real-world outcomes — this is a deterministic simulation based on configured assumptions.

SIMULATION FACTS:
- Disruption type: ${type ?? "ROUTE_FAILURE"}
- Disruption duration: ${durationDays ?? "unknown"} days
- Risk level (calculated): ${riskLevel ?? "UNKNOWN"}
- Inventory coverage: ${inventoryCoverageDays !== null && inventoryCoverageDays !== undefined ? inventoryCoverageDays + " days" : "data unavailable"}
- Projected stockout: ${stockoutDays !== null && stockoutDays !== undefined ? stockoutDays + " days" : "data unavailable"}
- Affected downstream nodes: ${nodeNames || "none resolved"}
- Product: ${product?.name ?? "not specified"}
- Daily demand: ${dailyDemand !== null && dailyDemand !== undefined ? dailyDemand + " units/day" : "data unavailable"}

ALTERNATIVE ROUTES:
${altText}

Respond with ONLY this JSON (no markdown, no code block):
{
  "summary": "One or two sentences summarising the disruption impact using only the provided facts.",
  "riskExplanation": "One paragraph explaining why the risk level is what it is, referencing inventory coverage and stockout days from the facts above.",
  "recommendations": [
    "Specific action 1 based on the facts and alternatives above.",
    "Specific action 2."
  ],
  "tradeoffs": [
    "Tradeoff 1 for each alternative, comparing cost and time from the facts above."
  ]
}`;
};

/**
 * Validates that the parsed AI response has the required shape.
 * Returns the cleaned object or null if invalid.
 */
const validateAiResponse = (parsed) => {
  if (!parsed || typeof parsed !== "object") return null;

  const { summary, riskExplanation, recommendations, tradeoffs } = parsed;

  if (typeof summary !== "string" || summary.trim() === "") return null;
  if (typeof riskExplanation !== "string" || riskExplanation.trim() === "") return null;
  if (!Array.isArray(recommendations) || recommendations.length === 0) return null;
  if (!Array.isArray(tradeoffs) || tradeoffs.length === 0) return null;

  return {
    summary: summary.trim(),
    riskExplanation: riskExplanation.trim(),
    recommendations: recommendations.map((r) => String(r).trim()).filter(Boolean),
    tradeoffs: tradeoffs.map((t) => String(t).trim()).filter(Boolean),
  };
};

/**
 * @param {object} scenarioData - { disruption, impact, alternatives }
 * @returns {Promise<{ summary, riskExplanation, recommendations, tradeoffs } | null>}
 *   Returns null when the key is absent, the call fails, or the response is invalid.
 */
export const analyzeWithGemini = async (scenarioData) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    const prompt = buildPrompt(scenarioData);
    const geminiResult = await model.generateContent(prompt);
    const rawText = geminiResult?.response?.text?.() ?? "";

    // Strip markdown code fences if present (model sometimes wraps output)
    const cleaned = rawText
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/, "")
      .trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("[geminiProvider] Failed to parse Gemini response as JSON:", cleaned.slice(0, 200));
      return null;
    }

    const validated = validateAiResponse(parsed);
    if (!validated) {
      console.error("[geminiProvider] Gemini response did not match required schema.");
      return null;
    }

    return validated;
  } catch (error) {
    console.error("[geminiProvider] Gemini API call failed:", error?.message ?? error);
    return null;
  }
};

export { validateAiResponse };

