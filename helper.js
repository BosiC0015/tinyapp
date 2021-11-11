const getUserByEmail = function(email, users) {
  for (id in users) {
    if (email === users[id].email) {
      return users[id];
    }
  }
  return null;
}

module.exports = { getUserByEmail };