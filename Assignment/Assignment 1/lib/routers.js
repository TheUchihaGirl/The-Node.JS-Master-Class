/*
* File for handling the routers
*
*/

var handlers = require('./handlers');

// Routers-container
routers = {
	'hello' : handlers.hello
};

// Export the module
module.exports = routers;
