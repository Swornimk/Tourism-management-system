// Handle the payment function to account for new eSewa implementation
const handlePayment = async () => {
    try {
      // Start loading
      setProcessing(true);
      
      if (!selectedPaymentMethod) {
        Alert.alert('Error', 'Please select a payment method');
        setProcessing(false);
        return;
      }
      
      // Calculate total amount
      const totalAmount = calculateTotal();
      
      // Create booking first to get booking ID
      console.log('💾 Creating booking before payment...');
      const bookingResponse = await bookingService.createBooking({
        userId: user?._id,
        packageId: tourPackage?._id,
        tourDate: selectedDate,
        numberOfTravelers: travelers,
        totalAmount: totalAmount,
        status: 'PENDING',
        paymentMethod: selectedPaymentMethod,
        specialRequests: specialRequests || 'None'
      });
      
      console.log('✅ Booking created:', bookingResponse);
      const bookingId = bookingResponse.bookingId;
      
      // Store booking ID for recovery in case of payment failure
      await paymentService.setPendingBookingId(bookingId);
      
      if (selectedPaymentMethod === 'eSewa') {
        // Initialize eSewa payment
        const paymentResult = esewaPayment.initiatePayment(
          totalAmount.toString(),
          `${tourPackage?.title} Tour Package`, 
          bookingId
        );
        
        if (paymentResult.success) {
          console.log('✅ eSewa payment initialized:', paymentResult);
          // Process the eSewa payment via WebView
          await paymentService.processEsewaPayment({
            paymentData: paymentResult.data,
            bookingId: bookingId
          });
        } else {
          throw new Error(paymentResult.message || 'Failed to initialize eSewa payment');
        }
      } else if (selectedPaymentMethod === 'cashOnArrival') {
        // Handle cash on arrival
        navigation.navigate('BookingConfirmation', { 
          bookingId, 
          totalAmount,
          paymentMethod: 'Cash on Arrival'
        });
      }
      
      setProcessing(false);
    } catch (error) {
      console.error('Payment processing error:', error);
      setProcessing(false);
      Alert.alert(
        'Payment Error',
        error.message || 'There was an error processing your payment. Please try again.'
      );
    }
  }; 