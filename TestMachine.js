const merge = require("lodash.merge");
const promiseTimeout = require("promise-timeout").timeout;
const sleep = require("promise.delay");
const TestError = require("./TestError");

/**
 * @typedef {Object} TestMachineOptions
 * @property {String} prefix inserted before the name of generated machines.  Defaults to `test-`.
 * @property {Number} sshTimeout the duration to wait for new SSH connections to complete, in milliseconds.
 *   Defaults to 2 minutes.
 * @property {null|String} sshUser if provided, specifies a remote user to connect to.  If in CI, defaults to `ci`.
 *   otherwise not provided (and uses a default).
*/

/**
 * Abstract class that creates machines, runs tests on created machines, then destroys the machines.
*/
class TestMachine {

  /**
   * @param {TestMachineOptions} opts options to configure the test machine.
  */
  constructor(opts) {
    this.opts = merge({}, {
      prefix: "test-",
      sshTimeout: 2 * 60 * 1000,
      sshUser: process.env.CI ? "ci" : undefined,
    }, opts);
  }

  /**
   * Fetches all machines that are currently running created by this testing.
   * @return {Promise<Array>} resolves to the current running machines.  Each includes
   *   `{ id, name, zone, creationTimestamp }`.
   * @abstract
  */
  getInstances() {
    return Promise.resolve([]);
  }

  /**
   * Creates a new machine for testing.
   * @return {Promise} resolves when the machine has been created.
   * @abstract
  */
  createInstance() {
    return Promise.reject(new Error("Abstract TestMachine#createInstance not implemented."));
  }

  /**
   * Destroys the machine used for testing.
   * @return {Promise} resolves when the machine has been destroyed.
   * @abstract
  */
  destroyInstance() {
    return Promise.reject(new Error("Abstract TestMachine#destroyInstance not implemented."));
  }

  /*eslint-disable no-unused-vars*/
  /**
   * Runs an SSH connection to the current testing machine.
   * @param {String} command a command to execute on the remote machine.  If not provided, an interactive SSH session
   *   is started.
   * @return {Promise} resolves when the SSH connection terminates.
   * @abstract
  */
  ssh(command) {
    return Promise.reject(new Error("Abstract TestMachine#destroyInstance not implemented."));
  }
  /*eslint-enable no-unused-vars*/

  /**
   * Ensure that a newly created machine has started.
   * @param {Integer} timeout the maxiumum time to wait.
   * @param {Integer} [started] the timestamp of the first check executed.  Defaults to the current time.
   * @param {Integer} [failures] the number of times that an SSH connection has been tried.  Defaults to `0`.
   * @return {Promise} resolves when the machine has been started.
  */
  ensureStarted(timeout, started, failures) {
    if(!started) { started = new Date(); }
    if(!failures) { failures = 0; }
    if(new Date() - started > timeout) {
      throw new TestError(`Machine has not responded to SSH in ${timeout}ms (Attempted ${failures} connections)`);
    }
    return promiseTimeout(this.ssh("echo 'Test'"), this.opts.sshTimeout)
      .then(() => console.log(`Machine responded to SSH connections in ${new Date() - started}ms`))
      .catch(() => sleep(100).then(() => this.ensureStarted(timeout, started, ++failures)));
  }

  /**
   * Ensure that a `systemd` service is running.
   * @param {String} service the name of the `systemd` service to check.
   * @param {Integer} timeout the maxiumum time to wait.
   * @param {Integer} [started] the timestamp of the first check executed.  Defaults to the current time.
   * @return {Promise} resolves when the session is running.
  */
  ensureServiceStarted(service, timeout, started) {
    if(!started) { started = new Date(); }
    if(new Date() - started > timeout) {
      throw new TestError(`Service ${service} has not started after ${timeout}ms.`);
    }
    return this
      .ssh(`systemctl is-active ${service}`)
      .catch(() => sleep(100).then(() => this.ensureServiceStarted(service, timeout, started)));
  }

}

module.exports = TestMachine;
