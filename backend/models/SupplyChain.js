import mongoose from "mongoose";

const { Schema } = mongoose;

const nodeSchema = new Schema({
  name: {
    type: String,
    trim: true,
  },
  type: {
    type: String,
    uppercase: true,
    enum: ["SUPPLIER", "WAREHOUSE", "FACTORY", "CUSTOMER"],
  },
  location: {
    type: String,
    trim: true,
  },
  capacity: {
    type: Number,
    min: 0,
  },
});

const productSchema = new Schema({
  name: {
    type: String,
    trim: true,
  },
  sku: {
    type: String,
    trim: true,
  },
  criticality: {
    type: String,
    uppercase: true,
    enum: ["LOW", "MEDIUM", "HIGH"],
  },
  dailyDemand: {
    type: Number,
    min: 0,
  },
});

const inventorySchema = new Schema({
  // These IDs refer to embedded product and node subdocuments in this SupplyChain.
  productId: {
    type: Schema.Types.ObjectId,
  },
  nodeId: {
    type: Schema.Types.ObjectId,
  },
  quantity: {
    type: Number,
    min: 0,
  },
});

const routeSchema = new Schema({
  // These IDs refer to embedded node subdocuments in this SupplyChain.
  sourceNodeId: {
    type: Schema.Types.ObjectId,
  },
  destinationNodeId: {
    type: Schema.Types.ObjectId,
  },
  transportMode: {
    type: String,
    uppercase: true,
    enum: ["ROAD", "RAIL", "SEA", "AIR", "PIPELINE"],
  },
  transitDays: {
    type: Number,
    min: 0,
  },
  capacityPerDay: {
    type: Number,
    min: 0,
  },
  cost: {
    type: Number,
    min: 0,
  },
});

const supplyChainSchema = new Schema(
  {
    name: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    nodes: [nodeSchema],
    products: [productSchema],
    inventory: [inventorySchema],
    routes: [routeSchema],
  },
  { timestamps: true },
);

export default mongoose.models.SupplyChain || mongoose.model("SupplyChain", supplyChainSchema);
