const path = require("path");
const os = require("os");
const isCI = require("is-ci");

const programDir = path.join(__dirname, "programs", "solvent-protocol");
const idlDir = path.join(__dirname, "target", "idl");
const sdkDir = path.join(__dirname, "../solvent-sdk", "src");
const binaryInstallDir = path.join(isCI ? "/root" : os.homedir(), ".cargo");

module.exports = {
  idlGenerator: "anchor",
  programName: "solvent_protocol",
  programId: "SVTy4zMgDPExf1RaJdoCo5HvuyxrxdRsqF1uf2Rcd7J",
  idlDir,
  sdkDir,
  binaryInstallDir,
  programDir,
};
