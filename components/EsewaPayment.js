import React from 'react';
import { Alert } from 'react-native';

const useEsewaPayment = () => {
  const initiatePayment = async (amount, productName, productId, callback = () => {}) => {
    try {
      // Generate a unique transaction ID 
      const txnId = `TMS${Date.now()}`;
      
      // Format the payment data
      const paymentData = {
        amt: amount,
        psc: 0,
        pdc: 0,
        txAmt: 0,
        tAmt: amount,
        pid: txnId,
        scd: "EPAYTEST",
        su: "tourismapp://payment/success",
        fu: "tourismapp://payment/failure"
      };
      
      // Return the payment data for WebView processing
      return {
        success: true,
        data: paymentData,
        txnId: txnId
      };
    } catch (error) {
      console.error('Payment initialization error:', error);
      Alert.alert('Error', 'Failed to initialize payment');
      return {
        success: false,
        message: error.message || 'Payment initialization failed'
      };
    }
  };

  return { initiatePayment };
};

export default useEsewaPayment; 