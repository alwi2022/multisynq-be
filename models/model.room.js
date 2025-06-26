// models/Room.js
const mongoose = require("mongoose");

const RoomSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  settings: { type: Object, required: true },
  hostId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  lastActivity: { type: Date, default: Date.now },
  playerCount: { type: Number, default: 1 },
  status: { type: String, enum: ["waiting", "playing", "finished"], default: "waiting" },
  maxPlayers: { type: Number, default: 4 }
});

module.exports = mongoose.model("Room", RoomSchema);
