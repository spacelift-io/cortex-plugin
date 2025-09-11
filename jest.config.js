// jest.config.js
module.exports = {
  moduleNameMapper: {
    "\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$":
      "<rootDir>/__mocks__/fileMock.js",
    "\\.(css|less|scss|sass)$": "<rootDir>/__mocks__/styleMock.js",
    "^style-inject$": "<rootDir>/__mocks__/styleInjectMock.js",
    "@cortexapps/plugin-core/components":
      "<rootDir>/node_modules/@cortexapps/plugin-core/dist/components.cjs.js",
    "@cortexapps/plugin-core":
      "<rootDir>/node_modules/@cortexapps/plugin-core/dist/index.cjs.js",
    "@cortexapps/react-plugin-ui":
      "<rootDir>/node_modules/@cortexapps/react-plugin-ui/dist/index.js",
  },
  setupFilesAfterEnv: ["<rootDir>/src/setupTests.ts"],
  testEnvironment: "jsdom",
  transformIgnorePatterns: [
    // transform files from @cortexapps/react-plugin-ui and uuid because they are ESM
    "/node_modules/(?!(?:@cortexapps/react-plugin-ui|uuid)/)",
  ],
  transform: {
    "^.+\\.[tj]sx?$": "babel-jest",
  },
};