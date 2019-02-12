/*
* File for handling the Server
*
*/

var http = require('http');
var url = require('url');
var path = require('path');
var config = require('./config');
var fs = require('fs');
var handlers = require('./handlers');
var routers = require('./routers');
var StringDecoder = require('string_decoder').StringDecoder;

// Empty-container
server = {};

// Instantiate the HTTP server
server.httpServer = http.createServer(function(req, res){
	server.unifiedServer(req, res);
});

// All the server logic for both the http and https createServer
server.unifiedServer = function(req, res){

  // Get the URL and parse it
	var parsedUrl = url.parse(req.url, true);

	// Get the path from URL
	var path = parsedUrl.pathname;
	var trimmedPath = path.replace(/^\/+|\/+$/g,'')

  // Get the payload, if any
	var decoder = new StringDecoder('utf-8');
	var buffer = '';
	req.on('data', function(data){
		buffer += decoder.write(data);
	});
	req.on('end', function(){
		buffer += decoder.end();

		// Choose the handler the request should go to . If the one is not found then use the Not found handler
		var chosenHandler = typeof(routers[trimmedPath]) !== 'undefined' ? routers[trimmedPath] : handlers.notFound;

		// Route the request to the handler specified in the router
		chosenHandler(function(statusCode, payload){
			// Use the status code called back by the handler, or default to 200
			statusCode = typeof(statusCode) == 'number' ? statusCode : 200;

			// Use the payload called back by the handler, or default to an empty project
			payload = typeof(payload) == 'object' ? payload : {};

			// Conver the payload to a string
			var payloadString = JSON.stringify(payload);

			// Return the response
			res.setHeader('Content-Type', 'application/JSON');
			res.writeHead(statusCode);
			res.end(payloadString);

			// Log the Response
			console.log('Returning this response: ', statusCode, payloadString);
		});
	});
};

server.init = function(){

  // Start the HTTP server
  server.httpServer.listen(config.httpPort, function(){
  	console.log("The HTTP server is listening on port " + config.httpPort + " now");
  });

}

// Export the module
module.exports = server;
