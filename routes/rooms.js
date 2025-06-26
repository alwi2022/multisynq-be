// File: routes/rooms.js
const express = require("express");
const router = express.Router();
const Room = require("../models/model.room");

const ROOM_TIMEOUT = 10 * 60 * 1000; // 10 minutes

// CREATE ROOM
router.post("/create", async (req, res) => {
  const { code, settings, hostId } = req.body;

  if (!code || !settings || !hostId)
    return res.status(400).json({ error: "Room code, settings, and hostId are required" });

  if (!/^[A-Z0-9]{4}$/.test(code))
    return res.status(400).json({ error: "Room code must be 4 uppercase letters/numbers" });

  const exists = await Room.findOne({ code });
  if (exists)
    return res.status(409).json({ error: "Room code already exists. Please try another code." });

  try {
    const newRoom = await Room.create({
      code,
      settings,
      hostId,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      playerCount: 1,
      status: "waiting",
      maxPlayers: settings.maxPlayers || 4
    });

    console.log(`🏠 Room created: ${code} by ${hostId}`);
    res.json({ success: true, room: newRoom });
  } catch (err) {
    console.error("Room creation error:", err.message);
    res.status(500).json({ error: "Failed to create room" });
  }
});

// JOIN ROOM
router.post("/join", async (req, res) => {
  const { code, playerId } = req.body;
  if (!code || !playerId) return res.status(400).json({ error: "Room code and playerId are required" });

  const room = await Room.findOne({ code: code.toUpperCase() });
  if (!room) return res.status(404).json({ error: "Room not found or no longer active" });
  if (room.playerCount >= room.maxPlayers) return res.status(409).json({ error: "Room is full" });
  if (room.status === "playing") return res.status(409).json({ error: "Game has already started" });

  try {
    room.playerCount++;
    room.lastActivity = Date.now();
    await room.save();
    console.log(`🚪 Player ${playerId} joined room: ${room.code}`);
    res.json({ success: true, room });
  } catch (err) {
    console.error("Room join error:", err.message);
    res.status(500).json({ error: "Failed to join room" });
  }
});

// GET ACTIVE ROOMS
router.get("/active", async (req, res) => {
  try {
    const threshold = Date.now() - ROOM_TIMEOUT;
    const rooms = await Room.find({ lastActivity: { $gt: threshold } });
    console.log(`📋 Returning ${rooms.length} active rooms`);
    res.json({ success: true, rooms, total: rooms.length });
  } catch (err) {
    console.error("Get rooms error:", err.message);
    res.status(500).json({ error: "Failed to get active rooms" });
  }
});

// VALIDATE ROOM
router.get("/validate/:code", async (req, res) => {
  const room = await Room.findOne({ code: req.params.code.toUpperCase() });
  if (!room) return res.status(404).json({ success: false, error: "Room not found or no longer active" });

  room.lastActivity = Date.now();
  await room.save();

  res.json({
    success: true,
    room: {
      code: room.code,
      status: room.status,
      playerCount: room.playerCount,
      maxPlayers: room.maxPlayers,
      available: room.playerCount < room.maxPlayers && room.status === "waiting"
    }
  });
});

// UPDATE ROOM STATUS
router.patch("/status", async (req, res) => {
  const { code, status, hostId } = req.body;
  if (!code || !status || !hostId)
    return res.status(400).json({ error: "Room code, status, and hostId are required" });

  const room = await Room.findOne({ code: code.toUpperCase() });
  if (!room) return res.status(404).json({ error: "Room not found" });
  if (room.hostId !== hostId) return res.status(403).json({ error: "Only room host can update status" });

  room.status = status;
  room.lastActivity = Date.now();
  await room.save();

  console.log(`📊 Room ${room.code} status updated to: ${status}`);
  res.json({ success: true, room });
});

// LEAVE ROOM
router.post("/leave", async (req, res) => {
  const { code, playerId } = req.body;
  if (!code || !playerId)
    return res.status(400).json({ error: "Room code and playerId are required" });

  const room = await Room.findOne({ code: code.toUpperCase() });
  if (!room) return res.status(404).json({ error: "Room not found" });

  room.playerCount = Math.max(0, room.playerCount - 1);
  room.lastActivity = Date.now();

  if (room.hostId === playerId || room.playerCount === 0) {
    await Room.deleteOne({ code: room.code });
    console.log(`🗑️ Room ${room.code} deleted (host left or empty)`);
  } else {
    await room.save();
    console.log(`👋 Player ${playerId} left room: ${room.code}`);
  }

  res.json({ success: true });
});

module.exports = router;
