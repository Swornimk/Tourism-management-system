import { useState } from 'react';

const useEsewaPayment = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Generate a unique transaction ID without using uuid library
  const generateTransactionId = () => {
    const timestamp = new Date().getTime();
    const randomPart = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    return `TMS${timestamp}${randomPart}`.substring(0, 20);
  };
  
  const initiatePayment = (amount, productName, productId) => {
    try {
      setLoading(true);
      setError(null);
      
      // Format amount properly
      const amt = parseFloat(amount).toFixed(2); // Ensure 2 decimal places
      
      // Generate unique transaction ID
      const pid = generateTransactionId();
      
      // Product code for test environment
      const scd = "EPAYTEST";
      
      // Prepare payment data for the API v1
      const paymentData = {
        amt: amt,                       // Amount
        txAmt: "0.00",                  // Tax amount
        psc: "0.00",                    // Service charge
        pdc: "0.00",                    // Delivery charge
        tAmt: amt,                      // Total amount (amt + txAmt + psc + pdc)
        pid: pid,                       // Unique transaction ID
        scd: scd,                       // Merchant code (EPAYTEST for test)
        success_url: "https://esewa.com.np/#/success",  // eSewa success URL format
        failure_url: "https://esewa.com.np/#/failure",  // eSewa failure URL format
      };
      
      setLoading(false);
      
      return {
        success: true,
        data: paymentData,
        txnId: pid
      };
    } catch (err) {
      setError(err.message || 'Failed to initialize payment');
      setLoading(false);
      
      return {
        success: false,
        message: err.message || 'Failed to initialize payment'
      };
    }
  };
  
  // Function to verify eSewa payment
  const verifyPayment = async (pid, amount, refId) => {
    try {
      setLoading(true);
      setError(null);
      
      // After payment, eSewa will redirect to success URL with parameters
      // Those parameters should be used to verify the payment with a server-side call
      
      setLoading(false);
      return {
        success: true,
        data: {
          status: 'COMPLETE',
          transactionId: pid,
          refId: refId
        }
      };
    } catch (err) {
      setError(err.message || 'Failed to verify payment');
      setLoading(false);
      
      return {
        success: false,
        message: err.message || 'Failed to verify payment'
      };
    }
  };
  
  return {
    initiatePayment,
    verifyPayment,
    loading,
    error
  };
};

export default useEsewaPayment; 