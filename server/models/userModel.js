const { ObjectId } = require('mongodb');


class User {
  constructor(userName, email, date, password, bio, profilePicture, isAdmin = false) {
    this._id = new ObjectId();
    this.userName = userName;
    this.email = email;
    this.date = date;
    this.password = password;
    this.bio = bio;
    this.profilePicture = profilePicture;
    this.isAdmin = isAdmin;
    this.isActive = true;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }
}

class UserLogin {
  constructor(email, password) {
    this.email = email;
    this.password = password;
  }
}

module.exports = {
  User,
  UserLogin,
};