/**
 * A class to represent a failure while testing.  Takes in an `exitCode` to specify what the program should exit with.
*/
class TestError extends Error {

  /**
   * @param {String} msg the message to give to the user to describe this failure.
   * @param {Number} [exitCode] the code to exit the process with.  Defaults to `1`.
  */
  constructor(msg, exitCode) {
    super(msg);
    this.message = msg;
    this.exitCode = exitCode || 1;
    this.name = "TestError";
  }

}

module.exports = TestError;
