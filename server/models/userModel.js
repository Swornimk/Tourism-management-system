const { ObjectId } = require('mongodb');


class User {
  constructor(userName, email, date, password) {
    this._id = new ObjectId();
    this.userName = userName;
    this.email = email;
    this.date = date;
    this.password = password;
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