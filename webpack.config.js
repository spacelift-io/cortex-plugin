const HtmlWebpackPlugin = require('html-webpack-plugin');
const Dotenv = require('dotenv-webpack');
const path = require('path');

// Load environment variables for webpack dev server configuration
require('dotenv').config();

module.exports = {
  entry: './src/index.tsx',
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
    clean: true,
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/index.html',
    }),
    new Dotenv({
      safe: false, // Don't require .env.example file
      systemvars: true, // Load system environment variables
      silent: false, // Show errors if .env file is missing
    }),
  ],
  devServer: {
    static: {
      directory: path.join(__dirname, 'dist'),
    },
    compress: true,
    port: 3000,
    proxy: [
      {
        context: ['/spacelift-api'],
        target: process.env.SPACELIFT_ENDPOINT || 'https://your-account.app.spacelift.io',
        changeOrigin: true,
        pathRewrite: {
          '^/spacelift-api': '',
        },
        onProxyReq: (proxyReq, req, res) => {
          console.log('Proxying request to Spacelift:', req.url);
        },
      },
    ],
  },
};