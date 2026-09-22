const axios = require('axios');
const nodemailer = require('nodemailer');

// Optional Nodemailer fallback transporter for local development
let transporter = null;
if (process.env.EMAIL_USER && process.env.EMAIL_APP_PASSWORD) {
    transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_APP_PASSWORD
        }
    });
}

const sendVerificationEmail = async (email, code) => {
    const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #4F46E5;">Welcome to SneakySpeak! 🎉</h2>
            <p>Your verification code is:</p>
            <div style="background-color: #F3F4F6; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
                <h1 style="color: #4F46E5; margin: 0; font-size: 32px;">${code}</h1>
            </div>
            <p>This code will expire in 10 minutes.</p>
            <p>If you didn't request this code, please ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 20px 0;">
            <p style="color: #6B7280; font-size: 14px;">SneakySpeak - School Chat Made Fun</p>
        </div>
    `;

    try {
        // Preferred method: Resend HTTP API (works seamlessly on Render free tier)
        if (process.env.RESEND_API_KEY) {
            const fromEmail = process.env.RESEND_FROM_EMAIL || 'SneakySpeak <onboarding@resend.dev>';
            const response = await axios.post(
                'https://api.resend.com/emails',
                {
                    from: fromEmail,
                    to: [email],
                    subject: 'SneakySpeak Verification Code',
                    html: htmlContent
                },
                {
                    headers: {
                        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            console.log('Verification email sent successfully via Resend to:', email, response.data);
            return response.data;
        }

        // Fallback method: Nodemailer (SMTP)
        if (transporter) {
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: email,
                subject: 'SneakySpeak Verification Code',
                html: htmlContent
            };
            await transporter.sendMail(mailOptions);
            console.log('Verification email sent successfully via Nodemailer to:', email);
            return;
        }

        throw new Error('No email service configured. Please set RESEND_API_KEY or EMAIL_USER & EMAIL_APP_PASSWORD.');
    } catch (error) {
        console.error('Error sending verification email:', error.response?.data || error.message || error);
        throw error;
    }
};

module.exports = {
    sendVerificationEmail
};