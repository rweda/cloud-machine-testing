# Changelog

## [Unreleased]

### Fixed

- Change `require("timeout")` to `require("promise-timeout")`.

## [0.1.2] - 2017-06-08

### Added

- [`TestMachine`][] takes `sshUser` option
  - Implemented in [`GCETestMachine#ssh`][]
- Moved SSH timeout logic from [`GCETestMachine#ssh`][] to [`TestMachine#ensureStarted`][]
- Added `--quiet` flag to [`GCETestMachine#ssh`][] as
  [suggested](https://cloud.google.com/sdk/gcloud/reference/compute/ssh#DESCRIPTION)
  in the `gcloud` docs.

## [0.1.1] - 2017-06-08

### Added

- `TestMachine` takes configurable options ([`TestMachineOptions`][])
- [`TestMachine`][] takes `sshTimeout` option
  - Implemented in [`GCETestMachine#ssh`][]

[`TestMachineOptions`]: https://rweda.github.io/cloud-machine-testing/global.html#TestMachineOptions
[`TestMachine`]: https://rweda.github.io/cloud-machine-testing/TestMachine.html
[`TestMachine#ensureStarted`]: https://rweda.github.io/cloud-machine-testing/TestMachine.html#ensureStarted
[`GCETestMachine#ssh`]: https://rweda.github.io/cloud-machine-testing/GCETestMachine.html#ssh
