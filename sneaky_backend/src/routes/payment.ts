const express = require('express');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const axios = require('axios');
const { verifyToken } = require('../middleware/auth');
import * as cryptoNode from 'crypto';

const router = express.Router();

// Verify Paystack payment
router.post('/verify/:reference', verifyToken, async (req, res) => {
  console.log('PAYMENT VERIFICATION STARTED');
  console.log('Request body:', req.body);
  console.log('Request params:', req.params);
  console.log('User:', req.user);

  try {
    const { reference } = req.params;
    const { coins } = req.body;
    const userId = req.user.id; // From verifyToken middleware
    
    console.log('STEP 1: Initial data:', { reference, coins, userId });

    // Check if transaction already exists and is completed
    const existingTransaction = await Transaction.findByReference(reference);
    console.log('STEP 2: Existing transaction:', existingTransaction);

    if (existingTransaction) {
      if (existingTransaction.status === 'completed') {
        console.log('STEP 2.1: Transaction already completed');
        return res.status(400).json({ 
          success: false, 
          message: 'Transaction already processed' 
        });
      } else if (existingTransaction.status === 'failed') {
        console.log('STEP 2.2: Transaction previously failed');
        return res.status(400).json({ 
          success: false, 
          message: 'Transaction previously failed' 
        });
      }
    }

    // Verify payment with Paystack
    console.log('STEP 3: Verifying with Paystack');
    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
        }
      }
    );

    console.log('STEP 4: Raw Paystack response:', response.data);

    const { data } = response.data;

    // Check if payment was successful
    if (data.status === 'success') {
      console.log('STEP 5: Payment successful');
      const { metadata, amount } = data;
      
      // Verify that the payment was for this user
      console.log('STEP 6: Verifying user match:', { 
        expected: userId, 
        received: metadata.user_id,
        metadata 
      });

      if (metadata.user_id !== userId.toString()) {
        console.error('User ID mismatch');
        if (existingTransaction) {
          await Transaction.markAsFailed(reference);
        }
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid payment verification' 
        });
      }

      try {
        // Create or update transaction record
        if (!existingTransaction) {
          console.log('STEP 7: Creating transaction record');
          const transactionData = {
            userId,
            reference,
            amount: amount / 100,
            coins: Number(metadata.coins || coins)
          };
          console.log('Transaction data:', transactionData);
          
          const transaction = await Transaction.createTransaction(transactionData);
          console.log('Created transaction:', transaction);
        }

        // Add coins to user's balance
        const coinsToAdd = Number(metadata.coins || coins);
        console.log('STEP 8: Adding coins:', { userId, coinsToAdd });
        
        // Get current balance first
        const currentBalance = await User.getCoins(userId);
        console.log('Current balance:', currentBalance);

        // Add coins
        const newBalance = await User.addCoins(userId, coinsToAdd);
        console.log('New balance after addition:', newBalance);

        // Verify the update worked
        const verifiedBalance = await User.getCoins(userId);
        console.log('Verified final balance:', verifiedBalance);

        // Mark transaction as completed
        console.log('STEP 9: Marking transaction as completed');
        await Transaction.markAsCompleted(reference);

        console.log('STEP 10: Operation complete');

        // Return updated coin balance
        return res.json({ 
          success: true, 
          coins: verifiedBalance,
          message: `Successfully added ${coinsToAdd} coins to your balance!`
        });
      } catch (dbError) {
        console.error('Database operation failed:', dbError);
        console.error('Error stack:', dbError.stack);
        
        if (existingTransaction) {
          await Transaction.markAsFailed(reference);
        }

        return res.status(500).json({ 
          success: false, 
          message: 'Failed to update coin balance',
          error: dbError.message
        });
      }
    }

    if (existingTransaction) {
      await Transaction.markAsFailed(reference);
    }

    console.log('Payment verification failed:', data);
    return res.status(400).json({ 
      success: false, 
      message: 'Payment verification failed' 
    });

  } catch (error) {
    console.error('PAYMENT ERROR:', error);
    console.error('Error stack:', error.stack);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }

    return res.status(500).json({ 
      success: false, 
      message: 'Error verifying payment',
      error: error.message
    });
  }
});

// Paystack webhook (for backup verification)
router.post('/webhook', async (req, res) => {
  try {
    // Verify webhook signature
    const hash = cryptoNode.createHmac('sha512', process.env.PAYSTACK_SECRET_KEY!)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (hash !== req.headers['x-paystack-signature']) {
      return res.status(400).json({ message: 'Invalid signature' });
    }

    const event = req.body;

    // Handle successful charge
    if (event.event === 'charge.success') {
      const { reference, metadata, amount } = event.data;
      const { user_id, coins } = metadata;

      try {
        // Check if transaction already processed
        const existingTransaction = await Transaction.findByReference(reference);
        if (existingTransaction && existingTransaction.status === 'completed') {
          return res.sendStatus(200); // Already processed
        }

        // Create transaction record if it doesn't exist
        if (!existingTransaction) {
          await Transaction.createTransaction({
            userId: user_id,
            reference,
            amount: amount / 100, // Convert from kobo to naira
            coins: Number(coins)
          });
        }

        // Add coins to user's balance
        const newBalance = await User.addCoins(user_id, Number(coins));
        
        // Mark transaction as completed
        await Transaction.markAsCompleted(reference);

        console.log('Updated coins via webhook:', { user_id, coins, newBalance });
      } catch (dbError) {
        console.error('Failed to update coins via webhook:', dbError);
        
        // Mark transaction as failed
        try {
          await Transaction.markAsFailed(reference);
        } catch (markError) {
          console.error('Failed to mark transaction as failed:', markError);
        }
      }
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('Webhook error:', error);
    res.sendStatus(500);
  }
});

module.exports = router; 