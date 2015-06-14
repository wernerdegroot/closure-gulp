goog.provide('test.main');

goog.require('utils.async');
goog.require('MyController');

var myApp = angular.module('myApp', [])

	.controller('MyController', MyController)

	.run(['$q', function ($q) {
		utils.AsyncManager.instance.globalInstanceOfQ = $q;
	}]);