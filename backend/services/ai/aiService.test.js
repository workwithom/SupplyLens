import assert from "node:assert/strict";
import test from "node:test";
import { validateAiResponse } from "./providers/geminiProvider.js";
import { analyzeFallback } from "./providers/fallbackProvider.js";
import { analyzeScenario } from "./aiService.js";

// ─── Shared test fixtures ────────────────────────────────────────────────────

const baseScenario = {
  disruption: { type: "ROUTE_FAILURE", durationDays: 7 },
  impact: {
    riskLevel: "HIGH",
    inventoryCoverageDays: 5,
    stockoutDays: 2,
    affectedNodes: [{ name: "Warehouse", location: "Mumbai" }],
    product: { name: "Electronics" },
    dailyDemand: 10,
  },
  alternatives: [
    {
      routeId: "aaa",
      transportMode: "ROAD",
      transitDays: 1,
      cost: 120000,
      additionalCost: 40000,
      timeSaved: 2,
      stockoutAvoided: true,
    },
  ],
};

// ─── validateAiResponse tests (Gemini provider) ──────────────────────────────

test("validateAiResponse accepts a fully populated valid response", () => {
  const valid = {
    summary: "Route failure detected.",
    riskExplanation: "Inventory runs out before the disruption ends.",
    recommendations: ["Switch to road transport."],
    tradeoffs: ["Road costs more but arrives faster."],
  };

  const result = validateAiResponse(valid);
  assert.ok(result, "should return the validated response");
  assert.equal(result.summary, "Route failure detected.");
  assert.equal(result.recommendations.length, 1);
  assert.equal(result.tradeoffs.length, 1);
});

test("validateAiResponse rejects a response with missing summary", () => {
  const invalid = {
    riskExplanation: "Some explanation.",
    recommendations: ["Act now."],
    tradeoffs: ["Cost trade-off."],
  };
  assert.equal(validateAiResponse(invalid), null);
});

test("validateAiResponse rejects a response with empty recommendations", () => {
  const invalid = {
    summary: "OK.",
    riskExplanation: "OK.",
    recommendations: [],
    tradeoffs: ["Something."],
  };
  assert.equal(validateAiResponse(invalid), null);
});

test("validateAiResponse rejects a response with empty tradeoffs", () => {
  const invalid = {
    summary: "OK.",
    riskExplanation: "OK.",
    recommendations: ["Do something."],
    tradeoffs: [],
  };
  assert.equal(validateAiResponse(invalid), null);
});

test("validateAiResponse rejects null input", () => {
  assert.equal(validateAiResponse(null), null);
});

test("validateAiResponse rejects a non-object input", () => {
  assert.equal(validateAiResponse("text response"), null);
});

test("validateAiResponse trims whitespace from all string fields", () => {
  const padded = {
    summary: "  Padded.  ",
    riskExplanation: "  Explanation.  ",
    recommendations: ["  Action 1  ", "  Action 2  "],
    tradeoffs: ["  Tradeoff.  "],
  };
  const result = validateAiResponse(padded);
  assert.equal(result.summary, "Padded.");
  assert.equal(result.riskExplanation, "Explanation.");
  assert.equal(result.recommendations[0], "Action 1");
  assert.equal(result.tradeoffs[0], "Tradeoff.");
});

// ─── analyzeFallback tests ───────────────────────────────────────────────────

test("analyzeFallback returns all four required fields", () => {
  const result = analyzeFallback(baseScenario);
  assert.ok(typeof result.summary === "string" && result.summary.length > 0, "summary must be a non-empty string");
  assert.ok(typeof result.riskExplanation === "string" && result.riskExplanation.length > 0);
  assert.ok(Array.isArray(result.recommendations) && result.recommendations.length > 0);
  assert.ok(Array.isArray(result.tradeoffs) && result.tradeoffs.length > 0);
});

test("analyzeFallback includes the disruption duration in the summary", () => {
  const result = analyzeFallback(baseScenario);
  assert.ok(result.summary.includes("7"), "summary should mention the disruption duration");
});

