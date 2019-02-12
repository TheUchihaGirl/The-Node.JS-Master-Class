/*
* Primary file for the API
*/

// Dependency
var server = require('./lib/server');

// Empty container
app = {};

app.init = function(){

	// Starting the Server
	server.init();
};

// Starting the API
app.init();

// Exporting the module
module.exports = app;
