import express from "express";
import mongoose from "mongoose";
import SupplyChain from "../models/SupplyChain.js";
import { isAuthenticatedUser } from "../middleware/auth.js";
import { analyzeRouteFailure, RiskEngineError } from "../services/risk/routeFailureRiskEngine.js";
import { findAlternativeRoutes, AlternativeRouteError } from "../services/risk/alternativeRouteService.js";
import { analyzeScenario } from "../services/ai/aiService.js";
import Simulation from "../models/Simulation.js";

const router = express.Router();

const supplyChainFields = [
  "name",
  "description",
  "nodes",
  "products",
  "inventory",
  "routes",
];

const getSupplyChainPayload = (body = {}) => {
  return Object.fromEntries(
    supplyChainFields
      .filter((field) => Object.prototype.hasOwnProperty.call(body, field))
      .map((field) => [field, body[field]]),
  );
};

const validatePayload = (payload, { requireName = false } = {}) => {
  if (
    (requireName && (typeof payload.name !== "string" || !payload.name.trim())) ||
    (payload.name !== undefined && (typeof payload.name !== "string" || !payload.name.trim()))
  ) {
    return "A supply chain name is required";
  }

  if (payload.description !== undefined && typeof payload.description !== "string") {
    return "Description must be a string";
  }

  for (const field of ["nodes", "products", "inventory", "routes"]) {
    if (payload[field] !== undefined && !Array.isArray(payload[field])) {
      return `${field} must be an array`;
    }
  }

  return null;
};

const validateId = (id, res) => {
  if (!mongoose.isValidObjectId(id)) {
    res.status(400).json({
      success: false,
      message: "Invalid supply chain ID",
    });
    return false;
  }

  return true;
};

const sendValidationError = (error, res) => {
  if (error.name === "ValidationError" || error.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }

  return res.status(500).json({
    success: false,
    message: "Unable to process supply chain request",
  });
};

router.post("/", isAuthenticatedUser, async (req, res) => {
  const payload = getSupplyChainPayload(req.body);
  const validationError = validatePayload(payload, { requireName: true });

  if (validationError) {
    return res.status(400).json({ success: false, message: validationError });
  }

  try {
    const supplyChain = await SupplyChain.create({
      ...payload,
      ownerId: req.user._id,
    });

    return res.status(201).json({ success: true, supplyChain });
  } catch (error) {
    return sendValidationError(error, res);
  }
});

router.get("/", isAuthenticatedUser, async (req, res) => {
  try {
    const supplyChains = await SupplyChain.find({ ownerId: req.user._id }).sort({ updatedAt: -1 });

    return res.status(200).json({ success: true, supplyChains });
  } catch (error) {
    return sendValidationError(error, res);
  }
});

router.get("/dashboard-stats", isAuthenticatedUser, async (req, res) => {
  try {
    const userId = req.user._id;

    // Fetch user's supply chains
    const supplyChains = await SupplyChain.find({ ownerId: userId }).sort({ updatedAt: -1 });

    const totalSupplyChains = supplyChains.length;
    let totalCheckpoints = 0;
    let totalRoutes = 0;
    const transportCounts = {};

    for (const sc of supplyChains) {
      totalCheckpoints += sc.nodes?.length || 0;
      const routes = sc.routes || [];
      totalRoutes += routes.length;
      for (const r of routes) {
        const mode = r.transportMode || "OTHER";
        transportCounts[mode] = (transportCounts[mode] || 0) + 1;
      }
    }

    // Fetch user's simulations if connected or mocked in tests
    let simulations = [];
    if (mongoose.connection.readyState === 1 || Simulation.isMocked) {
      simulations = await Simulation.find({ ownerId: userId }).sort({ createdAt: -1 });
    }

    const totalSimulations = simulations.length;
    const highRiskScenarios = simulations.filter(
      (s) => s.riskLevel === "HIGH" || s.riskLevel === "CRITICAL"
    ).length;

    // Unique affected products & routes in high risk / stockout simulations
    const affectedProductsSet = new Set();
    const affectedRoutesSet = new Set();
    for (const s of simulations) {
      if (s.riskLevel === "HIGH" || s.riskLevel === "CRITICAL" || (s.stockoutDays && s.stockoutDays > 0)) {
        if (s.productName && s.productName !== "N/A") {
          affectedProductsSet.add(s.productName);
        }
        if (s.routeId) {
          affectedRoutesSet.add(String(s.routeId));
        }
      }
    }

    // Transport distribution percentages
    const colors = ["bg-orange-500", "bg-blue-500", "bg-green-500", "bg-purple-500", "bg-gray-500"];
    const transportDistribution = Object.entries(transportCounts).map(([category, count], idx) => ({
      category,
      count,
      percentage: totalRoutes > 0 ? parseFloat(((count / totalRoutes) * 100).toFixed(1)) : 0,
      color: colors[idx % colors.length],
    }));

    return res.status(200).json({
      success: true,
      metrics: {
        totalSupplyChains,
        totalCheckpoints,
        totalRoutes,
        totalSimulations,
        highRiskScenarios,
        productsAtRisk: affectedProductsSet.size,
        routesAtRisk: affectedRoutesSet.size,
      },
      recentSimulations: simulations.slice(0, 5).map((s) => ({
        _id: s._id,
        supplyChainId: s.supplyChainId,
        supplyChainName: s.supplyChainName,
        transportMode: s.transportMode,
        disruptionDurationDays: s.disruptionDurationDays,
        riskLevel: s.riskLevel,
        stockoutDays: s.stockoutDays,
        productName: s.productName,
        createdAt: s.createdAt,
      })),
      transportDistribution,
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to retrieve dashboard statistics",
    });
  }
});

