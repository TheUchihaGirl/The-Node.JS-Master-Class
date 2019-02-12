/*
* Create and export confriguration variables
*
*/

// Container for all the environments
var environments = {};

// Staging (default) object
environments.staging = {
	'httpPort' : 80,
	// 'httpsPort' : 443,
	'envName' : 'staging'
};

// Production environment
environments.production = {
	'httpPort' : 5000,
	// 'httpsPort' : 5001,
	'envName' : 'production'
};

// Determining which environment was passed as a command-line argument, if not, default with an empty string
var currentEnvironment = typeof(process.env.NODE_ENV) == 'string' ? process.env.NODE_ENV.toLowerCase() : '';

// Check that the current environment is on if the environments above, if not, defaut to staging
var environmentToExport = typeof(environments[currentEnvironment]) == 'object' ? environments[currentEnvironment] : environments.staging;

// Export the module
module.exports = environmentToExport;
