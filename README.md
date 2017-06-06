# Cloud Machine Testing

Generic infrastructure for testing scripted configuration for cloud machines.

## Example

See the [online documentation](https://rweda.github.io/cloud-machine-testing/) for the full API, including:

- Changing [`TestMachine`][]/[`GCETestMachine`][] to specify how new cloud machines can be created
- Specify custom setup/teardown actions in [`CloudMachineTest`][]
- Full API for the [`FormatTestOutput`][] testing framework

```js
const chai = require("chai");
const should = chai.should();
const CloudMachineTest = require("@rweda/cloud-machine-testing");
const FormatTestOutput = require("@rweda/cloud-machine-testing/FormatTestOutput");
const GCETestMachine = require("@rweda/cloud-machine-testing/GCETestMachine");

/**
 * Runs tests against a Google Compute Engine machine.
*/
class MyMachineTest extends CloudMachineTest {
  
  constructor() {
    super();
    this.machine = new GCETestMachine();
    this.out = new FormatTestOutput();
  }
  
  /**
   * Run automated tests on a newly created machine running on the Google Compute Engine.
   * @return {Promise} resolves when testing has finished.
  */
  automatedTests() {
    return this.out
      .section("Directory Existence", () => {
        return this.out
          .it("should have '/dev'", () => {
            return this.machine
              .ssh("[ -d '/dev' ]; echo $?")
              .then(res => res.stdout)
              .then(code => code.should.equal("0"));
          })
          .catch(this.out.allowAssertion)
          .then(this.out._it("should have '/var'", () => {
            return this.machine
              .ssh("[ -d '/var' ]")
              .then(res => res.stdout)
              .then(code => code.should.equal("0"));
          }))
          .catch(this.out.allowAssertion);
      })
      .then(() => this.out.section("Root User", () => {
        return this.out
          .it("should have '/root'", () => {
            return this.machine
              .ssh("sudo [ -d '/root' ]; echo $?")
              .then(res => res.stdout)
              .then(code => code.should.equal("0"));
          })
          .catch(this.out.allowAssertion);
      }));
  }
  
}

const tester = new MyMachineTest();
tester.test();
```

[`TestMachine`]: https://rweda.github.io/cloud-machine-testing/TestMachine.html
[`GCETestMachine`]: https://rweda.github.io/cloud-machine-testing/GCETestMachine.html
[`CloudMachineTest`]: https://rweda.github.io/cloud-machine-testing/CloudMachineTest.html
[`FormatTestOutput`]: https://rweda.github.io/cloud-machine-testing/FormatTestOutput.html
