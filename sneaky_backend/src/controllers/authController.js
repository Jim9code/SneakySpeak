const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendVerificationEmail } = require('../services/emailService');
const sequelize = require('../config/database');

// Verify JWT_SECRET is available
if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not set in environment variables');
}

// Store verification codes temporarily (in production, use Redis or similar)
const verificationCodes = new Map();
const VERIFICATION_CODE_EXPIRY = 10 * 60 * 1000; // 10 minutes
const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
};

// Debug function to log verification codes state
const logVerificationCodes = () => {
    console.log('Current verification codes:', 
        Array.from(verificationCodes.entries()).map(([email, data]) => ({
            email,
            code: data.code,
            age: Math.round((Date.now() - data.timestamp) / 1000) + ' seconds'
        }))
    );
};

const generateUsername = (email) => {
    const [username] = email.split('@');
    return username + Math.floor(Math.random() * 1000);
};

const initiateLogin = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }

        // Validate school email
        const domain = email.split('@')[1];
        if (!domain || !domain.includes('.edu')) {
            return res.status(400).json({ message: 'Must use a school email address' });
        }

        // Generate verification code
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        
        console.log(`Generating verification code for ${email}:`, verificationCode);
        
        // Store verification code with email as key
        verificationCodes.set(email, {
            code: verificationCode,
            timestamp: Date.now()
        });

        logVerificationCodes();

        // Send verification code via email
        try {
            await sendVerificationEmail(email, verificationCode);
            console.log('Verification email sent successfully to:', email);
            return res.json({
                message: 'Verification code sent to your email'
            });
        } catch (emailError) {
            console.error('Failed to send verification email:', emailError);
            verificationCodes.delete(email);
            return res.status(500).json({ message: 'Failed to send verification code' });
        }
    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

const verifyCode = async (req, res) => {
    try {
        const { email, code } = req.body;

        if (!email || !code) {
            return res.status(400).json({ message: 'Email and verification code are required' });
        }

        console.log(`Attempting to verify code for ${email}. Code provided:`, code);
        logVerificationCodes();

        const storedVerification = verificationCodes.get(email);
        if (!storedVerification) {
            console.log(`No verification found for ${email}`);
            return res.status(400).json({ message: 'No verification code found or code expired' });
        }

        console.log(`Found stored verification for ${email}:`, {
            storedCode: storedVerification.code,
            age: Math.round((Date.now() - storedVerification.timestamp) / 1000) + ' seconds'
        });

        if (Date.now() - storedVerification.timestamp > VERIFICATION_CODE_EXPIRY) {
            console.log(`Verification code expired for ${email}`);
            verificationCodes.delete(email);
            return res.status(400).json({ message: 'Verification code expired' });
        }

        if (storedVerification.code !== code) {
            console.log(`Invalid code for ${email}. Expected ${storedVerification.code}, got ${code}`);
            return res.status(400).json({ message: 'Invalid verification code' });
        }

        // Get or create user
        let user = await User.findByEmail(email);
        if (!user) {
            const domain = email.split('@')[1];
            const username = generateUsername(email);
            user = await User.create({
                email,
                username,
                school_domain: domain
            });
        }

        // Update last login
        await User.updateLastLogin(user.id);

        // Generate JWT token and set as cookie
        const token = jwt.sign(
            { userId: user.id },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Set JWT as HTTP-only cookie
        res.cookie('token', token, COOKIE_OPTIONS);

        // Clear used verification code only after successful verification
        verificationCodes.delete(email);

        return res.json({
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                school_domain: user.school_domain,
                coins: user.coins || 0
            },
            token
        });
    } catch (error) {
        console.error('Verification error:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

const getProfile = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        return res.json({
            id: user.id,
            email: user.email,
            username: user.username,
            school_domain: user.school_domain
        });
    } catch (error) {
        console.error('Get profile error:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

const logout = async (req, res) => {
    res.clearCookie('token', COOKIE_OPTIONS);
    return res.json({ message: 'Logged out successfully' });
};

const updateUsername = async (req, res) => {
    try {
        const { username } = req.body;
        const userId = req.user.id;  // From auth middleware
        const COINS_REQUIRED = 70;

        if (!username || username.trim().length < 3) {
            return res.status(400).json({ message: 'Username must be at least 3 characters long' });
        }

        // Get user and check coins
        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if user has enough coins
        if (user.coins < COINS_REQUIRED) {
            return res.status(400).json({ 
                message: `Insufficient coins. Username change requires ${COINS_REQUIRED} coins. You have ${user.coins} coins.` 
            });
        }

        // Deduct coins and update username in a transaction
        const result = await sequelize.transaction(async (t) => {
            // Deduct coins first
            const newBalance = await User.deductCoins(userId, COINS_REQUIRED);
            if (newBalance === null) {
                throw new Error('Failed to deduct coins');
            }

            // Update username
            await User.updateUsername(userId, username.trim());

            // Get updated user data
            const updatedUser = await User.findByPk(userId);
            if (!updatedUser) {
                throw new Error('User not found after update');
            }

            return updatedUser;
        });

        return res.json({
            id: result.id,
            email: result.email,
            username: result.username,
            school_domain: result.school_domain,
            coins: result.coins
        });
    } catch (error) {
        console.error('Update username error:', error);
        return res.status(500).json({ message: 'Failed to update username' });
    }
};

const verifyTokenAndRefresh = async (req, res) => {
    try {
        // Get token from cookie
        const token = req.cookies.token;
        if (!token) {
            return res.status(401).json({ message: 'No token provided' });
        }

        try {
            // Verify the token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            // Get user data
            const user = await User.findByPk(decoded.userId);
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            // Generate new token
            const newToken = jwt.sign(
                { userId: user.id },
                process.env.JWT_SECRET,
                { expiresIn: '7d' }
            );

            // Set new token as cookie
            res.cookie('token', newToken, COOKIE_OPTIONS);

            // Return user data and new token
            return res.json({
                user: {
                    id: user.id,
                    email: user.email,
                    username: user.username,
                    school_domain: user.school_domain,
                    coins: user.coins || 0
                },
                token: newToken
            });
        } catch (err) {
            // Token verification failed
            res.clearCookie('token', COOKIE_OPTIONS);
            return res.status(401).json({ message: 'Invalid token' });
        }
    } catch (error) {
        console.error('Token verification error:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    initiateLogin,
    verifyCode,
    getProfile,
    logout,
    updateUsername,
    verifyTokenAndRefresh
}; 