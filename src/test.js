goog.provide('test.main');

/** @constructor @export */
test.main = function() {

	/** @private @expose @type {string} */
	this.henk = 'Piet';
};

/** @export */
var theMain = new test.main();
theMain.henk = 'Pieterke';
alert(theMain.henk);