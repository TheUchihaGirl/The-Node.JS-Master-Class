/*
 * Router-related file
 *
 */

// Dependencies
const handlers = require('./handlers');

// Defining a request router
var router = {
  //'sample' : handlers.sample,
  'notFound' : handlers.notFound,
  'ping' : handlers.ping,
  'users' : handlers.users,
  'tokens' : handlers.tokens,
  'checks' : handlers.checks
};

// Export the module
module.exports = router;
