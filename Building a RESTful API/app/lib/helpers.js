/*
 * Helpers for various tasks
 *
 */

// Dependencies
const crypto = require('crypto');
const config = require('./config');

// Empty container for all the helpers
var helpers = {};

// Create a SHA256 hash
helpers.hash = function(str){
  if(typeof(str) == 'string' && str.length > 0) {
    var hash = crypto.createHmac('sha256', config.hashingSecret).update(str).digest('hex');
    return hash;
  } else {
    return false;
  }
}

// Parse a JSON string to an object in all cases, without throwing
helpers.parseJsonToObject = function(str) {
    try {
      var obj = JSON.parse(str);
      return obj;
    } catch(e) {
      return {};
    }
};

// Create a string of random alphanumeric characters of a gien length
helpers.createRandomString = function(strLength) {
  var strLength = typeof(strLength) == 'number' && strLength > 0 ? strLength : false;
  if (strLength) {
    // Define all the possible characters that could go into a string
    var possibleCharacters = 'abcdefghijklmnopqrstuvwxyz0123456789';

    // Start the final string
    var str = '';

    for (var i = 1; i <= strLength ; i++) {
      // Get a random character from the possibleCharacters string
      randomCharacter = possibleCharacters.charAt(Math.floor(Math.random()*possibleCharacters.length));
      // Append this character to the final string
      str += randomCharacter;
    }

    return str;
  } else {
    return false;
  }
};

// Export the module
module.exports = helpers;
