// 引入 @vue/cli-service 中的 defineConfig 方法
const { defineConfig } = require("@vue/cli-service");
const webpack = require("webpack");

// 使用 defineConfig 方法导出 Vue CLI 的配置对象
module.exports = defineConfig({
  // 设置 transpileDependencies 为 true，表示需要转译依赖中的 ES6+ 代码
  // 这对于使用了一些现代 JavaScript 特性的第三方库特别有用
  transpileDependencies: true,
  configureWebpack: {
    plugins: [
      new webpack.DefinePlugin({
        __VUE_OPTIONS_API__: "true",
        __VUE_PROD_DEVTOOLS__: "false",
        __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: "false",
      }),
    ],
  },
});
