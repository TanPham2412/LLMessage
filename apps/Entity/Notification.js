var mongoose = require('mongoose');

class Notification {
    _id;
    recipient;
    sender;
    type;
    title;
    message;
    data;
    isRead;
    createdAt;

    constructor() {

    }

    static getSchema() {
        var schema = new mongoose.Schema({
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

        schema.index({ recipient: 1, createdAt: -1 });
        schema.index({ recipient: 1, isRead: 1 });

        return schema;
    }

    static getModel() {
        return mongoose.model('Notification', this.getSchema());
    }
}

module.exports = Notification.getModel();
