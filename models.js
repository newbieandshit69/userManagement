const mongoose = require('mongoose');

const SessionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true 
    },
    token: {
        type: String,
        required: true,
        unique: true
    }, 
    loggedInAt: {
        type: Date,
        default: () => Date.now()
    },
    expiresAt: {
        type: Date, 
        expires: 3600,
        default: () => Date.now() + 3600 * 1000
    }
})


const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        min: 1,
        max: 20,
        required: true
    },
    username: {
        type: String,
        min: 3,
        max: 10,
        unique: true,
        required: true
    },
    email: {
        type: String,
        unique: true,
        required: true
    },
    role: {
        type: String,
        required: true,
        default: 'user'
    }
});


const UserCredSchema = new mongoose.Schema({
    password: {
        type: String,
        min: 3,
        max: 10,
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Reference to User model
        required: true
    }
})

const Session = new mongoose.model("Session", SessionSchema);
const User = new mongoose.model("User", UserSchema);
const Cred = new mongoose.model("Cred", UserCredSchema);

module.exports = { Session, User, Cred };