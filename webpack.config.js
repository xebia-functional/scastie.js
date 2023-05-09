const path = require('path');

module.exports = (params = {}) => {
  const isProduction = params.production;
  const env = isProduction ? 'production' : 'development';
  const mainEntryName = isProduction ? 'scastie.min' : 'scastie';
  const libraryName = 'scastie_js';

  const config = {
    mode: env,

    entry: {
      [mainEntryName]: ['./src/index'],
    },

    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: '[name].js',
      library: {
        name: libraryName,
        type: 'umd',
        export: 'default',
      },
    },

    devtool: 'source-map',

    plugins: [],

    devServer: {
      static: {
        directory: path.join(__dirname, 'demo'),
      },
    }
  };

  return config;
};