const path         = require('path');
const AssetsPlugin = require('assets-webpack-plugin');

module.exports = {
  context : __dirname,
  entry: './assets/src/index.js',
  output: {
    path: path.join(__dirname, "public", "js"),
    filename: "[name]-[hash].js",
    publicPath: "/public/js/"
  },
  plugins: [
    new AssetsPlugin(),
  ],
};
