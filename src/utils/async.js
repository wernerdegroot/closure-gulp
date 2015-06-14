goog.provide('utils.async');

/** @type {function(function(function(*): undefined, function(*): undefined): !angular.$q.Promise)} */
var promiseConstructor;

function initializePromiseConstructor($q) {
    promiseConstructor = $q;
}

/**
 * @param {T} generatorFunction
 * @return {T}
 * @template T 
 */
utils.async = function async(generatorFunction) {
    return function(/* ...args */) {
        
        // Call the generator function with the supplied arguments
        // and the right context (this). This will yield a generator.
        var generator = generatorFunction.apply(this, arguments);
        
        return promiseConstructor(function(/** function(*): undefined */ resolve, /** function(*): undefined */ reject) {
            function resume(method, value) {
                try {
                    var result = generator[method](value);
                    if (result.done) {
                        resolve(result.value);
                    } else {
                        result.value.then(resumeNext, resumeThrow);
                    }
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