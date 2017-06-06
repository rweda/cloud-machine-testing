const sleep = require("promise.delay");
const TestError = require("./TestError");

/**
 * Abstract class that creates machines, runs tests on created machines, then destroys the machines.
*/
class TestMachine {

  constructor() {
    this.prefix = "test-";
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
    return this
      .ssh("echo 'Test'")
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