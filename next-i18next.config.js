module.exports = {
  i18n: {
    defaultLocale: "en",
    locales: ["de", "en", "es", "fr", "ko", "pt", "ru", "sv", "zh"],
  },
  localePath:
    typeof window === "undefined"
      ? require("path").resolve("./public/locales")
      : "/public/locales",
};
