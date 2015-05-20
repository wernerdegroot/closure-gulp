var expect = chai.expect;

describe("main", function() {

	it("what", function() {

		var theMain = new test.main();
		expect(theMain.henk).to.equal('Piet');

	});

});