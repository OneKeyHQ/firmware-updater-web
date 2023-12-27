const path = require('path');

module.exports = {
  devtool: 'source-map',
  mode: 'production',
  target: 'electron-main',
  entry: {
    main: path.join(__dirname, '../main/main.ts'),
    preload: path.join(__dirname, '../main/preload.ts'),
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  output: {
    path: path.join(__dirname, '../dist/'),
    filename: '[name].js',
    library: {
      type: 'umd',
    },
  },
  node: {
    __dirname: false,
    __filename: false,
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
};
