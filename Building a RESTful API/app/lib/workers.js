/*
 * Worker-related tasks
 *
 */

// Dependencies
const path = require('path');
const fs = require('fs');
const _data = require('./data');
const https = require('https');
const http = require('http');
const helpers = require('./helpers');
const url = require('url');
const _logs = require('./logs');
const util = require('util');
var debug = util.debuglog('workers');

// Instantiate the worker object
var workers = {};

// Lookup all checks, get their data, send to a validator
workers.gatherAllChecks = function(){
  // Get all the checks
  _data.list('checks', function(err, checks){
    if(!err && checks && checks.length > 0) {
      checks.forEach(function(check){
        // Read in the check data
        _data.read('checks', check, function(err, originalCheckData){
          if(!err && originalCheckData) {
            // Pass it tot he check validator, let that function continue or log the error
            workers.validateCheckData(originalCheckData);
          } else {
            debug("Error reading one of the checks data");
          }
        });
      });
    } else {
      debug("Error: Could not find any checks to process");
    }
  });
};

// Sanity checking the check data
workers.validateCheckData = function(originalCheckData){
  originalCheckData = typeof(originalCheckData) == 'object' && originalCheckData !== null ? originalCheckData : false;
  originalCheckData.id = typeof(originalCheckData.id) == 'string' && originalCheckData.id.trim().length == 20 ? originalCheckData.id : false;
  originalCheckData.userPhone = typeof(originalCheckData.userPhone) == 'string' && originalCheckData.userPhone.trim().length == 10 ? originalCheckData.userPhone : false;
  originalCheckData.protocol = typeof(originalCheckData.protocol) == 'string' && ['https', 'http'].indexOf(originalCheckData.protocol) > -1 ? originalCheckData.protocol : false;
  originalCheckData.url = typeof(originalCheckData.url) == 'string' && originalCheckData.url.trim().length > 0 ? originalCheckData.url : false;
  originalCheckData.method = typeof(originalCheckData.method) == 'string' && ['get', 'post', 'put', 'delete'].indexOf(originalCheckData.method) > -1 ? originalCheckData.method : false;
  originalCheckData.successCodes = typeof(originalCheckData.successCodes) == 'object' && originalCheckData.successCodes instanceof Array && originalCheckData.successCodes.length > 0 ? originalCheckData.successCodes : false;
  originalCheckData.timeoutSeconds = typeof(originalCheckData.timeoutSeconds) == 'number' && originalCheckData.timeoutSeconds % 1 === 0 && originalCheckData.timeoutSeconds >= 1 && originalCheckData.timeoutSeconds <= 5 ? originalCheckData.timeoutSeconds : false;

  // Set the keys that may not be set (if the workers have not seen this check before)
  originalCheckData.state = typeof(originalCheckData.state) == 'string' && ['up', 'down'].indexOf(originalCheckData.state) > -1 ? originalCheckData.state : 'down';
  originalCheckData.lastChecked = typeof(originalCheckData.lastChecked) == 'number' && originalCheckData.lastChecked > 0 ? originalCheckData.lastChecked : false;

  // If all the checks pass, pass the data along to the next step in the process
  if(
    originalCheckData.id &&
    originalCheckData.userPhone &&
    originalCheckData.protocol &&
    originalCheckData.url &&
    originalCheckData.method &&
    originalCheckData.successCodes &&
    originalCheckData.timeoutSeconds
  ) {
    workers.performCheck(originalCheckData);
  } else {
    debug('Error: One of the checks is not properly formatted. Skipping it.');
  }
};

// Perform the check, send the original check data and the outcome of the check process to the next step in the process
workers.performCheck = function(originalCheckData){
  // Prepare the initial check outcome
  var checkOutcome = {
    'error' : false,
    'responseCode' : false
  }

  // Mark that the outcome has not been sent yet
  var outcomeSent = false;

  // Parse the hostname and the path out of the original check data
  var parsedUrl = url.parse(originalCheckData.protocol+'://'+originalCheckData.url, true);

  var hostname = parsedUrl.hostname;
  var path = parsedUrl.path; // Using path and not "pathname" as we want the query string

  // Construct the request
  var requestDetails = {
    'protocol' : originalCheckData.protocol+':',
    'hostname' : hostname,
    'method' : originalCheckData.method.toUpperCase(),
    'path' : path,
    'timeout' : originalCheckData.timeoutSeconds * 1000
  };

  // Instantiate the requst object using HTTP or HTTPs module
  var _moduleToUse = originalCheckData.protocol == 'http' ? http : https;
  var req = _moduleToUse.request(requestDetails, function(res){
    // Grab the status of the sent request
    var status = res.statusCode;

    // Update the checkOutcome and pass the data along
    checkOutcome.responseCode = status;
    if(!outcomeSent){
      workers.processCheckOutcome(originalCheckData, checkOutcome);
      outcomeSent = true;
    }
  });

  // Bind to the error event so it doesn't get thrown
  req.on('error', function(e){
    // Update the checkOutcome and pass the data along
    checkOutcome.error = {
      'error' : true,
      'value' : e
    };
    if(!outcomeSent){
      workers.processCheckOutcome(originalCheckData, checkOutcome);
      outcomeSent = true;
    }
  });

  // Bind to the timeout event
  req.on('timeout', function(e){
    // Update the checkOutcome and pass the data along
    checkOutcome.error = {
      'error' : true,
      'value' : 'timeout'
    };
    if(!outcomeSent){
      workers.processCheckOutcome(originalCheckData, checkOutcome);
      outcomeSent = true;
    }
  });

  // End the request
  req.end();
};

