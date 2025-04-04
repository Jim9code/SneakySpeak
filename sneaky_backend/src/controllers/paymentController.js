const User = require('../models/User');
const PaymentTransaction = require('../models/PaymentTransaction');
const sequelize = require('../config/database');
const axios = require('axios');

// Verify PAYSTACK_SECRET_KEY is available
if (!process.env.PAYSTACK_SECRET_KEY) {
    throw new Error('PAYSTACK_SECRET_KEY is not set in environment variables');
}

const verifyPayment = async (req, res) => {
    try {
        const { reference } = req.params;
        const { coins } = req.body;
        const userId = req.user.id;

        if (!reference || !coins) {
            return res.status(400).json({ message: 'Reference and coins amount are required' });
        }

        // Check if payment reference has already been used
        const existingTransaction = await PaymentTransaction.findOne({
            where: { reference }
        });

        if (existingTransaction) {
            return res.status(400).json({ 
                message: 'This payment reference has already been used' 
            });
        }

        // Get user
        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Verify payment with Paystack API
        try {
            const response = await axios.get(
                `https://api.paystack.co/transaction/verify/${reference}`,
                {
                    headers: {
                        'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
                    }
                }
            );

            const { data } = response.data;

            // Verify payment status
            if (!data.status || data.status !== 'success') {
                return res.status(400).json({ 
                    message: 'Payment verification failed. Status: ' + data.status 
                });
            }

            // Verify payment amount matches expected amount
            // Convert amount from kobo to naira (Paystack uses kobo)
            const paidAmount = data.amount / 100;
            const expectedAmount = coins === 20 ? 200 : 
                                 coins === 50 ? 400 : 
                                 coins === 100 ? 700 : 0;

            if (paidAmount !== expectedAmount) {
                return res.status(400).json({ 
                    message: `Payment amount mismatch. Expected ₦${expectedAmount}, got ₦${paidAmount}` 
                });
            }

            // Start a transaction to ensure both operations succeed or fail together
            const result = await sequelize.transaction(async (t) => {
                // Create payment transaction record
                const transaction = await PaymentTransaction.create({
                    userId: userId,
                    reference: data.reference,
                    amount: paidAmount,
                    coins,
                    status: data.status,
                    paystackResponse: data,
                    paidAt: new Date(data.paid_at)
                }, { transaction: t });

                // Add coins to user's balance
                const currentCoins = user.coins || 0;
                const newBalance = currentCoins + coins;
                await user.update({ coins: newBalance }, { transaction: t });

                return { transaction, newBalance };
            });

            return res.json({
                success: true,
                message: `Successfully added ${coins} coins to your balance`,
                coins: result.newBalance,
                transaction: {
                    reference: result.transaction.reference,
                    amount: result.transaction.amount,
                    status: result.transaction.status,
                    paid_at: result.transaction.paidAt
                }
            });

        } catch (paystackError) {
            console.error('Paystack verification error:', paystackError.response?.data || paystackError);
            return res.status(400).json({ 
                message: 'Failed to verify payment with Paystack',
                error: paystackError.response?.data?.message || paystackError.message
            });
        }
    } catch (error) {
        console.error('Payment verification error:', error);
        return res.status(500).json({ message: 'Failed to verify payment' });
    }
};

module.exports = {
    verifyPayment
};