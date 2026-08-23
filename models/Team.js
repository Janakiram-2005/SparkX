import mongoose from 'mongoose';

const memberSchema = new mongoose.Schema({
  fullName: String,
  role: String,
  agenticAiRegId: String,
  universityRegNo: String,
  yearOfStudy: String,
  dob: String,
  phone: String,
  email: String
});

const teamSchema = new mongoose.Schema({
  team_name: { type: String, required: true },
  ai_id: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  officialTeamId: { type: String, default: "" },
  eventName: { type: String, default: "" },
  members: [memberSchema],
  score: { type: Number, default: 0 },
  jigsaw_progress: { type: Number, default: 0 },
  status: { type: String, enum: ['waiting', 'started', 'completed'], default: 'waiting' },
  qualifiedForRound2: { type: Boolean, default: false },
  disqualified: { type: Boolean, default: false },
  round1_attempts: { type: Number, default: 0 },
  assignedPuzzleIndex: { type: Number, default: -1 }
}, { timestamps: true });

export default mongoose.model('Team', teamSchema);
