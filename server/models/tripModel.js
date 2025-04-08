const { ObjectId } = require('mongodb');

class Trip {
  constructor(
    title,
    location,
    description,
    price,
    startDate,
    endDate,
    userId,
    userName,
    userProfilePicture,
    tripImageUrl,
    tripImagePath
  ) {
    this._id = new ObjectId();
    this.title = title;
    this.location = location;
    this.description = description;
    this.price = parseFloat(price);
    this.startDate = new Date(startDate);
    this.endDate = new Date(endDate);
    this.userId = userId;
    this.userName = userName;
    this.userProfilePicture = userProfilePicture || null;
    this.tripImageUrl = tripImageUrl || null;
    this.tripImagePath = tripImagePath || null;
    this.status = 'pending'; // pending, approved, rejected
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }
}

module.exports = {
  Trip
}; 