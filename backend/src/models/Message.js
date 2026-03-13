const mongoose = require('mongoose');

class MessageModel {
  constructor() {
    this.schema = new mongoose.Schema({
      conversation: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Conversation',
        required: true
      },
      sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      content: {
        type: String,
        trim: true
      },
      type: {
        type: String,
        enum: ['text', 'image', 'file', 'system'],
        default: 'text'
      },
      fileUrl: {
        type: String,
        default: ''
      },
      fileName: {
        type: String,
        default: ''
      },
      fileSize: {
        type: Number,
        default: 0
      },
      isRead: {
        type: Boolean,
        default: false
      },
      readBy: [{
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        readAt: {
          type: Date,
          default: Date.now
        }
      }],
      isDeleted: {
        type: Boolean,
        default: false
      },
      deletedAt: {
        type: Date
      },
      isBlocked: {
        type: Boolean,
        default: false
      },
      blockedMessage: {
        type: String,
        default: ''
      }
    }, {
      timestamps: true
    });

    this.initializeIndexes();
  }

  initializeIndexes() {
    this.schema.index({ conversation: 1, createdAt: -1 });
    this.schema.index({ sender: 1 });
  }

  getModel() {
    return mongoose.model('Message', this.schema);
  }
}

module.exports = new MessageModel().getModel();
