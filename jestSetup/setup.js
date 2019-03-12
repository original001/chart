global.regeneratorRuntime = require("regenerator-runtime");
require("promise.prototype.finally").shim();

const Adapter = require("enzyme-adapter-react-15");
const { configure } = require("enzyme");
configure({ adapter: new Adapter() });

function dieOnUnhandledRejection(e) {
  process.stderr.write(
    "Asynchronous unhandled rejection in some of Jest tests\n"
  );
  process.stderr.write(e.stack + "\n");
  process.exit(666);
}

process.removeAllListeners("unhandledRejection");
process.addListener("unhandledRejection", dieOnUnhandledRejection);
