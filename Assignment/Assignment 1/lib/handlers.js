/*
* File containing all the handlers for the API
*
*/

// Define the handlers
var handlers = {};

// Hello handler
handlers.hello = function(callback){
	// Callback a http status code, and a payload object
	callback(200, {'Message' : 'Hello World!'});
};

// Not found handler
handlers.notFound = function(callback){
	callback(404);
};

// Export the module
module.exports = handlers;
