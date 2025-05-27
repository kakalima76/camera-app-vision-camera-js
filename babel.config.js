module.exports = function (api) {
  api.cache(true); // Você pode ter duas chamadas a api.cache(true), mas uma é suficiente.
  return {
    presets: [
      [
        "babel-preset-expo",
        {
          jsxImportSource: "nativewind",
        },
      ],
      "nativewind/babel",
    ],
    plugins: [
      // A vírgula foi removida daqui!
      ["react-native-worklets-core/plugin"],
      [
        "module-resolver",
        {
          root: ["./"],
          alias: {
            "@": "./",
            "tailwind.config": "./tailwind.config.js",
          },
        },
      ],
      "react-native-reanimated/plugin",
    ],
  };
};