router.get("/:id", isAuthenticatedUser, async (req, res) => {
  if (!validateId(req.params.id, res)) return;

  try {
    const supplyChain = await SupplyChain.findOne({
      _id: req.params.id,
      ownerId: req.user._id,
    });

    if (!supplyChain) {
      return res.status(404).json({ success: false, message: "Supply chain not found" });
    }

    return res.status(200).json({ success: true, supplyChain });
  } catch (error) {
    return sendValidationError(error, res);
  }
});

router.post("/:id/simulations", isAuthenticatedUser, async (req, res) => {
  if (!validateId(req.params.id, res)) return;

  const { routeId, disruptionDurationDays } = req.body || {};

  if (!mongoose.isValidObjectId(routeId)) {
    return res.status(400).json({ success: false, message: "A valid route ID is required" });
  }

  if (!Number.isFinite(disruptionDurationDays) || disruptionDurationDays < 0) {
    return res.status(400).json({
      success: false,
      message: "Disruption duration must be a non-negative number of days",
    });
  }

  try {
    const supplyChain = await SupplyChain.findOne({
      _id: req.params.id,
      ownerId: req.user._id,
    });

    if (!supplyChain) {
      return res.status(404).json({ success: false, message: "Supply chain not found" });
    }

    const result = analyzeRouteFailure({
      supplyChain,
      routeId,
      disruptionDurationDays,
    });

    let alternatives = [];
    try {
      alternatives = findAlternativeRoutes({
        supplyChain,
        disruptedRouteId: routeId,
        stockoutDays: result.stockoutDays,
        disruptionDurationDays,
      });
    } catch (altError) {
      // AlternativeRouteError (e.g. route lacks comparable metrics) is non-fatal.
      // We still return the deterministic risk result without alternatives.
      if (!(altError instanceof AlternativeRouteError)) {
        throw altError;
      }
    }

    // AI analysis — non-blocking. Any failure must not prevent the deterministic result from returning.
    let analysis = null;
    let aiAvailable = false;
    try {
      const aiResponse = await analyzeScenario({
        disruption: result.disruption,
        impact: {
          riskLevel: result.riskLevel,
          inventoryCoverageDays: result.inventoryCoverageDays,
          stockoutDays: result.stockoutDays,
          affectedNodes: result.affectedNodes,
          product: result.product,
          dailyDemand: result.dailyDemand,
        },
        alternatives,
      });
      analysis = aiResponse.analysis;
      aiAvailable = aiResponse.aiAvailable;
    } catch (aiError) {
      // AI is an additive layer — never block or alter the deterministic result.
      console.error("[simulation] AI analysis failed unexpectedly:", aiError?.message);
    }

    // Persist simulation for real dashboard reporting (non-blocking)
    try {
      if (mongoose.connection.readyState === 1 || Simulation.isMocked) {
        await Simulation.create({
          ownerId: req.user._id,
          supplyChainId: supplyChain._id,
          supplyChainName: supplyChain.name,
          routeId,
          transportMode: result.disruptedRoute?.transportMode || "ROAD",
          disruptionType: result.disruption?.type || "ROUTE_FAILURE",
          disruptionDurationDays,
          riskLevel: result.riskLevel,
          stockoutDays: result.stockoutDays,
          inventoryCoverageDays: result.inventoryCoverageDays,
          affectedNodesCount: result.affectedNodes?.length || 0,
          productName: result.product?.name || supplyChain.products?.[0]?.name || "N/A",
        });
      }
    } catch (simPersistError) {
      console.error("[simulation] Failed to persist simulation record:", simPersistError?.message);
    }

    return res.status(200).json({ success: true, result, alternatives, analysis, aiAvailable });
  } catch (error) {
    if (error instanceof RiskEngineError) {
      return res.status(error.code === "ROUTE_NOT_FOUND" ? 404 : 400).json({
        success: false,
        message: error.message,
      });
    }

    return sendValidationError(error, res);
  }
});

router.put("/:id", isAuthenticatedUser, async (req, res) => {
  if (!validateId(req.params.id, res)) return;

  const payload = getSupplyChainPayload(req.body);
  const validationError = validatePayload(payload);

  if (validationError) {
    return res.status(400).json({ success: false, message: validationError });
  }

  if (Object.keys(payload).length === 0) {
    return res.status(400).json({ success: false, message: "No supply chain fields provided" });
  }

  try {
    const supplyChain = await SupplyChain.findOneAndUpdate(
      { _id: req.params.id, ownerId: req.user._id },
      payload,
      { new: true, runValidators: true },
    );

    if (!supplyChain) {
      return res.status(404).json({ success: false, message: "Supply chain not found" });
    }

    return res.status(200).json({ success: true, supplyChain });
  } catch (error) {
    return sendValidationError(error, res);
  }
});

router.delete("/:id", isAuthenticatedUser, async (req, res) => {
  if (!validateId(req.params.id, res)) return;

  try {
    const supplyChain = await SupplyChain.findOneAndDelete({
      _id: req.params.id,
      ownerId: req.user._id,
    });

    if (!supplyChain) {
      return res.status(404).json({ success: false, message: "Supply chain not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Supply chain deleted successfully",
    });
  } catch (error) {
    return sendValidationError(error, res);
  }
});

export default router;
