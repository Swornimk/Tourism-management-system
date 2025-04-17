const { ObjectId } = require('mongodb');

class Booking {
  constructor(
    userId,
    tripId,
    numberOfPeople,
    totalAmount,
    paymentMethod = 'eSewa'
  ) {
    this._id = new ObjectId();
    this.userId = userId;
    this.tripId = tripId;
    this.bookingDate = new Date();
    this.numberOfPeople = numberOfPeople;
    this.totalAmount = totalAmount;
    this.paymentStatus = 'pending'; // pending, completed, failed, refunded
    this.paymentId = null;
    this.paymentMethod = paymentMethod;
    this.transactionDetails = {};
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  // Helper method to update payment status and details
  updatePayment(status, paymentId, transactionDetails = {}) {
    this.paymentStatus = status;
    this.paymentId = paymentId;
    this.transactionDetails = { ...this.transactionDetails, ...transactionDetails };
    this.updatedAt = new Date();
    return this;
  }

  // Helper method to cancel booking
  cancel() {
    if (this.paymentStatus === 'pending') {
      this.paymentStatus = 'cancelled';
      this.updatedAt = new Date();
    }
    return this;
  }
}

module.exports = {
  Booking
}; 