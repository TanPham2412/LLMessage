var mongoose = require('mongoose');

class Conversation {
    _id;
    participants;
    type;
    name;
    avatar;
    lastMessage;
    lastMessageAt;
    createdBy;
    isActive;
    pinnedBy;
    deletedBy;
    nicknames;

    constructor() {

    }

    static getSchema() {
        var schema = new mongoose.Schema({
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
            }],
            pinnedMessages: [{
                message: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
                pinnedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
                pinnedAt: { type: Date, default: Date.now }
            }]
        }, {
            timestamps: true
        });

        schema.index({ participants: 1 });
        schema.index({ lastMessageAt: -1 });

        schema.methods.hasParticipant = function(userId) {
            return this.participants.some(function(p) {
                return p.toString() === userId.toString();
            });
        };

        return schema;
    }

    static getModel() {
        return mongoose.model('Conversation', this.getSchema());
    }
}

module.exports = Conversation.getModel();
