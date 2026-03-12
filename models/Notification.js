const mongoose = require('mongoose');

class NotificationModel {
  constructor() {
    this.schema = new mongoose.Schema({
      recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
      },
      sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      type: {
        type: String,
        enum: ['friend-request', 'friend-accepted', 'friend-rejected', 'message', 'system', 'report'],
        required: true
      },
      title: {
        type: String,
        required: true
      },
      message: {
        type: String,
        required: true
      },
      data: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
      },
      isRead: {
        type: Boolean,
        default: false
      },
      createdAt: {
        type: Date,
        default: Date.now,
        index: true
      }
    }, {
      timestamps: true
    });

    this.initializeIndexes();
  }

  initializeIndexes() {
    this.schema.index({ recipient: 1, createdAt: -1 });
    this.schema.index({ recipient: 1, isRead: 1 });
  }

  getModel() {
    return mongoose.model('Notification', this.schema);
  }
}

module.exports = new NotificationModel().getModel();
