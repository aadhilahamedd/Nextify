const mongoose = require('mongoose');

const chatSessionSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, unique: true, index: true },
    messages: [
      {
        role: { type: String, enum: ['user', 'assistant'], required: true },
        content: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
      },
    ],
    mode: {
      type: String,
      enum: ['ai', 'human', 'demo'],
      default: 'ai',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ChatSession', chatSessionSchema);
