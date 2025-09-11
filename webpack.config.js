const HtmlWebpackPlugin = require("html-webpack-plugin");
const InlineChunkHtmlPlugin = require("react-dev-utils/InlineChunkHtmlPlugin");
const TerserPlugin = require("terser-webpack-plugin");
const webpack = require("webpack");
const path = require("path");

module.exports = (env, argv) => ({
  mode: argv.mode === "production" ? "production" : "development",

  entry: {
    ui: "./src/index.tsx", // The entry point for your UI plugin
  },

  module: {
    rules: [
      // Converts TypeScript code to JavaScript
      {
        test: /\.tsx?$/,
        use: {
          loader: "ts-loader",
          options: {
            transpileOnly: true,
          },
        },
        exclude: /node_modules/,
      },

      // Enables including CSS by doing "import './file.css'" in your TypeScript code
      {
        test: /\.css$/,
        use: [
          "style-loader",
          "css-loader",
          {
            loader: "postcss-loader",
            options: {
              postcssOptions: {
                plugins: [
                  [
                    "postcss-preset-env",
                    {
                      // Options
                    },
                  ],
                ],
              },
            },
          },
        ],
      },

      // Allows you to use "<%= require('./file.png') %>" in your HTML code to get a data URI
      { test: /\.(png|jpg|gif|webp)$/, loader: "url-loader" },

      // Allows you to use import { ReactComponent as Logo } from "./logo.svg" to import SVGs as React components
      {
        test: /\.svg$/i,
        issuer: /\.[jt]sx?$/, // only apply to JS/TS imports
        use: [
          {
            loader: "@svgr/webpack",
            options: {
              // svgr options if you need any
              // e.g. icon: true,
            },
          },
          {
            loader: "url-loader",
            options: {
              limit: 8192,
              name: "[name].[hash:8].[ext]",
            },
          },
        ],
      },
    ],
  },

  // minify the code
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          output: {
            // make sure emojis don't get mangled 🙂
            ascii_only: true,
          },
        },
      }),
    ],
    usedExports: true,
  },

  // Webpack tries these extensions for you if you omit the extension, like "import './file'"
  resolve: { extensions: [".tsx", ".ts", ".jsx", ".js"] },

  output: {
    filename: "[name].js",
    path: path.resolve(__dirname, "dist"), // Compile into a folder named "dist"
    publicPath: "",
  },

  // Tells Webpack to generate "ui.html" and to inline "ui.ts" into it
  plugins: [
    new HtmlWebpackPlugin({
      template: "./src/index.html",
      filename: "ui.html",
      chunks: ["ui"],
      cache: false,
    }),
    new InlineChunkHtmlPlugin(HtmlWebpackPlugin, [/ui/]),
    new webpack.DefinePlugin({
      'process.env': {
        // Only include environment variables we actually need
        'SPACELIFT_ENDPOINT': JSON.stringify(process.env.SPACELIFT_ENDPOINT), // For dev mode only
        'SPACELIFT_API_KEY_ID': JSON.stringify(process.env.SPACELIFT_API_KEY_ID), // For dev mode only
        'SPACELIFT_API_KEY_SECRET': JSON.stringify(process.env.SPACELIFT_API_KEY_SECRET), // For dev mode only
        'SPACELIFT_AUTH_LAMBDA_URL': JSON.stringify(process.env.SPACELIFT_AUTH_LAMBDA_URL), // For production mode
        'NODE_ENV': JSON.stringify(process.env.NODE_ENV || (argv.mode === "production" ? "production" : "development")),
      }
    }),
  ],

  devServer: {
    compress: true,
    port: 9000,
    static: {
      directory: path.join(__dirname, "dist"),
    },
  },
});