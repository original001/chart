const path = require("path");
const ClosureCompilerPlugin = require("webpack-closure-compiler");

module.exports = {
  entry: {
    app: "./src/app"
  },
  output: {
    filename: "bundle.js",
    publicPath: "/dist"
  },
  module: {
    rules: [
      {
        test: /.ts$/,
        loader: "ts-loader",
        include: [path.resolve(__dirname, "./src")]
      }
    ]
  },
  optimization: {
    minimizer: [new ClosureCompilerPlugin({ mode: "AGGRESSIVE_BUNDLE" }, {})]
  },
  resolve: {
    extensions: ['.js', '.ts']
  },
  devtool: 'inline'
};
