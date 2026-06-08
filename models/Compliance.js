const mongoose = require('mongoose');

const complianceSchema = new mongoose.Schema({
  complianceId: { type: String, required: true, unique: true },
  type: { type: String, enum: ['recurring', 'event'], required: true },
  act: { type: String },
  title: { type: String, required: true },
  detail: { type: String },
  dept: { type: String },
  recurrence: { type: String },
  dueDate: { type: String },
  alertDate: { type: String },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  status: { type: String, enum: ['Pending', 'InProgress', 'Completed'], default: 'Pending' },
  completedDate: { type: Date, default: null },
  completionFile: { type: String, default: null },
  authority: { type: String },
  penalty: { type: String },
  clause: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Compliance', complianceSchema);