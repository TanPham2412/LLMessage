var mongoose = require('mongoose');

class Message {
    _id;
    conversation;
    sender;
    content;
    type;
    fileUrl;
    fileName;
    fileSize;
    isRead;
    readBy;
    isDeleted;
    deletedAt;
    isBlocked;
    blockedMessage;
    editedAt;
    isEdited;

    constructor() {

    }

    getSchema() {
        var schema = new mongoose.Schema({
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
                enum: ['text', 'image', 'file', 'system', 'contact'],
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
            },
            editedAt: {
                type: Date,
                default: null
            },
            isEdited: {
                type: Boolean,
                default: false
            },
            deletedFor: [{
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            }],
            contactData: {
                userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
                name: { type: String, default: '' },
                username: { type: String, default: '' },
                avatar: { type: String, default: '' }
            }
        }, {
            timestamps: true
        });

        schema.index({ conversation: 1, createdAt: -1 });
        schema.index({ sender: 1 });

        return schema;
    }

    getModel() {
        return mongoose.model('Message', this.getSchema());
    }
}

module.exports = new Message().getModel();
