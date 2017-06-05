const IO = require("./IO");
const TestMachine = require("./TestMachine");
const TestError = require("./TestError");

/**
 * High-level testing infrastructure for testing cloud machine images.
*/
class CloudMachineTest {

  constructor() {
    this.maxInstances = 10;
    this.maxInstanceAge = 4 * 60 * 60 * 1000; // 4 hours

    this.exitCode = 0;
    this.io = new IO();
    this.machine = new TestMachine();
  }

  /* ***************  Test Organization *************** */

  /**
   * The highest-level organization of testing.
   * @return {Promise} resolves when the test has completed.
  */
  test() {
    return this
      .prepareEnvironment()
      .then(() => this.setup())
      .then(() => this.runTests())
      .then(() => this.manualSteps())
      .catch(err => {
        if(this.exitCode === 0) { this.exitCode = 1; }
        console.log(err);
        return true;
      })
      .then(() => this.cleanup())
      .catch(err => {
        if(this.exitCode === 0) { this.exitCode = 1; }
        console.log(err);
        return true;
      })
      .then(() => {
        console.log(`Exiting with code ${this.exitCode}`);
        process.exit(this.exitCode);
      });
  }

  /**
   * Ensures that the test is able to run: ensures that credentials exist and are valid, that test servers have been
   * cleaned up, and cleans up files from previous runs.
   * @return {Promise} resolves when the environment has been prepared.
  */
  prepareEnvironment() {
    return this
      .ensureCredentials()
      .then(() => this.preventRunawayServers());
  }

  /**
   * Prepares the test environment.
   * @return {Promise} resolves when the environment has been created.
  */
  setup() {
    return this.createInstance();
  }

  /**
   * Executes automatic tests in {@link Test#automatedTests}, if requested by the user.
   * @return {Promise} resolves when automated testing is finished.
  */
  runTests() {
    return this.io
      .yesNo("Run automated tests?", "Y", "Y")
      .then(answer => {
        if(answer) {
          return this.automatedTests();
        }
      });
  }

  /**
   * The automated tests to run on the created machine.  Override with your own tests.
   * @return {Promise} resolves after all tests have been run.
  */
  automatedTests() {
    return Promise.resolve();
  }

  /**
   * Adds manual actions that can be taken while running tests.
   * @return {Promise} resolves when actions have been completed.
  */
  manualSteps() {
    return this.manualSSH();
  }

  /**
   * Cleans up artifacts from running the test.
   * @return {Promise} resolves when artifacts have been cleaned up.
  */
  cleanup() {
    return this.destroyInstance();
  }

  /* ***************   Step Execution  **************** */

  /**
   * Ensure we have credentials and permissions to execute all commands needed for testing.
   * @todo Implement method.
   * @return {Promise} resolves after credentials and permissions have been checked.
  */
  ensureCredentials() {
    return Promise.resolve();
  }

  /**
   * Checks to ensure that machine instances are cleaned up after testing, both by using a hard limit for the total
   * number of machines, as well as checking if any instances have been alive for a long period of time.
   * @return {Promise} resolves after runaway servers have been checked.
 */
  preventRunawayServers() {
    let instances;
    return this.machine
      .getInstances()
      .then(i => instances = i)
      .then(() => {
        let current = instances.length;
        this.io.status(`${current} machine instances already running.`);
        if(current > this.maxInstances) {
          return this.io
            .yesNo("Might have runaway servers.  Create another?", "Y", "N")
            .then(answer => {
              if(!answer) { throw new TestError("Runaway servers detected."); }
            });
        }
      })
      .then(() => {
        const old = instances.filter(i => new Date() - new Date(i.creationTimestamp) > this.maxInstanceAge);
        let desc;
        const minute = 60 * 1000;
        const hour = 60 * minute;
        const day = 24 * hour;
        if(this.maxInstanceAge > day) { desc = `${Math.floor(this.maxInstanceAge / day)} days`; }
        else if(this.maxInstanceAge > hour) { desc = `${Math.floor(this.maxInstanceAge / hour)} hours`; }
        else if(this.maxInstanceAge > minute) { desc = `${Math.floor(this.maxInstanceAge / minute)} minutes`; }
        else { desc = `${this.maxInstanceAge}ms`; }
        this.io.status(`${old.length} machine instances have been running for longer than ${desc}`);
        if(old.length > 0) {
          return this.io
            .yesNo("Might have runaway servers.  Create another?", "Y", "N")
            .then(answer => {
              if(!answer) { throw new TestError("Runaway servers detected."); }
            });
        }
      });
  }

  /**
   * Create a new machine instance.
   * @return {Promise} resolves when the new instance has been created.
  */
  createInstance() {
    this.io.status("Creating a new machine instance.");
    return this.machine.createInstance();
  }

  /**
   * Offer the user the option of SSHing into the machine instance to manually test or debug.
   * @return {Promise} resolves when the user is finished with any manual SSH tasks.
  */
  manualSSH() {
    return this.io
      .yesNo("SSH into running machine?", "N", "N")
      .then(answer => {
        if(answer) {
          return this.machine
            .ssh()
            .then(() => this.manualSSH());
        }
      });
  }

  /**
   * Stop the machine instance.
   * @return {Promise} resolves when the instance has been destroyed.
   * @todo Allow running destruction in background.
  */
  destroyInstance() {
    return this.io
      .yesNo("Destroy the machine instance?", "Y", "Y")
      .then(answer => {
        if(answer) {
          this.io.status("Destroying the machine instance.");
          return this.machine.destroyInstance();
        }
      });
  }

}

module.exports = CloudMachineTest;
