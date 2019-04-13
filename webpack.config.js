const path = require("path");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const OptimizeCSSAssetsPlugin = require("optimize-css-assets-webpack-plugin");
const TerserPlugin = require('terser-webpack-plugin');


module.exports = {
  entry: {
    app: "./src/appWrapper",
    data: "./src/data"
  },
  output: {
    filename: "[name].js",
    publicPath: "/dist"
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: "[name].css",
      chunkFilename: "[id].css"
    }),
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
      // new UglifyJsPlugin(),
      new TerserPlugin(),
      new OptimizeCSSAssetsPlugin({}),
      // new ClosureCompilerPlugin({ mode: "AGGRESSIVE_BUNDLE" }, {}),
    ]
  },
  optimization: {
    splitChunks: {
      cacheGroups: {
        common: {
          test: "data",
          name: "data",
          chunks: "all",
        },
      },
    },
  },
  resolve: {
    extensions: [".js", ".ts"]
  },
  devtool: "inline"
};
