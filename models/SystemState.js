import mongoose from 'mongoose';

const systemStateSchema = new mongoose.Schema({
  round1_active: { type: Boolean, default: false },
  round2_active: { type: Boolean, default: false },
  results_announced: { type: Boolean, default: false },
  round2_endTime: { type: Date, default: null }
});

export default mongoose.model('SystemState', systemStateSchema);