// Proces the checkOutcome and update the check data as needed and trigger an alert to the user if needed
// Special logic for accomodating a check that has never been tested before (don't want to alert on that one)

workers.processCheckOutcome = function(originalCheckData, checkOutcome) {
  // Decide if the check is considered up or down
  var state = !checkOutcome.error && checkOutcome.responseCode && originalCheckData.successCodes.indexOf(checkOutcome.responseCode) > -1 ? 'up' : 'down';

  // Decide if an alert is warranted
  var alertWarranted = originalCheckData.lastChecked && originalCheckData.state !== state ? true : false;

  // Log the outcome
  var timeOfCheck = Date.now();
  workers.log(originalCheckData, checkOutcome, state, alertWarranted, timeOfCheck);

  // Update the check data
  var newCheckData = originalCheckData;
  newCheckData.state = state;
  newCheckData.lastChecked = timeOfCheck;

  // Save the updates
  _data.update('checks', newCheckData.id, newCheckData, function(err){
    if(!err) {
      // Send the check data to the next phase in the process if needed
      if(alertWarranted) {
        workers.alertToStatusChange(newCheckData);
      } else {
        debug('Check Outcome has not changed, no alert needed');
      }
    } else {
      debug('Error trying to save updates to one of the checks');
    }
  });
};

// Alert the user as to a change in their check status
workers.alertToStatusChange = function(newCheckData) {
  var msg = 'Alert : You check for '+newCheckData.method.toUpperCase()+' '+newCheckData.protocol+'://'+newCheckData.url+' is currently '+newCheckData.state;
  helpers.sendTwilioSms(newCheckData.userPhone, msg, function(err){
    if(!err) {
      debug("Success: User was alerted to a status change in their check via SMS:", msg);
    } else {
      debug('Error: Could not send SMS alert to the user who had a state change in their check');
    }
  });
}

// Log function
workers.log = function(originalCheckData, checkOutcome, state, alertWarranted, timeOfCheck) {
  // We dont need much of the sanity checks is this is a private function

  // Form the log data
  var logData = {
    'check' : originalCheckData,
    'outcome' : checkOutcome,
    'state' : state,
    'alert' : alertWarranted,
    'time' : timeOfCheck
  };

  // Convert data to a string
  var logString = JSON.stringify(logData);

  // Determine the name of the log file
  var logFileName = originalCheckData.id;

  // Append the log string to the file
  _logs.append(logFileName, logString, function(err){
    if(!err) {
      debug('Logging to file succeeded!');
    } else {
      debug('Logging to file failed!');
    }
  });
};


// Timer to execute the worker-process once per minute
workers.loop = function(){
  setInterval(function(){
    workers.gatherAllChecks();
  }, 1000 * 60);
};

// Rotate (compress) the log files
workers.rotateLogs = function() {
  // List all the (non compressed) log files
  _logs.list(false, function(err, logs){
    if (!err && logs && logs.length > 0 ){
      logs.forEach(function(logName){
        // Compress the data to a different file
        var logId = logName.replace('.log', '');
        var newFileId = logId+'-'+Date.now();
        _logs.compress(logId, newFileId, function(err){
          if(!err) {
            // Truncate the log
            _logs.truncate(logId, function(err){
              if (!err) {
                debug('Success truncating log file');
              } else {
                debug('Error truncating log file');
              }
            });
          } else {
            debug('Error compressing one of the log file:', err);
          }
        })
      });
    } else {
      debug('Error : Could not find any logs to rotate');
    }
  });
};

// Timer to execute the log rotation process once per day
workers.logRotationLoop = function(){
  setInterval(function(){
    workers.rotateLogs();
  }, 1000 * 60 * 60 * 24);
};

// Init function
workers.init = function(){

  // Send to console, in yellow
  console.log('\x1b[33m%s\x1b[0m', 'Background workers are running');
  // Execute all the checks immediately
  workers.gatherAllChecks();

  // Call the loop so the checks will execute later on
  workers.loop();

  // Compress all the logs immediately
  workers.rotateLogs();

  // Call the compression loop so logs will be compressed later on
  workers.logRotationLoop();
};

// Export the module
module.exports = workers;
