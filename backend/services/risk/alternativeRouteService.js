const asId = (value) => String(value ?? "");

const hasComparableMetrics = (route) => (
  Number.isFinite(route.transitDays) &&
  route.transitDays >= 0 &&
  Number.isFinite(route.cost) &&
  route.cost >= 0
);

/**
 * Determines whether an alternative route can prevent a projected stockout.
 *
 * An alternative avoids stockout when:
 *   - there is an actual projected stockout (stockoutDays > 0)
 *   - the alternative transit time is less than the disruption duration
 *     (i.e. the alternative can restore supply before inventory runs out)
 *
 * Returns null when stockoutDays is null (demand data is unavailable).
 */
const computeStockoutAvoided = ({ stockoutDays, disruptionDurationDays, alternativeTransitDays }) => {
  if (stockoutDays === null || stockoutDays === undefined) {
    return null;
  }

  if (stockoutDays <= 0) {
    // No stockout was projected — the alternative doesn't need to "avoid" anything.
    return false;
  }

  // The alternative avoids stockout if it can restore supply before the end of the disruption
  // window that causes the stockout.
  return alternativeTransitDays < disruptionDurationDays;
};

export class AlternativeRouteError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "AlternativeRouteError";
    this.code = code;
  }
}

/**
 * Finds alternative routes that share the same source and destination as the
 * disrupted route, and computes comparison metrics for each.
 *
 * @param {object} params
 * @param {object} params.supplyChain - The full supply chain document.
 * @param {string} params.disruptedRouteId - The _id of the disrupted route.
 * @param {number|null} [params.stockoutDays] - Projected stockout days from the risk engine (null = unknown).
 * @param {number} [params.disruptionDurationDays] - The disruption duration in days.
 */
export const findAlternativeRoutes = ({ supplyChain, disruptedRouteId, stockoutDays = null, disruptionDurationDays = 0 }) => {
  const routes = supplyChain?.routes || [];
  const disruptedRoute = routes.find((route) => asId(route._id) === asId(disruptedRouteId));

  if (!disruptedRoute) {
    throw new AlternativeRouteError("ROUTE_NOT_FOUND", "The requested route does not exist");
  }

  if (!hasComparableMetrics(disruptedRoute)) {
    throw new AlternativeRouteError(
      "INVALID_ROUTE_METRICS",
      "The disrupted route requires non-negative transit days and cost for comparison",
    );
  }

  return routes
    .filter(
      (route) =>
        asId(route._id) !== asId(disruptedRoute._id) &&
        asId(route.sourceNodeId) === asId(disruptedRoute.sourceNodeId) &&
        asId(route.destinationNodeId) === asId(disruptedRoute.destinationNodeId) &&
        hasComparableMetrics(route),
    )
    .map((route) => ({
      routeId: asId(route._id),
      sourceNodeId: route.sourceNodeId,
      destinationNodeId: route.destinationNodeId,
      transportMode: route.transportMode,
      transitDays: route.transitDays,
      cost: route.cost,
      additionalCost: route.cost - disruptedRoute.cost,
      timeSaved: disruptedRoute.transitDays - route.transitDays,
      stockoutAvoided: computeStockoutAvoided({
        stockoutDays,
        disruptionDurationDays,
        alternativeTransitDays: route.transitDays,
      }),
    }));
};
