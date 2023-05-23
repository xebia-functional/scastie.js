const path = require("path");

module.exports = (env, argv) => {
  const isProduction = env.production || argv.mode == "production";

  const mainEntryName = isProduction ? "scastie.min" : "scastie";
  const libraryName = "scastie_js";

  const config = {
    mode: argv.mode,

    entry: {
      [mainEntryName]: ["./src/styles/vars.css", "./src/index.js"],
    },

    output: {
      path: path.resolve(__dirname, "dist"),
      filename: "[name].js",
      library: {
        name: libraryName,
        type: "umd",
        export: "default",
      },
    },

    target: "web",

    ...(!isProduction && { devtool: "eval-cheap-source-map" }),

    module: {
      rules: [
        {
          test: /\.css$/,
          use: [
            "style-loader",
            {
              loader: "css-loader",
              options: {
                importLoaders: 1,
                modules: {
                  exportLocalsConvention: "camelCaseOnly",
                  localIdentHashFunction: "xxhash64",
                  localIdentName: isProduction
                    ? "scastie-[hash:base64:5]"
                    : "[path][name]__[local]",
                },
              },
            },
          ],
          include: /\.module\.css$/,
        },
        {
          test: /\.css$/,
          use: ["style-loader", "css-loader"],
          exclude: /\.module\.css$/,
        },
      ],
    },

    plugins: [],

    devServer: {
      hot: false, // Further code logic changes are needed for this to work properly
      static: {
        directory: path.join(__dirname, "demo"),
      },
    },
  };

  return config;
};
