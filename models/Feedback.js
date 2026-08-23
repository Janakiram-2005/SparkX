import mongoose from 'mongoose';

const feedbackSchema = new mongoose.Schema({
  team_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  improvements_text: { type: String }
}, { timestamps: true });

export default mongoose.model('Feedback', feedbackSchema);
