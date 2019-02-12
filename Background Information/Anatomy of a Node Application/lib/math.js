/*
* Title: Math Libraru
* Description: Utility library for math-related functions
* Author: Kanish Gosain
* Date: 01/25/2019
*/

// App object
var math = {};

// Get a random integer between two integers
math.getRandomNumber = function(min, max) {
  min = typeof(min) == 'number' && min % 1 == 0 ? min : 0;
  max = typeof(max) == 'number' && max % 1 == 0 ? max : 0;
  return Math.floor(Math.random()*(max-min+1)+min);
};

// Export the library
module.exports = math;
