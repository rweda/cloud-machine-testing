const chalk = require("chalk");
const EventEmitter = require("events");

/**
 * A special type of `Error` that is used when skipping sections of code.
*/
class Bypass extends Error {
  constructor(code) {
    super(`Bypass for ${code}`);
    this.code = code;
    this.name = this.constructor.name;
  }
}

/**
 * Provides a simplistic testing framework that integrates into seperate scripts and is based around dependent test
 * stages, unlike frameworks like Mocha which intend for parallel testing and must be run in their own environment.
 * `section` works like Mocha's `describe`, and `it` works similar to `it` in Mocha.
 *
 * This framework should not be used in standard testing flows, as most tests should be independent.  However, when
 * testing a remote machine, chaining tests together is useful, as well as having greater control over test execution.
 *
 * Test failure results in a Promise rejection, and must be manually allowed (with `allowAssertion`) to prevent other
 * tests from being skipped.  `startBypass`/`resumeBypass` are utilities for skipping dependent test sections after a
 * failure.
*/
class FormatTestOutput extends EventEmitter {

  constructor() {
    super();
    this.indentation = 0;
  }

  /**
   * Utility for indenting sections of code.
   * @return {String} the current indentation to add to the beginning of messages.
   * @private
  */
  indent() {
    return new Array(this.indentation + 1).join("  ");
  }

  /**
   * Utility for indenting a multi-line string.
   * @param {String} msg a multi-line message that should be indented.
   * @return {String} the given message, with every line indented.
   * @private
  */
  indentLines(msg) {
    return this.indent() + msg.replace(/\n/g, `\n${this.indent()}`);
  }

  /**
   * Start a section of testing.  Similar to Mocha's `describe` block.  Catches any errors from inside the `contents`,
   * and logs them to the console.
   * @param {String} name a descriptive name for this section.
   * @param {Function} contents the contents of this section.  Must return a Promise.
   * @returns {Promise} the returned value of `contents`.
   * @example <caption>Using 'section' with 'it'</caption>
   * const chai = require("chai"); const should = chai.should();
   * const out = new FormatTestOutput();
   * out.section("addition", () => {
   *   return it("adds numbers", () => (1 + 1).should.equal(2))
   *     .catch(out.allowAssertion)
   *     .then(out._it("continues", () => (1 + 2).should.equal(3))
   *     .catch(out.allowAssertion)
   * });
  */
  section(name, contents) {
    console.log("");
    console.log(this.indent() + chalk.underline.bold.blue(name));
    console.log("");
    ++this.indentation;
    return Promise
      .resolve(contents())
      .catch(err => {
        console.warn(chalk.gray(`Encountered error in section ${name}.`));
        console.warn(err.stack ? err.stack : err);
        return true;
      })
      .then(() => --this.indentation);
  }

  /**
   * Run a single test, and logs to the console.  Prints any encountered errors to the console.  Works like Mocha's
   * `it`.
   * @param {String} name a descriptive name for this test.
   * @param {Function} contents the test to run.  Should return a `Promise` if async.
   * @return {Promise} the result of running the `contents`.
   * @example <caption>Using 'it'</caption>
   * const chai = require("chai"); const should = chai.should();
   * const out = new FormatTestOutput();
   * out.it("adds", () => (1 + 1).should.equal(2));
  */
  it(name, contents) {
    return Promise
      .resolve()
      .then(() => contents())
      .then(() => console.log(this.indent() + chalk.green("\u2713   ") + name))
      .catch(err => {
        this.emit("error", err);
        console.warn(this.indent() + chalk.red("\u2717   ") + name);
        ++this.indentation;
        console.log(this.indentLines( err.stack ? err.stack : err ));
        --this.indentation;
        throw err;
      });
  }

