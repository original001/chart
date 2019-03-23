const path = require("path");
const ClosureCompilerPlugin = require("webpack-closure-compiler");

const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const OptimizeCSSAssetsPlugin = require("optimize-css-assets-webpack-plugin");

module.exports = {
  entry: {
    app: "./src/app"
  },
  output: {
    filename: "bundle.js",
    publicPath: "/dist"
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: "[name].css",
      chunkFilename: "[id].css"
    })
  ],
  module: {
    rules: [
      {
        test: /.ts$/,
        loader: "ts-loader",
        include: [path.resolve(__dirname, "./src")]
      },
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, "css-loader"]
      }
    ]
  },

  optimization: {
    minimizer: [
      new ClosureCompilerPlugin({ mode: "AGGRESSIVE_BUNDLE" }, {}),
      new OptimizeCSSAssetsPlugin({})
    ]
  },
  resolve: {
    extensions: [".js", ".ts"]
  },
  devtool: "inline"
};
