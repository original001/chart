const babelOptions = {
  presets: [
    require.resolve("babel-preset-env"),
    require.resolve("babel-preset-stage-2"),
    require.resolve("babel-preset-react"),
  ],
};
// смысл в том, чтобы конфиг указать здесь, а не в файле babelrc. если указать глобально, то для transform-а модулей
// из цементовской папки оно не найдет babelrc
module.exports = require("babel-jest").createTransformer(babelOptions);
