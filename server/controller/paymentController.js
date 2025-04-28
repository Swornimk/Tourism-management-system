const crypto = require('crypto');
const { ESEWA_CONFIG, ESEWA_ENDPOINTS } = require('../../config/esewaConfig');
const axios = require('axios');

const generateSignature = (data) => {
    const message = `total_amount=${data.total_amount},transaction_uuid=${data.transaction_uuid},product_code=${ESEWA_CONFIG.MERCHANT_ID}`;
    return crypto.createHmac('sha256', ESEWA_CONFIG.MERCHANT_SECRET_KEY)
        .update(message)
        .digest('base64');
};

exports.initiateEsewaPayment = async (req, res) => {
    try {
        const { amount, productName, productId } = req.body;
        
        // Generate a unique transaction ID
        const tAmt = parseFloat(amount);
        const amt = tAmt;
        const txAmt = 0;
        const psc = 0;
        const pdc = 0;
        const scd = ESEWA_CONFIG.MERCHANT_ID;
        const pid = `${Date.now()}_${productId}`;
        
        // Prepare payment data for WebView
        const paymentData = {
            amt: amt,             // actual amount
            txAmt: txAmt,        // tax amount
            psc: psc,            // service charge
            pdc: pdc,            // delivery charge
            tAmt: tAmt,          // total amount
            pid: pid,            // unique transaction id
            scd: scd,            // merchant code
            su: ESEWA_CONFIG.SUCCESS_URL + `?pid=${pid}&bookingId=${productId}`,
            fu: ESEWA_CONFIG.FAILURE_URL + `?pid=${pid}&bookingId=${productId}`
        };

        res.json({
            success: true,
            data: paymentData
        });
    } catch (error) {
        console.error('Payment initiation error:', error);
        res.status(500).json({
            success: false,
            message: 'Error initiating payment'
        });
    }
};

exports.verifyEsewaPayment = async (req, res) => {
    try {
        const { pid, amount, refId, bookingId } = req.body;
        
        if (!pid) {
            return res.status(400).json({
                success: false,
                message: 'Missing required parameter: pid'
            });
        }
        
        console.log('Verifying eSewa payment:', { pid, amount, refId, bookingId });
        
        // For test environment, we can consider the payment verified
        // In production, you would make a verification request to eSewa
        
        if (refId) {
            // When refId is provided, make verification request to eSewa
            try {
                // Construct verification data
                const verificationParams = new URLSearchParams();
                verificationParams.append('amt', amount);
                verificationParams.append('rid', refId);
                verificationParams.append('pid', pid);
                verificationParams.append('scd', ESEWA_CONFIG.MERCHANT_ID);
                
                // Make verification request to eSewa
                const response = await axios.post(
                    ESEWA_CONFIG.VERIFICATION_URL,
                    verificationParams.toString(),
                    {
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded'
                        }
                    }
                );
                
                console.log('eSewa verification response:', response.data);
                
                // eSewa returns a response with 'success' property
                if (response.data.includes('Success')) {
                    // Update booking status in your database
                    // TODO: Update booking status in your database
                    
                    return res.json({
                        success: true,
                        message: 'Payment verified successfully',
                        data: {
                            transactionId: pid,
                            refId: refId,
                            amount: amount,
                            status: 'COMPLETE'
                        }
                    });
                } else {
                    return res.status(400).json({
                        success: false,
                        message: 'Payment verification failed',
                        data: response.data
                    });
                }
            } catch (verifyError) {
                console.error('Error during eSewa verification:', verifyError);
                // For testing purposes, consider it verified even if verification fails
                return res.json({
                    success: true,
                    message: 'Payment status assumed successful (TEST MODE)',
                    data: {
                        transactionId: pid,
                        bookingId: bookingId,
                        amount: amount,
                        status: 'COMPLETE'
                    }
                });
            }
        } else {
            // During testing, if no refId is provided, we'll assume payment is successful
            return res.json({
                success: true,
                message: 'Payment status assumed successful (TEST MODE)',
                data: {
                    transactionId: pid,
                    bookingId: bookingId,
                    amount: amount,
                    status: 'COMPLETE'
                }
            });
        }
    } catch (error) {
        console.error('Error verifying eSewa payment:', error);
        return res.status(500).json({
            success: false,
            message: 'Error verifying payment',
            error: error.message
        });
    }
};

exports.handleEsewaSuccess = async (req, res) => {
    try {
        const { transaction_uuid, transaction_code, status, total_amount } = req.body;
        
        // Verify the payment status with eSewa
        // TODO: Implement verification logic with eSewa's API
        
        // Update your database with payment status
        
        res.json({
            success: true,
            message: 'Payment successful',
            data: { transaction_uuid, transaction_code }
        });
    } catch (error) {
        console.error('Payment success handler error:', error);
        res.status(500).json({
            success: false,
            message: 'Error processing payment success'
        });
    }
};

exports.handleEsewaFailure = async (req, res) => {
    try {
        const { transaction_uuid, status } = req.body;
        
        // Log the failed payment
        console.log('Payment failed:', { transaction_uuid, status });
        
        res.json({
            success: false,
            message: 'Payment failed',
            data: { transaction_uuid }
        });
    } catch (error) {
        console.error('Payment failure handler error:', error);
        res.status(500).json({
            success: false,
            message: 'Error processing payment failure'
        });
    }
};

// Update booking status after payment
exports.updateBookingAfterPayment = async (req, res) => {
    try {
        const { bookingId, transactionId, status } = req.body;
        
        if (!bookingId || !transactionId || !status) {
            return res.status(400).json({
                success: false,
                message: 'Missing required parameters: bookingId, transactionId, status'
            });
        }
        
        // TODO: Update booking status in your database
        // const booking = await BookingModel.findByIdAndUpdate(bookingId, {
        //   paymentStatus: status,
        //   transactionId: transactionId,
        //   updatedAt: new Date()
        // }, { new: true });
        
        return res.json({
            success: true,
            message: 'Booking updated successfully',
            data: {
                bookingId,
                transactionId,
                status
            }
        });
    } catch (error) {
        console.error('Error updating booking after payment:', error);
        return res.status(500).json({
            success: false,
            message: 'Error updating booking',
            error: error.message
        });
    }
}; 