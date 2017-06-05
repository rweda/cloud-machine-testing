const readline = require("readline");
const exec = require("child-process-promise").exec;
const chalk = require("chalk");

/**
 * Utilities for clean log output and user input.
*/
class IO {

  constructor() {
    this.yesRegex = /^([yY][eE][sS]|[yY])+$/;
    this.isCI = typeof process.env.CI !== "undefined";
    this.statusFormat = chalk.magenta;
    this.questionFormat = chalk.blue;
    this.ciAnswerFormat = chalk.yellow;
    this.formatDefault = chalk.bold;
  }

  /**
   * Provides a section header to mark a section of script running.
   * @param {String} msg the message to print.
   * @return {void}
  */
  status(msg) {
    console.log(`
      ${this.statusFormat(msg)}
    `);
  }

  /**
   * Rings an auditory bell when prompting for input.
   * @return {Promise} resolves when the sound is finished playing, or immediately if bell is disabled.
  */
  bell() {
    if(process.env.CI || process.env.NO_BELL) {
      return Promise.resolve();
    }
    return exec("paplay /usr/share/sounds/ubuntu/notifications/Xylo.ogg");
  }

  /**
   * Queries the user for a "yes/no" question.  If in CI, uses a default, and creates fake console output to simulate
   * asking the question to the user and getting a response, to allow the user to follow along.
   * @param {String} question the text of the question to ask the user.
   * @param {String} consoleDefault the default input if the user doesn't provide input.  Use `"Y"` or `"N"`.
   * @param {String} ciDefault the default input to use in CI.  Use `"Y"` or `"N"`.
   * @return {Promise<Boolean>} `true` if the user answered "yes", `false` if the user answered "no".
   * @example <caption>Basic Usage</caption>
   * const io = new IO();
   * io
   *    .yesNo("Use current directory, instead of '/var/my-app/'?", "Y", "N")
   *    .then(answer => console.log(answer ? "Using current directory." : "Using '/var/my-app/'."));
  */
  yesNo(question, consoleDefault, ciDefault) {
    if(this.isCI) {
      const {y, n} = this.formatYesNo(ciDefault);
      console.log(this.questionFormat(`${question} (${y}/${n}) `) + this.ciAnswerFormat(ciDefault.toUpperCase()));
      return Promise.resolve(this.yesRegex.test(ciDefault));
    }
    else {
      this.bell();
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      const askQuestion = (text) => new Promise(resolve => rl.question(text, resolve));
      const {y, n} = this.formatYesNo(consoleDefault);
      return askQuestion(this.questionFormat(`${question} (${y}/${n}) `))
        .then(answer => {
          rl.close();
          answer = (answer || "").trim();
          return this.yesRegex.test(answer.length > 0 ? answer : consoleDefault);
        });
    }
  }

  /**
   * Provides the format for the "Y/N" prompt.
   * @param {String} defaultVal the default value for the question.
   * @return {Object} `{ y, n }` containing formatted strings for the `Y` and `N` parts of the default input.
   * @private
  */
  formatYesNo(defaultVal) {
    return {
      y: this.yesRegex.test(defaultVal) ? this.formatDefault("Y") : "y",
      n: this.yesRegex.test(defaultVal) ? "n" : this.formatDefault("N"),
    };
  }

}

module.exports = IO;
