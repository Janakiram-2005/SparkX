import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import multer from 'multer';
import xlsx from 'xlsx';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// Import Models
import Team from './models/Team.js';
import SystemState from './models/SystemState.js';
import Feedback from './models/Feedback.js';

const teamAlerts = []; // Store active issues { id, teamId, teamName, timestamp }

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

const apiLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 500, // limit each IP to 500 requests per windowMs
  message: { success: false, message: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api', apiLimiter);

// === MONGODB CONNECTION ===
const MONGO_URI = process.env.MONGO_URI;

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
    const team = await Team.findOne({ ai_id, password }).select('_id team_name ai_id status disqualified qualifiedForRound2');
    if (team) {
      if (team.disqualified) {
        return res.json({ success: false, message: 'Your team has been disqualified.' });
      }

      const state = await SystemState.findOne();
      const isRound2Active = state ? state.round2_active : false;

      if (isRound2Active && !team.qualifiedForRound2) {
        return res.json({ success: false, message: 'You are not qualified for Round 2.' });
      }

      // Generate session token
      const sessionToken = crypto.randomBytes(32).toString('hex');
      team.sessionToken = sessionToken;
      await team.save();

      // Map _id to id for frontend consistency
      const teamObj = team.toObject();
      teamObj.id = teamObj._id; 
      teamObj.sessionToken = sessionToken; // send to frontend
      res.json({ success: true, team: teamObj, isRound2: isRound2Active });
    } else {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Auth Route: Verify Session Token
app.post('/api/auth/verify', async (req, res) => {
  const { ai_id, sessionToken } = req.body;
  try {
    if (!ai_id || !sessionToken) {
      return res.status(401).json({ success: false, message: 'Missing credentials' });
    }
    const team = await Team.findOne({ ai_id, sessionToken }).select('_id team_name ai_id status disqualified qualifiedForRound2');
    if (team) {
      if (team.disqualified) {
        return res.json({ success: false, message: 'Your team has been disqualified.' });
      }

      const state = await SystemState.findOne();
      const isRound2Active = state ? state.round2_active : false;

      if (isRound2Active && !team.qualifiedForRound2) {
        return res.json({ success: false, message: 'You are not qualified for Round 2.' });
      }

      const teamObj = team.toObject();
      teamObj.id = teamObj._id;
      teamObj.sessionToken = sessionToken;
      res.json({ success: true, team: teamObj, isRound2: isRound2Active });
    } else {
      res.status(401).json({ success: false, message: 'Invalid or expired session' });
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

// Admin Route: Add Single Team
app.post('/api/admin/teams/add', async (req, res) => {
  try {
    const { team_name, ai_id, password, officialTeamId, eventName, members } = req.body;
    
    // Assign a random puzzle
    const puzzleBase = DEFAULT_DATABASE[Math.floor(Math.random() * DEFAULT_DATABASE.length)];
    
    const newTeam = new Team({
      team_name,
      ai_id,
      password,
      officialTeamId: officialTeamId || '',
      eventName: eventName || '',
      members: members || [],
      puzzle: puzzleBase.puzzle,
      problemStatement: puzzleBase.problemStatement
    });
    
    await newTeam.save();
    io.to('admin_room').emit('team_update'); // trigger refresh on admin dashboard
    res.json({ success: true, team: newTeam, message: 'Team created successfully' });
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

// Public Route: Leaderboard
app.get('/api/leaderboard', async (req, res) => {
  try {
    const teams = await Team.find({ disqualified: false })
      .select('team_name score jigsaw_progress status')
      .sort({ score: -1, jigsaw_progress: -1 });
    res.json({ success: true, teams });
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
      sessionToken: "",
      tabSwitchCount: 0,
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
    const duplicates = [];
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const teamName = row.TeamName || row.team_name || row['Team Name'] || row.Name || `Team ${i+1}`;
      const officialTeamId = row.OfficialTeamId || row.officialTeamId || row['Official Team ID'] || row['Registration Number'] || '';
      const aiId = String(row.AI_ID || row.ai_id || row['Login ID'] || row['VUCSE ID'] || i + 1);
      const password = row.Password || row.password || `AIX${Math.floor(100 + Math.random() * 900)}`;

      // Check if duplicate
      const existing = await Team.findOne({ 
        $or: [
          { ai_id: aiId }, 
          { officialTeamId: officialTeamId !== '' ? officialTeamId : 'xyz_invalid' }
        ] 
      });

      if (existing) {
        duplicates.push({ teamName, aiId, officialTeamId, reason: 'Duplicate Login ID or Official Team ID' });
        continue;
      }

      // Extract members if present in Excel (e.g., Member 1 Name, Member 1 Role, etc.)
      const members = [];
      if (row.Name && !row['Member 1 Name']) {
        members.push({
          fullName: row.Name,
          universityRegNo: row['Registration Number'] || '',
          phone: row.Phone || '',
          email: row.Email || '',
          role: 'Participant'
        });
      } else {
        for (let m = 1; m <= 3; m++) {
          if (row[`Member ${m} Name`]) {
            members.push({
              fullName: row[`Member ${m} Name`],
              role: row[`Member ${m} Role`] || '',
              universityRegNo: row[`Member ${m} RegNo`] || '',
              email: row[`Member ${m} Email`] || '',
              phone: row[`Member ${m} Phone`] || ''
            });
          }
        }
      }

      const puzzleBase = DEFAULT_DATABASE[Math.floor(Math.random() * DEFAULT_DATABASE.length)];

      const newTeam = new Team({
        team_name: teamName,
        ai_id: aiId,
        password: password,
        officialTeamId: officialTeamId,
        eventName: row.EventName || row.eventName || '',
        members: members,
        puzzle: puzzleBase.puzzle,
        problemStatement: puzzleBase.problemStatement
      });

      await newTeam.save();
      insertedCount++;
    }

    res.json({ success: true, message: `Successfully processed ${insertedCount} teams.`, duplicates });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error processing Excel file' });
  }
});

// Admin Route: Export Teams to Excel
app.get('/api/admin/teams/export', async (req, res) => {
  try {
    const teams = await Team.find().lean();
    
    // Map teams to exclude gameplay stats
    const exportData = teams.map(t => {
      const mapped = {
        'Team Name': t.team_name,
        'Official Team ID': t.officialTeamId,
        'Login ID (ai_id)': t.ai_id,
        'Password': t.password,
        'Event Name': t.eventName
      };
      
      // Flatten members
      if (t.members && t.members.length > 0) {
        t.members.forEach((m, i) => {
          mapped[`Member ${i+1} Name`] = m.fullName;
          mapped[`Member ${i+1} Role`] = m.role;
          mapped[`Member ${i+1} RegNo`] = m.universityRegNo;
          mapped[`Member ${i+1} Email`] = m.email;
          mapped[`Member ${i+1} Phone`] = m.phone;
        });
      }
      return mapped;
    });

    const ws = xlsx.utils.json_to_sheet(exportData);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Teams Results");
    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
    
    res.setHeader('Content-Disposition', 'attachment; filename="AI_SparkX_Teams.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Export failed' });
  }
});

// Admin Route: Export Teams for Eval
app.get('/api/admin/teams/export-eval', async (req, res) => {
  try {
    // Note: Can change `{ qualifiedForRound2: true }` if you want all teams instead.
    const teams = await Team.find({ qualifiedForRound2: true }).lean().sort({ score: -1, jigsaw_progress: -1 });
    
    let counter = 1;
    const exportData = teams.map(t => {
      const gpaScore = ((t.score || 0) / 100).toFixed(2);
      
      return {
        'S.No': counter++,
        'Team Name': t.team_name,
        'Members': t.members && t.members.length > 0 ? t.members.map(m => m.fullName).join(', ') : '',
        'Round 1 Score (out of 10)': gpaScore,
        'Body Language ( 3 M )': '',
        'Q/A ( 3M )': '',
        'Design Thinking Rules (4M)': '',
        'Work Flow (5M)': '',
        'Total': ''
      };
    });

    const ws = xlsx.utils.json_to_sheet(exportData);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Round 3 Evaluation");
    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
    
    res.setHeader('Content-Disposition', 'attachment; filename="AI_SparkX_Evaluation_Sheet.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Export failed' });
  }
});

// Admin Route: Export Qualified Teams (Simple Excel)
app.get('/api/admin/teams/export-qualified', async (req, res) => {
  try {
    const teams = await Team.find({ qualifiedForRound2: true }).lean().sort({ team_name: 1 });
    
    let counter = 1;
    let exportData = teams.map(t => {
      return {
        'S.No': counter++,
        'Team Name': t.team_name,
        'Members Details': t.members && t.members.length > 0 ? t.members.map(m => `${m.fullName} (${m.email || 'No email'})`).join(', ') : 'No members'
      };
    });
    
    if (exportData.length === 0) {
      exportData = [{ 'S.No': '', 'Team Name': 'No qualified teams yet', 'Members Details': '' }];
    }

    const ws = xlsx.utils.json_to_sheet(exportData);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Qualified Teams");
    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
    
    res.setHeader('Content-Disposition', 'attachment; filename="AI_SparkX_Qualified_Teams.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Export failed' });
  }
});

// Admin Route: Export Problem Statement Allocation (HTML Print/PDF)
app.get('/api/admin/teams/export-ps', async (req, res) => {
  try {
    const teams = await Team.find().lean().sort({ team_name: 1 });
    
    let rowsHtml = '';
    if (teams.length === 0) {
      rowsHtml = `<tr><td colspan="3" style="text-align:center;">No teams found</td></tr>`;
    } else {
      teams.forEach((t, i) => {
        rowsHtml += `
          <tr>
            <td>${i + 1}</td>
            <td>${t.team_name}</td>
            <td>${t.problemStatement ? t.problemStatement : 'Not Assigned'}</td>
          </tr>
        `;
      });
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Problem Statement Allocation</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
          h1 { text-align: center; color: #1e293b; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #cbd5e1; padding: 12px; text-align: left; }
          th { background-color: #f1f5f9; font-weight: bold; }
          @media print {
            button { display: none; }
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <div style="text-align: right; margin-bottom: 20px;">
          <button onclick="window.print()" style="padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 16px;">
            Save as PDF / Print
          </button>
        </div>
        <h1>AI SparkX - Problem Statement Allocation</h1>
        <table>
          <thead>
            <tr>
              <th style="width: 10%;">S.No</th>
              <th style="width: 30%;">Team Name</th>
              <th style="width: 60%;">Allocated Problem Statement</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;
    
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
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

// Admin Route: Edit Team
app.put('/api/admin/teams/:id', async (req, res) => {
  try {
    const { team_name, ai_id, password, officialTeamId, eventName, members } = req.body;
    const team = await Team.findByIdAndUpdate(req.params.id, { 
      team_name, 
      ai_id, 
      password,
      officialTeamId,
      eventName,
      members
    }, { new: true });
    
    io.to('admin_room').emit('team_update');
    res.json({ success: true, team });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating team' });
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

// Admin Route: Get Alerts
app.get('/api/admin/alerts', (req, res) => {
  res.json({ success: true, alerts: teamAlerts });
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

  socket.on('join_leaderboard', () => {
    socket.join('leaderboard_room');
  });

  socket.on('assign_puzzle', async ({ teamId, index }) => {
    if (teamId === '1') return; // Ignore DB ops for dummy login
    try {
      await Team.findByIdAndUpdate(teamId, { assignedPuzzleIndex: index });
    } catch(err) { console.error('Failed to assign puzzle', err); }
  });

  socket.on('puzzle_update', async (data) => {
    const { teamId, progress } = data;
    io.to('admin_room').emit('team_progress_update', { teamId, progress });
    if (teamId === '1') return; // Ignore DB ops for dummy login
    
    try {
      await Team.findByIdAndUpdate(teamId, { jigsaw_progress: progress });
      io.to('leaderboard_room').emit('refresh_leaderboard');
    } catch (err) {
      console.error('Failed to save progress', err);
    }
  });

  socket.on('puzzle_complete', async (data) => {
    const { teamId, score } = data;
    if (teamId === '1') return; // Ignore DB ops for dummy login
    try {
      await Team.findByIdAndUpdate(teamId, { status: 'completed', score: score });
      io.to('admin_room').emit('team_completed', { teamId, score });
      io.to('leaderboard_room').emit('refresh_leaderboard');
    } catch (err) {
      console.error(err);
    }
  });

  socket.on('tab_switch_violation', async ({ teamId }) => {
    if (teamId === '1') return; // Ignore DB ops for dummy login
    try {
      const team = await Team.findById(teamId);
      if (team) {
        team.tabSwitchCount += 1;
        if (team.tabSwitchCount >= 5) {
          team.disqualified = true;
          io.to(`team_${teamId}`).emit('disqualified');
        }
        await team.save();
        io.to('admin_room').emit('team_update');
      }
    } catch (e) {
      console.error('Tab switch update error:', e);
    }
  });

  socket.on('raise_issue', ({ teamId, teamName }) => {
    const alert = {
      id: Date.now().toString(),
      teamId,
      teamName,
      timestamp: new Date().toISOString()
    };
    teamAlerts.push(alert);
    io.to('admin_room').emit('new_alert', alert);
  });

  socket.on('resolve_alert', ({ alertId }) => {
    const index = teamAlerts.findIndex(a => a.id === alertId);
    if (index !== -1) {
      teamAlerts.splice(index, 1);
      io.to('admin_room').emit('alert_resolved', { alertId });
    }
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

// Serve frontend static files
app.use(express.static(path.join(__dirname, 'dist')));

app.get(/(.*)/, (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 AI SparkX Backend running with MONGODB & WebSockets on port ${PORT}`);
});
