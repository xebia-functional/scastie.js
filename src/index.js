import scastie_js from './scastie.js';

// This snippet is needed for dev purposes, enabling Hot Module Replacement:
// https://webpack.js.org/concepts/hot-module-replacement
// It won't be included in the bundled code
if (module.hot) {
  module.hot.accept("./scastie.js", function () {
    scastie_js(globalThis.scastieConfig);
  })
}

export default scastie_js;
