const path = require("path");
const ClosureCompilerPlugin = require("webpack-closure-compiler");

module.exports = {
  context: path.resolve(__dirname, "src"),
  entry: {
    app: "./app.js"
  },
  output: {
    filename: "bundle.js"
  },
  optimization: {
    minimizer: [
      new ClosureCompilerPlugin({mode: 'AGGRESSIVE_BUNDLE'}, { })
    ]
  },
  devtool: false
};
