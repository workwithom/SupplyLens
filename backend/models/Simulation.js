import mongoose from "mongoose";

const { Schema } = mongoose;

const simulationSchema = new Schema(
  {
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    supplyChainId: {
      type: Schema.Types.ObjectId,
      ref: "SupplyChain",
      required: true,
    },
    supplyChainName: {
      type: String,
      trim: true,
      default: "Supply Chain",
    },
    routeId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    transportMode: {
      type: String,
      trim: true,
      default: "ROAD",
    },
    disruptionType: {
      type: String,
      default: "ROUTE_FAILURE",
    },
    disruptionDurationDays: {
      type: Number,
      required: true,
      min: 0,
    },
    riskLevel: {
      type: String,
      enum: ["CRITICAL", "HIGH", "MEDIUM", "LOW", "UNKNOWN"],
      required: true,
    },
    stockoutDays: {
      type: Number,
      default: null,
    },
    inventoryCoverageDays: {
      type: Number,
      default: null,
    },
    affectedNodesCount: {
      type: Number,
      default: 0,
    },
    productName: {
      type: String,
      trim: true,
      default: "N/A",
    },
  },
  { timestamps: true }
);

export default mongoose.models.Simulation || mongoose.model("Simulation", simulationSchema);

