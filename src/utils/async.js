goog.provide('utils.async');

/**
 * @constructor
 */
utils.AsyncManager = function () {
	
	this.globalInstanceOfQ = null;
};

/** @type {!utils.AsyncManager} */
utils.AsyncManager.instance = new utils.AsyncManager();

/** @type {?} */
utils.async = function async(generatorFunction) {
    return function(/*...args*/) {
        var generator = generatorFunction.apply(this, arguments);
        return utils.AsyncManager.instance.globalInstanceOfQ(function(resolve, reject) {
            function resume(method, value) {
                try {
                    var result = generator[method](value);
                    result.value.then(resumeNext, resumeThrow);
                } catch (e) {
                    reject(e);
                }
            }
            var resumeNext = resume.bind(null, 'next');
            var resumeThrow = resume.bind(null, 'throw');
            resumeNext(undefined);
        });
    };
};