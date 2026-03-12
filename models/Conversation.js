const mongoose = require('mongoose');

class ConversationModel {
  constructor() {
    this.schema = new mongoose.Schema({
      participants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      }],
      type: {
        type: String,
        enum: ['private', 'group'],
        default: 'private'
      },
      name: {
        type: String,
        trim: true,
        default: ''
      },
      avatar: {
        type: String,
        default: ''
      },
      lastMessage: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message'
      },
      lastMessageAt: {
        type: Date,
        default: Date.now
      },
      createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      isActive: {
        type: Boolean,
        default: true
      },
      pinnedBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }],
      deletedBy: [{
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        deletedAt: {
          type: Date,
          default: Date.now
        }
      }],
      nicknames: [{
        setter: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        target: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        nickname: { type: String, trim: true },
        isPublic: { type: Boolean, default: true }
      }]
    }, {
      timestamps: true
    });

    this.initializeIndexes();
    this.initializeMethods();
  }

  initializeIndexes() {
    this.schema.index({ participants: 1 });
    this.schema.index({ lastMessageAt: -1 });
  }

  initializeMethods() {
    this.schema.methods.hasParticipant = function(userId) {
      return this.participants.some(p => p.toString() === userId.toString());
    };
  }

  getModel() {
    return mongoose.model('Conversation', this.schema);
  }
}

module.exports = new ConversationModel().getModel();
