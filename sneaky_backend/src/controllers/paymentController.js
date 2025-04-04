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

        console.log('Verifying payment:', { reference, coins, userId });

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
            console.log('Making Paystack API request for reference:', reference);
            
            // Add a delay before verification to allow Paystack to process
            await new Promise(resolve => setTimeout(resolve, 8000));
            
            const response = await axios.get(
                `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
                {
                    headers: {
                        'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
                        'Content-Type': 'application/json',
                        'Cache-Control': 'no-cache'
                    }
                }
            );

            console.log('Full Paystack API response:', JSON.stringify(response.data, null, 2));

            if (!response.data) {
                console.log('No data in Paystack response');
                return res.status(400).json({
                    message: 'Invalid response from Paystack',
                    details: 'No data received'
                });
            }

            // For live transactions, we need to check the gateway response
            const { data } = response.data;
            
            // Check if the transaction exists and is successful
            if (!data || !data.status) {
                console.log('Invalid transaction data:', data);
                return res.status(400).json({
                    message: 'Invalid transaction data',
                    details: data
                });
            }

            // Verify payment status
            if (data.status !== 'success' && data.gateway_response !== 'Approved') {
                console.log('Payment not successful:', data);
                return res.status(400).json({ 
                    message: 'Payment verification failed',
                    details: data
                });
            }

            // Verify payment amount matches expected amount
            const paidAmount = data.amount / 100;
            const expectedAmount = coins === 20 ? 200 : 
                                 coins === 50 ? 400 : 
                                 coins === 100 ? 700 : 0;

            if (paidAmount !== expectedAmount) {
                console.log('Amount mismatch:', { paidAmount, expectedAmount });
                return res.status(400).json({ 
                    message: `Payment amount mismatch. Expected ₦${expectedAmount}, got ₦${paidAmount}` 
                });
            }

            // Start a transaction to ensure both operations succeed or fail together
            const result = await sequelize.transaction(async (t) => {
                // Create payment transaction record
                const transaction = await PaymentTransaction.create({
                    userId: userId,
                    reference: reference,
                    amount: paidAmount,
                    coins,
                    status: 'success',
                    paystackResponse: JSON.stringify(response.data),
                    paidAt: new Date()
                }, { transaction: t });

                // Add coins to user's balance
                const currentCoins = user.coins || 0;
                const newBalance = currentCoins + coins;
                await user.update({ coins: newBalance }, { transaction: t });

                return { transaction, newBalance };
            });

            console.log('Transaction completed successfully:', result);

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
            
            // Check if it's an Axios error with a response
            if (paystackError.response) {
                return res.status(paystackError.response.status).json({
                    message: 'Failed to verify payment with Paystack',
                    error: paystackError.response.data
                });
            }

            return res.status(400).json({ 
                message: 'Failed to verify payment with Paystack',
                error: paystackError.message
            });
        }
    } catch (error) {
        console.error('Payment verification error:', error);
        return res.status(500).json({ 
            message: 'Failed to verify payment',
            error: error.message
        });
    }
};

module.exports = {
    verifyPayment
};