/*
 * Primary file for the API
 *
 */

// Dependencies
const http = require('http');
const https = require('https');
const url = require('url');
const StringDecoder = require('string_decoder').StringDecoder;
const config = require('./lib/config');
const fs = require('fs');
const handlers = require('./lib/handlers');
const helpers = require('./lib/helpers');

// Instantiate the HTTP server
var httpServer = http.createServer(function(req,res){
  unifiedServer(req, res);
});

// Start the HTTP server, and have it listen on port 3000
httpServer.listen(config.httpPort,function(){
  console.log('The HTTP server is listening on port '+config.httpPort+' in '+config.envName+' mode');
});

// Instantiate the HTTP server
var httpsServerOptions = {
   'key' : fs.readFileSync('./https/key.pem'),
   'cert' : fs.readFileSync('./https/cert.pem')
};

var httpsServer = https.createServer(httpsServerOptions, function(req,res){
  unifiedServer(req, res);
});

// Start the HTTPs server, and have it listen on port 3000
httpsServer.listen(config.httpsPort,function(){
  console.log('The HTTPS server is listening on port '+config.httpsPort+' in '+config.envName+' mode');
});


// All the server logic for both the http and https server
var unifiedServer = function(req, res) {

    // Get the URL and parse it
    var parsedUrl = url.parse(req.url,true);

    // Get the path
    var path = parsedUrl.pathname;
    var trimmedPath = path.replace(/^\/+|\/+$/g ,'');

    // Get the query string as an object
    var queryStringObject = parsedUrl.query;

    // Get the HTTP Method
    var method = req.method.toLowerCase();

    // Get the headers as an object
    var headers = req.headers;

    // Get the payload, if any
    var decoder = new StringDecoder('utf-8');
    var buffer = '';

    req.on('data', function(data){
      buffer += decoder.write(data);
    });

    // end event will be called no matter what there is a payload or not
    req.on('end', function(){
      buffer += decoder.end();

      // Choose the handler this request should go to. If noe is not found then choose the not found handler
      var chosenHandler = typeof(router[trimmedPath]) !== 'undefined' ? router[trimmedPath] : handlers.notFound;

      // Construct the data onject to send to the handler
      var data = {
        'trimmedPath' : trimmedPath,
        'queryStringObject' : queryStringObject,
        'method' : method,
        'headers' : headers,
        'payload' : helpers.parseJsonToObject(buffer)
      };

      // Route the request to the handler specified in the router
      chosenHandler(data, function(statusCode, payload){
        // Use the status code called back by the handler, ot default to 200
        statusCode = typeof(statusCode) == 'number' ? statusCode : 200;

        // Use the payload called back by the handler, or default to empty object
        payload = typeof(payload) == 'object' ? payload : {};

        // Convert the payload to a string
        var payloadString = JSON.stringify(payload);

        // Return the response
        res.setHeader('Content-Type','application/json')
        res.writeHead(statusCode);
        res.end(payloadString);

        // og the request path
        console.log('Returning this response:', statusCode, payloadString);
      });

      // Log the request path
      // console.log('Request received on path: '+trimmedPath+' with method: '+method+' and with these query string parameters: ', queryStringObject);
      // console.log('Request received with these headers: \n', headers);
      // console.log('Request received with this payload:', buffer);
    });
};



// Define a request router
var router = {
  //'sample' : handlers.sample
  'ping' : handlers.ping,
  'users' : handlers.users,
  'tokens' : handlers.tokens,
  'checks' : handlers.checks
};
