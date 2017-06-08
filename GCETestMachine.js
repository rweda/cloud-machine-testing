const exec = require("child-process-promise").exec;
const TestMachine = require("./TestMachine");

/**
 * Interacts with the Google Compute Engine to interact with machines to create testing environments.
*/
class GCETestMachine extends TestMachine {

  /**
   * @param {TestMachineOptions} opts options to configure the test machine.
  */
  constructor(opts) {
    super(opts);
    this.zone = "us-east1-d";
    this.ensureStartedTimeout = 60 * 1000;
  }

  /**
   * Creates a random alphabetical string to generate unique machine names.
   * @return {String} a random alphabetical string.
  */
  salt() {
    return Math.random().toString(36).slice(2);
  }

  /**
   * Fetches all running Google Compute Engine machines.
   * @return {Promise<Array>} resolves to the current running machines.  Each includes
   *   `{ id, name, zone, creationTimestamp }`.
  */
  getInstances() {
    return exec(`gcloud compute instances list --regexp "${this.opts.prefix}.*" --format='json'`)
      .then(res => res.stdout)
      .then(JSON.parse);
  }

  /**
   * Creates a new Google Compute Engine machine for testing.
   * @return {Promise} resolves when the machine has been created.
  */
  createInstance() {
    this._salt = this.salt();
    this._image = `${this.opts.prefix}${this._salt}`;
    return exec(`gcloud compute instances create "${this._image}" \
      --image-family ubuntu-1604-lts \
      --image-project ubuntu-os-cloud \
      --preemptible \
      --zone "${this.zone}" \
      --machine-type n1-standard-1 \
      --metadata production=false \
      --metadata-from-file user-data=cloud-config.yaml`)
      .then(() => {
        console.log("Created machine.  Ensuring SSH connection works.");
        return this.ensureStarted(this.ensureStartedTimeout);
      });
  }

  /**
   * Destroys the Google Compute Engine machine used for testing.
   * @return {Promise} resolves when the machine has been destroyed.
  */
  destroyInstance() {
    if(!this._image) { return Promise.resolve(); }
    return exec(`gcloud compute instances delete "${this._image}" --zone "${this.zone}" -q`);
  }

  /**
   * Runs an SSH connection to the current Coogle Compute Engine instance.
   * @param {String} command a command to execute on the remote machine.  If not provided, an interactive SSH session
   *   is started.
   * @return {Promise} resolves when the SSH connection terminates.
   * @throws {TimeoutError} if the SSH command doesn't return within the set timeout.
   * @todo Fix 'manual' SSH.
  */
  ssh(command) {
    let machine = this._image;
    if(this.opts.sshUser) {
      machine = `${this.opts.sshUser}@${machine}`;
    }
    if(command) {
      return exec(`gcloud compute ssh "${machine}" --quiet --zone "${this.zone}" --command "${command}"`);
    }
    else {
      console.log(`Run 'gcloud compute ssh "${machine}" --zone "${this.zone}'.`);
      const rl = require("readline").createInterface({ input: process.stdin, output: process.stdout });
      const askQuestion = (text) => new Promise(resolve => rl.question(text, resolve));
      return askQuestion("Press <enter> to continue. ")
        .then(() => {
          rl.close();
        });
      /*const spawned = spawn(`gcloud compute ssh "${this._image}" --zone "${this.zone}"`, {
        stdio: "pipe",
      });
      return spawned;*/
    }
  }

}

module.exports = GCETestMachine;
