goog.provide('utils.async');

/** @type {function(function(function(*): undefined, function(*): undefined): undefined): !angular.$q.Promise} */
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
        /** @type {Generator.<?>} */
        var generator = generatorFunction.apply(this, arguments);
        
        /**
         * @param {function(RETURN_VALUE): undefined} resolve
         * @param {function(RETURN_VALUE): undefined} reject
         * @return {undefined}
         * @template RETURN_VALUE
         */
        function promiseConstructorArg(resolve, reject) {
            /**
             * @param {function(Generator.<VALUE>, VALUE): {value:VALUE, done:boolean}} continueWithGenerator
             * @param {VALUE} value
             * @return {undefined}
             * @template VALUE
             */
            function resume(continueWithGenerator, value) {
                try {
                    var result = continueWithGenerator(generator, value);
                    if (result.done) {
                        resolve(result.value);
                    } else {
                        result.value.then(resumeNext, resumeThrow);
                    }
                } catch (e) {
                    reject(e);
                }
            }
            
            /**
             * @param {Generator.<VALUE>} generator
             * @param {VALUE} value
             * @return {{value:VALUE, done:boolean}}
             * @template VALUE
             */
            function getNextFromGenerator(generator, value) {
                return generator.next(value);
            };
            
            /**
             * @param {Generator.<VALUE>} generator
             * @param {VALUE} value
             * @return {{value:VALUE, done:boolean}}
             * @template VALUE
             */
            function throwFromGenerator(generator, value) {
                return generator.throw(value);    
            };
            
            var resumeNext = resume.bind(null, getNextFromGenerator);
            var resumeThrow = resume.bind(null, throwFromGenerator);
            resumeNext(undefined);
        }
        
        return promiseConstructor(promiseConstructorArg);
    };
};