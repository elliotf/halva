const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const path = require('path');
const AssetsPlugin = require('assets-webpack-plugin');

const mode = process.env.NODE_ENV || 'development';
const prod = mode === 'production';

module.exports = {
  // entry: './assets/src/index.js',
  entry: './ui/main.js',
  resolve: {
    alias: {
      svelte: path.dirname(require.resolve('svelte/package.json'))
    },
    extensions: ['.mjs', '.js', '.svelte'],
    mainFields: ['svelte', 'browser', 'module', 'main']
  },
  output: {
    path: path.join(__dirname, '/public'),
    filename: "[name]-[hash].js",
    publicPath: "/public",
  },
  module: {
    rules: [
      {
        test: /\.svelte$/,
        use: {
          loader: 'svelte-loader',
          options: {
            compilerOptions: {
              dev: !prod
            },
            emitCss: prod,
            hotReload: !prod
          }
        }
      },
      {
        test: /\.css$/,
        use: [
          MiniCssExtractPlugin.loader,
          'css-loader'
        ]
      },
      {
        // required to prevent errors from Svelte on Webpack 5+
        test: /node_modules\/svelte\/.*\.mjs$/,
        resolve: {
          fullySpecified: false
        }
      }
    ]
  },
  mode,
  plugins: [
    new AssetsPlugin({
      prettyPrint: true,
    }),
    new MiniCssExtractPlugin({
      filename: '[name]-[hash].css'
    })
  ],
  devtool: prod ? false : 'source-map',
  devServer: {
    hot: true
  }
};
