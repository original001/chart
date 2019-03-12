module.exports = {
  transform: {
    ".+\\.(tsx|ts)": "ts-jest"
  },
  testRegex: "(/__tests__/.*ests?)\\.(ts|tsx|js)$",
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
  moduleNameMapper: {
    "\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$":
      "<rootDir>/__mocks__/fileMock.ts",
    "\\.(css|less)$": "identity-obj-proxy",
  },
  modulePaths: ["<rootDir>/node_modules"],
};
