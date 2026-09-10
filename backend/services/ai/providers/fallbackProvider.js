/**
 * Local deterministic fallback provider.
 *
 * Used when the primary AI provider is unavailable (timeout, quota, missing key).
 * Produces structured output from the deterministic facts alone — no external calls.
 *
 * This is intentionally minimal.  It must not invent numbers.
 * It surfaces the facts that are already known and indicates that AI explanation
 * is unavailable.
 */

/**
 * @param {object} scenarioData
 * @param {object} scenarioData.disruption
 * @param {object} scenarioData.impact
 * @param {Array}  [scenarioData.alternatives]
 * @returns {{ summary: string, riskExplanation: string, recommendations: string[], tradeoffs: string[] }}
 */
export const analyzeFallback = ({ disruption, impact, alternatives = [] }) => {
  const { durationDays } = disruption ?? {};
  const { riskLevel, inventoryCoverageDays, stockoutDays, affectedNodes = [] } = impact ?? {};

  // Build a plain-language summary from the deterministic facts.
  const nodeNames = affectedNodes.map((n) => n.location || n.name).filter(Boolean);
  const affectedText =
    nodeNames.length > 0
      ? `Affected downstream nodes: ${nodeNames.join(", ")}.`
      : "No downstream nodes resolved.";

  const coverageText =
    inventoryCoverageDays !== null && inventoryCoverageDays !== undefined
      ? `Inventory covers ${inventoryCoverageDays} day${inventoryCoverageDays === 1 ? "" : "s"}.`
      : "Inventory coverage is unknown (demand data unavailable).";

  const stockoutText =
    stockoutDays !== null && stockoutDays !== undefined
      ? stockoutDays > 0
        ? `Projected stockout: ${stockoutDays} day${stockoutDays === 1 ? "" : "s"}.`
        : "No stockout is projected — inventory covers the disruption."
      : "Stockout projection is unknown (demand data unavailable).";

  const summary =
    `A ROUTE_FAILURE disruption lasting ${durationDays ?? "unknown"} day${durationDays === 1 ? "" : "s"} ` +
    `has been simulated. Risk level: ${riskLevel ?? "UNKNOWN"}. ` +
    `${coverageText} ${stockoutText} ${affectedText}`;

  const riskExplanation =
    riskLevel === "CRITICAL" || riskLevel === "HIGH"
      ? "The disruption duration exceeds the available inventory buffer, creating a supply shortfall. Immediate action is advisable."
      : riskLevel === "MEDIUM"
      ? "The disruption affects operations but the available inventory can cover the gap. Monitor closely."
      : riskLevel === "LOW"
      ? "The disruption has minimal impact based on current inventory levels."
      : "Risk level cannot be determined because demand or inventory data is incomplete.";

  // Build recommendations based on alternatives.
  const recommendations = [];

  const avoidingAlts = alternatives.filter((a) => a.stockoutAvoided === true);
  if (avoidingAlts.length > 0) {
    avoidingAlts.forEach((alt) => {
      const modeLabel = alt.transportMode ?? "alternative transport";
      const costNote =
        alt.additionalCost > 0
          ? ` at an additional cost of ₹${alt.additionalCost.toLocaleString("en-IN")}`
          : "";
      recommendations.push(
        `Consider switching to ${modeLabel} (${alt.transitDays} day transit)${costNote}. ` +
        `This alternative can restore supply before the projected stockout.`,
      );
    });
  } else if (alternatives.length > 0) {
    recommendations.push(
      "Alternative routes exist but none have been confirmed to avoid the projected stockout based on current data.",
    );
  } else {
    recommendations.push(
      "No alternative routes with comparable metrics are currently saved. " +
      "Consider adding parallel routes with transit days and cost in the supply chain builder.",
    );
  }

  if (stockoutDays !== null && stockoutDays > 0) {
    recommendations.push(
      "Review safety stock levels for this segment to extend inventory coverage in future disruptions.",
    );
  }

  // Build tradeoffs from alternatives.
  const tradeoffs = alternatives.map((alt) => {
    const costNote =
      alt.additionalCost > 0
        ? `costs ₹${alt.additionalCost.toLocaleString("en-IN")} more`
        : alt.additionalCost < 0
        ? `saves ₹${Math.abs(alt.additionalCost).toLocaleString("en-IN")} in cost`
        : "has the same cost";
    const timeNote =
      alt.timeSaved > 0
        ? `${alt.timeSaved} day${alt.timeSaved === 1 ? "" : "s"} faster`
        : alt.timeSaved < 0
        ? `${Math.abs(alt.timeSaved)} day${Math.abs(alt.timeSaved) === 1 ? "" : "s"} slower`
        : "the same transit time";
    const stockoutNote =
      alt.stockoutAvoided === true
        ? "and avoids the projected stockout"
        : alt.stockoutAvoided === false
        ? "but does not avoid the projected stockout"
        : "";
    return (
      `${alt.transportMode ?? "Alternative"}: ${costNote}, ${timeNote}${stockoutNote ? ` ${stockoutNote}` : ""}.`
    );
  });

  if (tradeoffs.length === 0) {
    tradeoffs.push("No alternative route tradeoffs available.");
  }

  return { summary, riskExplanation, recommendations, tradeoffs };
};

