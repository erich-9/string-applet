const npmBuildType = process.env.npm_lifecycle_event;

const path = require("path");
const webpack = require("webpack");

const ExtractTextPlugin = require("extract-text-webpack-plugin");

module.exports = {
  entry: ["babel-polyfill", "./index.js"],
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "bundle.js"
  },
  module: {
    rules: [
      {
        test: /\.html$/,
        use: "file-loader?name=[name].[ext]"
      },
      {
        test: /\.(gif|png|svg)$/,
        use: "file-loader?name=img/[name].[ext]"
      },
      {
        test: /\.(css|scss)$/,
        use: ExtractTextPlugin.extract({
          use: [
            "css-loader?importLoaders=1",
            "postcss-loader"
          ]
        })
      },
      {
        test: /\.js$/,
        exclude: /(node_modules)/,
        use: [
          "babel-loader?presets[]=env",
          "eslint-loader"
        ]
      }
    ]
  },
  plugins: [
    new ExtractTextPlugin("styles.css")
  ],
  externals: {
    "mathjax": "MathJax"
  },
  resolve: {
    alias: {
      "jquery-ui": "jquery-ui/ui/widgets"
    }
  }
};

if (npmBuildType === "build") {
  module.exports.plugins = module.exports.plugins.concat([
    new webpack.optimize.UglifyJsPlugin({
      output: {
        comments: false
      }
    })
  ]);
}
else {
  module.exports.devtool = "source-map";
}