test("analyzeFallback mentions the risk level in the summary", () => {
  const result = analyzeFallback(baseScenario);
  assert.ok(result.summary.includes("HIGH"), "summary should include the risk level");
});

test("analyzeFallback includes the affected node name in the summary", () => {
  const result = analyzeFallback(baseScenario);
  assert.ok(result.summary.includes("Mumbai"), "summary should mention affected node location");
});

test("analyzeFallback recommends the stockout-avoiding alternative by transport mode", () => {
  const result = analyzeFallback(baseScenario);
  const hasRoadRecommendation = result.recommendations.some((r) => r.includes("ROAD"));
  assert.ok(hasRoadRecommendation, "should recommend the ROAD alternative that avoids stockout");
});

test("analyzeFallback includes a tradeoff entry for each alternative", () => {
  const result = analyzeFallback(baseScenario);
  assert.equal(result.tradeoffs.length, 1, "one tradeoff per alternative");
  assert.ok(result.tradeoffs[0].includes("ROAD"), "tradeoff should mention transport mode");
});

test("analyzeFallback handles an empty alternatives array gracefully", () => {
  const result = analyzeFallback({ ...baseScenario, alternatives: [] });
  assert.ok(result.recommendations.length > 0, "should still produce at least one recommendation");
  assert.ok(result.tradeoffs.length > 0, "should produce a 'no alternatives' tradeoff message");
});

test("analyzeFallback handles missing demand data gracefully (stockoutDays = null)", () => {
  const noData = {
    ...baseScenario,
    impact: {
      ...baseScenario.impact,
      inventoryCoverageDays: null,
      stockoutDays: null,
      dailyDemand: null,
    },
  };
  const result = analyzeFallback(noData);
  // Must not throw and must still produce all fields
  assert.ok(typeof result.summary === "string");
  assert.ok(Array.isArray(result.recommendations));
  assert.ok(Array.isArray(result.tradeoffs));
});

test("analyzeFallback uses 'immediate action' language for HIGH risk", () => {
  const result = analyzeFallback(baseScenario);
  assert.ok(
    result.riskExplanation.toLowerCase().includes("immediate"),
    "HIGH risk explanation should advise immediate action",
  );
});

test("analyzeFallback uses 'monitor' language for MEDIUM risk", () => {
  const mediumScenario = {
    ...baseScenario,
    impact: { ...baseScenario.impact, riskLevel: "MEDIUM", stockoutDays: 0 },
  };
  const result = analyzeFallback(mediumScenario);
  assert.ok(
    result.riskExplanation.toLowerCase().includes("monitor"),
    "MEDIUM risk explanation should say 'monitor'",
  );
});

// ─── analyzeScenario integration tests (no real API call) ───────────────────

test("analyzeScenario always returns the four required analysis fields", async () => {
  // We cannot call Gemini in a unit test (no HTTP allowed), but the service
  // must always produce a result — at minimum via the fallback.
  // Temporarily remove the key so Gemini is skipped deterministically.
  const originalKey = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;

  try {
    const response = await analyzeScenario(baseScenario);

    assert.ok(response.analysis, "analysis must be present");
    assert.ok(typeof response.analysis.summary === "string" && response.analysis.summary.length > 0);
    assert.ok(typeof response.analysis.riskExplanation === "string");
    assert.ok(Array.isArray(response.analysis.recommendations));
    assert.ok(Array.isArray(response.analysis.tradeoffs));
    assert.equal(typeof response.aiAvailable, "boolean");
    assert.ok(typeof response.provider === "string");
  } finally {
    if (originalKey) process.env.GEMINI_API_KEY = originalKey;
  }
});

test("analyzeScenario uses the fallback provider when GEMINI_API_KEY is absent", async () => {
  const originalKey = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;

  try {
    const response = await analyzeScenario(baseScenario);
    assert.equal(response.provider, "fallback");
    assert.equal(response.aiAvailable, false);
  } finally {
    if (originalKey) process.env.GEMINI_API_KEY = originalKey;
  }
});

