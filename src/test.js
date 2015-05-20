goog.provide('test.main');

/** @constructor @export */
test.main = function() {

	/** @private @expose @type {string} */
	this.henk = 'Piet';
};

/** @export */
var theMain = new test.main();
theMain.henk = 'Pieterke';
console.log(theMain.henk);
var lop = () => {
	return '14';
};
console.log(lop());


function* Factorial() {
  var n = 1, total = 1;
  while (true) {
    total = total * n++;
    yield total;
  };
}
function factorial(n) {
  var f = Factorial(), k, nf;
  for (k = 0; k < n; k += 1) {
    nf = f.next().value;
  }
  return nf;
}
console.log(factorial(4));
console.log(4 * 3 * 2 * 1);