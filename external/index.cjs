/*eslint-env node*/
"use strict";

const path = require("path");

// force Cesium to production

// eslint-disable-next-line global-require
module.exports = require(path.join(__dirname, "Build/Cesium/Cesium"));