  /**
   * Helper for {@link FormatTestOutput#it} to be used inside `.then()`.  Given same arguments as `it`.
   * @returns {Promise} see {@link FormatTestOutput#it}
   * @example <caption>Comparison to 'it'</caption>
   * const out = new FormatTestOutput();
   * out
   *   .it("does something first", () => true)
   *   .then(() => out.it("then does this", () => true))
   *   .then(_it("then does this", () => true)); // Same as line above, but avoids an extra wrapper function.
  */
  _it(...args) {
    return () => this.it(...args);
  }

  /**
   * Allows resumption of code after an assertion is thrown.
   * @param {Error} [err] the thrown error.
   * @param {Function} [cb] provide a custom callback to run while catching assertions.
   * @return {Promise} resolves if the given error is an `AssertionError`.
   * @example <caption>Resuming after failed assertion</caption>
   * const chai = require("chai"); const should = chai.should();
   * const out = new FormatTestOutput();
   * out
   *   .it("should fail", () => 1.should.equal(2))
   *   .catch(out.allowAssertion)
   *   .then(() => out.it("should continue", () => 2.should.equal(2)));
   * @example <caption>Calling a callback after failed assertion</caption>
   * const chai = require("chai"); const should = chai.should();
   * const out = new FormatTestOutput();
   * const test = "Foo Bar Baz"
   * out
   *   .it("should include 'bogus'", () => test.indexOf("bogus").should.equal(true))
   *   .catch(out.allowAssertion(err => console.log(out.indentLines(`Expected '${test}' to include 'bogus'.`))))
   *   .then(() => out.it("should continue", () => 2.should.equal(2)));
  */
  allowAssertion(err, cb) {
    if(typeof err === "function") {
      cb = err;
      return (err) => this.allowAssertion(err, cb);
    }
    if(err.name !== "AssertionError") { throw err; }
    if(cb && typeof cb === "function") {
      ++this.indentation;
      cb(err);
      --this.indentation;
    }
    return true;
  }

  /**
   * Skips a section of testing.
   * @param {Any} code a code to identify the current bypass, so multiple bypasses can be used.
   * @return {Function} can be used inside `.catch()` to start skipping tests.
   * @example <caption>Using a bypass</caption>
   * const chai = require("chai"); const should = chai.should();
   * const out = new FormatTestOutput();
   * out
   *   .it("should fail", () => 1.should.equal(2))
   *   .catch(out.startBypass("should-fail"))
   *   .it("should not run", () => 1.should.equal(2))
   *   .catch(out.resumeBypass("should-fail"))
   *   .it("should run", () => 1.should.equal(1));
   * @example <caption>Using two bypasses</caption>
   * const text = "A simple sentance.";
   * const out = new FormatTestOutput();
   * out
   *   .it("should have text", () => text.length.should.be.above(0))
   *   .catch(out.startBypass("no-text"))
   *   .it("should have at least three words", () => (text.match(' ') || []).length.should.be.at.least(2))
   *   .catch(out.startBypass("few-words"))
   *   .it("test depends on having text and at least 3 words", () => text.split(" ").length.should.be.at.least(3))
   *   .catch(out.allowAssertion)
   *   .catch(out.resumeBypass("few-words"))
   *   .it("test needs text, but doesn't need three words", () => text.length.should.be.above(1))
   *   .catch(out.allowAssertion)
   *   .catch(out.resumeBypass("no-text"))
   *   .it("doesn't need text and should always run", () => 1.should.equal(1));
  */
  startBypass(code) {
    return (err) => {
      if(err.name !== "AssertionError") {
        console.warn("Refusing to bypass non-AssertionError");
        console.error(err);
        throw err;
      }
      throw new Bypass(code);
    };
  }

  /**
   * Resumes testing code after bypassing tests.
   * @param {Any} code the code from {@link FormatTestOutput#startBypass} that should be resumed.
   * @return {Function} can be used inside `.catch()` to resume test execution
  */
  resumeBypass(code) {
    return (err) => {
      if(err.name !== "Bypass" || err.code !== code) { throw err; }
      return true;
    };
  }

}

module.exports = FormatTestOutput;
