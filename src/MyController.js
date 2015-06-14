goog.provide('MyController');

goog.require('utils.async');

/**
 * @constructor
 * @param {!angular.$q} $q
 * @export
 */
MyController = function ($q) {
	
	/** @export @type {string} */
	this.henk = 'Henk';
	
	this.deferred = $q.defer();
	this.promise = this.deferred.promise;
	
	var resolvedPromise = this.onResolve("When resolved: ");
	resolvedPromise.then(() => console.log('Done resolving!'));
};

/** @export */
MyController.$inject = ['$q'];

/** @export */
MyController.prototype.onClick = function () {
	this.deferred.resolve('Henk!');	
};

/** @type {function(string): !angular.$q.Promise.<boolean>} */
MyController.prototype.onResolve = utils.async(function* (/** string */ prefix) {
	var resolved = yield this.promise;
	console.log(prefix + resolved);
	return prefix + resolved;
});

