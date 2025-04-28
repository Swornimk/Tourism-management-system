const express = require('express');
const router = express.Router();
const { 
    initiateEsewaPayment,
    handleEsewaSuccess,
    handleEsewaFailure,
    verifyEsewaPayment,
    updateBookingAfterPayment
} = require('../controller/paymentController');

// eSewa payment routes
router.post('/esewa/initiate', initiateEsewaPayment);
router.post('/esewa/success', handleEsewaSuccess);
router.post('/esewa/failure', handleEsewaFailure);
router.post('/esewa/verify', verifyEsewaPayment);
router.post('/esewa/update-booking', updateBookingAfterPayment);

module.exports = router; 