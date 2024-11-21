const express = require('express'); 
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const bodyParser = require('body-parser');
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');

const router = express.Router();
router.use(cors());
router.use(express.json()); // Simplified to use only express.json()
router.use(express.static('public'));

// Define User schema
const UserSchema = new mongoose.Schema({
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phoneNumber: { type: String, optional: true },
    role: { type: String, required: true }
}, { timestamps: true });

const User = mongoose.model('User', UserSchema);

const JWT_SECRET = 'your_secret_key';

// Function to generate JWT token
function generateToken(user) {
    return jwt.sign({ username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
}

// Registration route
router.post('/register', [
    body('firstName').notEmpty().withMessage('First name is required'),
    body('lastName').notEmpty().withMessage('Last name is required'),
    body('username').isLength({ min: 5 }).withMessage('Username must be at least 5 characters long'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long'),
    body('phoneNumber').optional().isMobilePhone().withMessage('Invalid phone number'),
    body('role').notEmpty().withMessage('Role is required')
], async (req, res) => {
    const errors = validationResult(req);
   /* if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    } */

    const { firstName, lastName, username, password, phoneNumber, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
        return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password and create new user
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ firstName, lastName, username, password: hashedPassword, phoneNumber, role });

    try {
        await newUser.save();
        console.log('User registered successfully:', { username: newUser.username, role: newUser.role });
        return res.status(201).json({ message: 'User registered successfully' });
    } catch (err) {
        return res.status(500).json({ message: 'Internal server error' });
    }
});

// Login route
router.post('/login', [
    body('username').notEmpty().withMessage('Username is required'),
    body('password').notEmpty().withMessage('Password is required'),
    body('role').notEmpty().withMessage('Role is required')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.log("Validation errors:", errors.array());
        return res.status(400).json({ errors: errors.array() });
    }

    const { username, password, role } = req.body;

    // Find user by username and role
    const user = await User.findOne({ username, role });
    
    if (!user) {
        console.log(`Login failed: User not found or role mismatch for username: ${username}`);
        return res.status(401).json({ message: 'User not found or role mismatch for username' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        console.log(`Login failed: Incorrect password for username: ${username}`);
        return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate token
    const token = generateToken(user);
    console.log(`Login successful for username: ${username}. Role: ${role}. Token generated.`);
    return res.status(200).json({ message: 'Login successful', user: { username: user.username, role: user.role }, token });
});

// Middleware to protect routes
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ message: 'No token provided' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(401).json({ message: 'Invalid or expired token' });
        req.user = user;
        next();
    });
}

module.exports = router;
