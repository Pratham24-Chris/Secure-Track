const mongoose = require("mongoose");

const geofenceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    radius: { type: Number, required: true },
    color: { type: String, default: "#3b82f6" },
    description: { type: String, default: "" },
    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

const geofenceModel = mongoose.model("Geofence", geofenceSchema);

module.exports = geofenceModel;
