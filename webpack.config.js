/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

//@ts-check

'use strict';

const path = require('path');
const copyWebpackPlugin = require('copy-webpack-plugin');

/**@type {import('webpack').Configuration}*/
const config = {
    target: 'node', // vscode extensions run in a Node.js-context 📖 -> https://webpack.js.org/configuration/node/

    entry: './src/extension.ts', // the entry point of this extension, 📖 -> https://webpack.js.org/configuration/entry-context/
    output: { // the bundle is stored in the 'dist' folder (check package.json), 📖 -> https://webpack.js.org/configuration/output/
        path: path.resolve(__dirname, 'dist'),
        filename: 'extension.js',
        libraryTarget: "commonjs2",
        devtoolModuleFilenameTemplate: "../[resource-path]",
    },
    devtool: 'source-map',
    externals: {
        vscode: "commonjs vscode", // the vscode-module is created on-the-fly and must be excluded. Add other modules that cannot be webpack'ed, 📖 -> https://webpack.js.org/configuration/externals/
        cesium: "./external/cesium"
    },
    resolve: { // support reading TypeScript and JavaScript files, 📖 -> https://github.com/TypeStrong/ts-loader
        extensions: ['.ts', '.js']
    },
    plugins: [
        new copyWebpackPlugin({
            patterns: [
                { from: 'node_modules/cesium/Build/Cesium/Workers', to: 'external/cesium/Build/Cesium/Workers' },
                { from: 'node_modules/cesium/Build/Cesium/Cesium.js', to: 'external/cesium/Build/Cesium/Cesium.js' },
                { from: 'node_modules/cesium/Build/package.json', to: 'external/cesium/Build/Cesium/package.json' },
                { from: 'node_modules/cesium/package.json', to: 'external/cesium/package.json' },
                { from: 'external/index.cjs', to: 'external/cesium/index.cjs' },
            ],
        })
    ],
    module: {
        rules: [{
            test: /\.ts$/,
            exclude: /node_modules/,
            use: [{
                loader: 'ts-loader',
            },]
        }]
    }
}

module.exports = config;