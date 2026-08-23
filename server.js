import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import multer from 'multer';
import xlsx from 'xlsx';
import dotenv from 'dotenv';

dotenv.config();

// Import Models
import Team from './models/Team.js';
import SystemState from './models/SystemState.js';
import Feedback from './models/Feedback.js';

const upload = multer({ storage: multer.memoryStorage() });

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

// === MONGODB CONNECTION ===
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://testuser:testuser@cluster0.vulsn3z.mongodb.net/?appName=Cluster0';

mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log('✅ Connected to MongoDB Atlas');
    // Ensure SystemState exists
    const state = await SystemState.findOne();
    if (!state) await SystemState.create({ round1_active: false });
  })
  .catch(err => console.error('MongoDB connection error:', err));


// === REST API ROUTES ===

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' });
});

// Auth Route: Login Team
app.post('/api/auth/login', async (req, res) => {
  const { ai_id, password } = req.body;
  try {
    const team = await Team.findOne({ ai_id, password }).select('_id team_name ai_id status');
    if (team) {
      // Map _id to id for frontend consistency
      const teamObj = team.toObject();
      teamObj.id = teamObj._id; 
      res.json({ success: true, team: teamObj });
    } else {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Admin Route: Auth
app.post('/api/admin/auth', (req, res) => {
  const { securityKey } = req.body;
  if (securityKey === process.env.ADMIN_SECRET_KEY) {
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false, message: 'Invalid Security Key' });
  }
});

// Admin Route: Export Teams to Excel
app.get('/api/admin/teams/export', async (req, res) => {
  try {
    const teams = await Team.find().sort({ ai_id: 1 });
    const exportData = teams.map(t => {
      const memberNames = t.members ? t.members.map(m => m.fullName).join(', ') : '';
      return {
        'Team Name': t.team_name,
        'Official ID': t.officialTeamId || '',
        'Login ID': t.ai_id,
        'Password': t.password,
        'Members': memberNames,
        'Round 1 Score': t.score,
        'Round 1 Progress': `${t.jigsaw_progress}%`,
        'Qualified for R2': t.qualifiedForRound2 ? 'Yes' : 'No',
        'Disqualified': t.disqualified ? 'Yes' : 'No'
      };
    });

    const ws = xlsx.utils.json_to_sheet(exportData);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Teams");

    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
    
    res.setHeader('Content-Disposition', 'attachment; filename="AI_SparkX_Teams.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error during export' });
  }
});

// Admin Route: Get Global State
app.get('/api/admin/state', async (req, res) => {
  try {
    const state = await SystemState.findOne();
    res.json({ success: true, state });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Admin Route: Toggle Round 1 State
app.post('/api/admin/state/toggle', async (req, res) => {
  const { active } = req.body;
  try {
    await SystemState.updateOne({}, { round1_active: active });
    io.to('admin_room').emit('state_changed', { round1_active: active });
    io.emit('global_state_update', { round1_active: active });
    res.json({ success: true, active });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Admin Route: Adjust Timer Globally
app.post('/api/admin/timer/adjust', async (req, res) => {
  const { seconds } = req.body;
  try {
    io.emit('timer_adjustment', { seconds });
    res.json({ success: true, message: `Adjusted global timer by ${seconds}s` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Admin Route: Promote Team to Round 2
app.post('/api/admin/teams/promote/:id', async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });
    
    team.qualifiedForRound2 = !team.qualifiedForRound2;
    await team.save();
    
    // Broadcast update to admin room so dashboard updates instantly
    io.to('admin_room').emit('team_promotion_update', { teamId: team._id, qualifiedForRound2: team.qualifiedForRound2 });
    
    res.json({ success: true, qualifiedForRound2: team.qualifiedForRound2, message: 'Team promotion toggled' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Admin Route: Get all teams
app.get('/api/admin/teams', async (req, res) => {
  try {
    const teams = await Team.find().sort({ score: -1, jigsaw_progress: -1 });
    // map _id to id
    const mappedTeams = teams.map(t => ({ ...t.toObject(), id: t._id }));
    res.json({ success: true, teams: mappedTeams });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Admin Route: Targeted Team Reset
app.post('/api/admin/teams/reset/:id', async (req, res) => {
  const teamId = req.params.id;
  try {
    await Team.findByIdAndUpdate(teamId, { 
      status: 'waiting', 
      jigsaw_progress: 0, 
      score: 0,
      $inc: { round1_attempts: 1 }
    });
    io.to(`team_${teamId}`).emit('exam_reset');
    io.to('admin_room').emit('team_progress_update', { teamId, progress: 0, status: 'waiting' });
    res.json({ success: true, message: `Team reset successfully.` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Admin Route: Upload Excel & Generate Teams
app.post('/api/admin/teams/upload', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

  try {
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    let insertedCount = 0;
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const teamName = row.TeamName || row.team_name || row['Team Name'] || `Team ${i+1}`;
      const aiId = String(i + 1);
      const password = `AIX${Math.floor(100 + Math.random() * 900)}`;

      await Team.updateOne(
        { ai_id: aiId }, 
        { team_name: teamName, password },
        { upsert: true }
      );
      insertedCount++;
    }

    res.json({ success: true, message: `Successfully processed ${insertedCount} teams.` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error processing Excel file' });
  }
});

// Admin Route: Export Teams to Excel
app.get('/api/admin/teams/export', async (req, res) => {
  try {
    const teams = await Team.find().select('team_name ai_id password score jigsaw_progress status -_id').lean();
    const ws = xlsx.utils.json_to_sheet(teams);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Teams Results");
    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
    
    res.setHeader('Content-Disposition', 'attachment; filename="AI_SparkX_Results.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Export failed' });
  }
});



// === ADVANCED ADMIN & ROUND 2 ROUTES ===

import { tempTeamsDataset } from './src/utils/tempTeamsDataset.js';

// Seed temporary dataset
app.post('/api/admin/teams/seed', async (req, res) => {
  try {
    let inserted = 0;
    for (const teamData of tempTeamsDataset) {
      const password = `AIX${Math.floor(100 + Math.random() * 900)}`;
      const aiId = String(inserted + 1);
      
      await Team.updateOne(
        { officialTeamId: teamData.officialTeamId },
        { 
          team_name: teamData.teamName,
          ai_id: aiId,
          password: password,
          eventName: teamData.eventName,
          officialTeamId: teamData.officialTeamId,
          members: teamData.members
        },
        { upsert: true }
      );
      inserted++;
    }
    res.json({ success: true, message: `Seeded ${inserted} teams.` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Seeding failed' });
  }
});

// Purge all teams
app.post('/api/admin/teams/purge', async (req, res) => {
  try {
    await Team.deleteMany({});
    res.json({ success: true, message: 'All teams purged.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Purge failed' });
  }
});

// Update single team (Manual Edit)
app.put('/api/admin/teams/:id', async (req, res) => {
  try {
    const updated = await Team.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, team: updated, message: 'Team updated.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Update failed' });
  }
});

// Disqualify team
app.post('/api/admin/teams/:id/disqualify', async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });
    team.disqualified = !team.disqualified;
    await team.save();
    io.to('admin_room').emit('team_update', team);
    res.json({ success: true, team, message: `Team ${team.disqualified ? 'disqualified' : 're-qualified'}.` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error' });
  }
});

// Auto-Qualify top N teams
app.post('/api/admin/teams/cutoff', async (req, res) => {
  const { cutoff } = req.body;
  if (!cutoff || isNaN(cutoff)) return res.status(400).json({ success: false, message: 'Invalid cutoff value.' });
  try {
    const allTeams = await Team.find({ disqualified: false }).sort({ score: -1, jigsaw_progress: -1 });
    const topTeams = allTeams.slice(0, cutoff);
    const topIds = topTeams.map(t => t._id);
    
    // Set qualifiedForRound2 to true for top N, false for the rest
    await Team.updateMany({ _id: { $in: topIds } }, { qualifiedForRound2: true });
    await Team.updateMany({ _id: { $nin: topIds } }, { qualifiedForRound2: false });
    
    res.json({ success: true, message: `Top ${cutoff} teams qualified for Round 2.` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Cutoff processing failed.' });
  }
});

// Toggle Round 2 and Timer
app.post('/api/admin/state/round2', async (req, res) => {
  const { active, timerMinutes } = req.body;
  try {
    let state = await SystemState.findOne();
    if (!state) state = new SystemState();
    
    state.round2_active = active;
    if (active && timerMinutes) {
      const endTime = new Date();
      endTime.setMinutes(endTime.getMinutes() + parseInt(timerMinutes));
      state.round2_endTime = endTime;
    } else if (!active) {
      state.round2_endTime = null;
    }
    
    await state.save();
    io.emit('round2_state_update', { active: state.round2_active, endTime: state.round2_endTime });
    res.json({ success: true, state });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update round 2 state.' });
  }
});

// Get System State (Already existing? Let's ensure it's exported)
app.get('/api/state', async (req, res) => {
  try {
    let state = await SystemState.findOne();
    if (!state) {
      state = new SystemState();
      await state.save();
    }
    res.json({ success: true, state });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch state.' });
  }
});


// === WEBSOCKETS (SOCKET.IO) ===
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('join_team', (teamId) => {
    socket.join(`team_${teamId}`);
  });

  socket.on('join_admin', () => {
    socket.join('admin_room');
  });

  socket.on('assign_puzzle', async ({ teamId, index }) => {
    try {
      await Team.findByIdAndUpdate(teamId, { assignedPuzzleIndex: index });
    } catch(err) { console.error('Failed to assign puzzle', err); }
  });

  socket.on('puzzle_update', async (data) => {
    const { teamId, progress } = data;
    io.to('admin_room').emit('team_progress_update', { teamId, progress });
    
    try {
      await Team.findByIdAndUpdate(teamId, { jigsaw_progress: progress });
    } catch (err) {
      console.error('Failed to save progress', err);
    }
  });

  socket.on('puzzle_complete', async (data) => {
    const { teamId, score } = data;
    try {
      await Team.findByIdAndUpdate(teamId, { status: 'completed', score: score });
      io.to('admin_room').emit('team_completed', { teamId, score });
    } catch (err) {
      console.error(err);
    }
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 AI SparkX Backend running with MONGODB & WebSockets on port ${PORT}`);
});
