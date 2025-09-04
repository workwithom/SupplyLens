import express from 'express';
import User from '../models/User.js';
import { isAuthenticatedUser } from '../middleware/auth.js';

const router = express.Router();

// Register a new user
router.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: "User with this email already exists"
            });
        }

        // Validate required fields
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Please provide all required fields"
            });
        }

        // Create new user
        const user = await User.create({
            name,
            email,
            password
        });

        const token = user.getJwtToken();

        // Set cookie options
        const cookieOptions = {
            expires: new Date(Date.now() + (process.env.COOKIE_EXPIRE || 7) * 24 * 60 * 60 * 1000),
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax'
        };

        res.status(201)
           .cookie('token', token, cookieOptions)
           .json({
                success: true,
                token,
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email
                }
            });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: error.message || "Internal server error"
        });
    }
});

// Login user
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Please enter email and password"
            });
        }

        const user = await User.findOne({ email }).select('+password');

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        const isPasswordMatched = await user.comparePassword(password);

        if (!isPasswordMatched) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        const token = user.getJwtToken();

        res.status(200).cookie('token', token, {
            expires: new Date(Date.now() + process.env.COOKIE_EXPIRE * 24 * 60 * 60 * 1000),
            httpOnly: true
        }).json({
            success: true,
            token,
            user
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Logout user
router.get('/logout', isAuthenticatedUser, (req, res) => {
    res.cookie('token', null, {
        expires: new Date(Date.now()),
        httpOnly: true
    }).json({
        success: true,
        message: "Logged out successfully"
    });
});

// Get user profile
router.get('/me', isAuthenticatedUser, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        res.status(200).json({
            success: true,
            user
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

export default router;
