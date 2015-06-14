goog.provide('MyController');

goog.require('utils.async');

/**
 * @constructor
 * @param {!angular.$q} $q
 */
MyController = function ($q) {
	
	this.henk = 'Henk';
	
	this.deferred = $q.defer();
	this.promise = this.deferred.promise;
	
	this.onResolve();
};

MyController.$inject = ['$q'];

MyController.prototype.onClick = function () {
	this.deferred.resolve('Henk!');	
};

MyController.prototype.onResolve = utils.async(function* () {
	var resolved = yield this.promise;
	console.log(resolved);	
});

