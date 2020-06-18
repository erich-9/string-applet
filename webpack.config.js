const npmBuildType = process.env.npm_lifecycle_event;

const path = require("path");
const TerserPlugin = require("terser-webpack-plugin");

module.exports = {
  entry: [
    "./index.js",
  ],
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name].bundle.js",
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
        test: /\.css$/,
        use: [
          "style-loader",
          "css-loader",
        ],
      },
      {
        test: /\.js$/,
        exclude: /(node_modules)/,
        use: [
          "babel-loader",
          "eslint-loader",
        ]
      }
    ],
  },
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
  module.exports = {
    ...module.exports,
    mode: "production",
    optimization: {
      minimize: true,
      minimizer: [
        new TerserPlugin(),
      ],
      splitChunks: {
        cacheGroups: {
          commons: {
            test: /[\\/]node_modules[\\/]/,
            name: "vendors",
            chunks: "all",
          },
        },
      },
    },
  };
}
else {
  module.exports = {
    ...module.exports,
    mode: "development",
    devServer: {
      contentBase: "./dist"
    },
    devtool: "inline-source-map"
  };
}
