const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

class UserModel {
  constructor() {
    this.schema = new mongoose.Schema({
      username: {
        type: String,
        required: [true, 'Username is required'],
        unique: true,
        trim: true,
        minlength: [3, 'Username must be at least 3 characters'],
        maxlength: [30, 'Username cannot exceed 30 characters']
      },
      email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
      },
      password: {
        type: String,
        required: function() {
          return this.authProvider === 'local';
        },
        minlength: [6, 'Password must be at least 6 characters'],
        select: false
      },
      googleId: {
        type: String,
        unique: true,
        sparse: true
      },
      authProvider: {
        type: String,
        enum: ['local', 'google'],
        default: 'local'
      },
      fullName: {
        type: String,
        trim: true,
        default: ''
      },
      avatar: {
        type: String,
        default: ''
      },
      bio: {
        type: String,
        maxlength: [200, 'Bio cannot exceed 200 characters'],
        default: ''
      },
      dateOfBirth: {
        type: Date,
        default: null
      },
      gender: {
        type: String,
        enum: ['male', 'female', 'other', ''],
        default: ''
      },
      phone: {
        type: String,
        default: ''
      },
      location: {
        type: String,
        default: ''
      },
      website: {
        type: String,
        default: ''
      },
      isOnline: {
        type: Boolean,
        default: false
      },
      lastSeen: {
        type: Date,
        default: Date.now
      },
      role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
      },
      friends: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }],
      friendRequests: [{
        from: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        createdAt: {
          type: Date,
          default: Date.now
        }
      }],
      sentFriendRequests: [{
        to: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        createdAt: {
          type: Date,
          default: Date.now
        }
      }],
      blockedUsers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }],
      restrictedUsers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }],
      // 2FA Fields
      twoFactorEnabled: {
        type: Boolean,
        default: false
      },
      twoFactorSecret: {
        type: String,
        select: false
      },
      twoFactorBackupCodes: [{
        code: {
          type: String,
          select: false
        },
        used: {
          type: Boolean,
          default: false
        },
        usedAt: {
          type: Date
        }
      }],
      twoFactorMethod: {
        type: String,
        enum: ['totp', 'sms', 'email'],
        default: 'totp'
      }
    }, {
      timestamps: true
    });

    this.initializeHooks();
    this.initializeMethods();
  }

  initializeHooks() {
    // Hash password before saving
    this.schema.pre('save', async function(next) {
      if (!this.isModified('password')) {
        return next();
      }
      try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
      } catch (error) {
        next(error);
      }
    });
  }

  initializeMethods() {
    // Method to compare password
    this.schema.methods.comparePassword = async function(candidatePassword) {
      try {
        return await bcrypt.compare(candidatePassword, this.password);
      } catch (error) {
        throw new Error('Password comparison failed');
      }
    };

    // Method to get public profile
    this.schema.methods.getPublicProfile = function() {
      return {
        _id: this._id,
        username: this.username,
        email: this.email,
        fullName: this.fullName,
        avatar: this.avatar,
        bio: this.bio,
        dateOfBirth: this.dateOfBirth,
        gender: this.gender,
        phone: this.phone,
        location: this.location,
        website: this.website,
        isOnline: this.isOnline,
        lastSeen: this.lastSeen,
        role: this.role,
        createdAt: this.createdAt,
        twoFactorEnabled: this.twoFactorEnabled
      };
    };
  }

  getModel() {
    return mongoose.model('User', this.schema);
  }
}

module.exports = new UserModel().getModel();