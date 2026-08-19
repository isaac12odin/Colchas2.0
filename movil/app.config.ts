import type { ConfigContext, ExpoConfig } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => {
  const e2eSqlCipher = process.env.EXPO_PUBLIC_E2E_SQLCIPHER === "SI";
  return {
    ...config,
    name: e2eSqlCipher
      ? "Nexo SQLCipher E2E"
      : (config.name ?? "Nexo Cobranza"),
    slug: config.slug ?? "nexo-cobranza",
    ios: {
      ...config.ios,
      bundleIdentifier: e2eSqlCipher
        ? "com.nexo.cobranza.e2e"
        : "com.nexo.cobranza",
    },
    android: {
      ...config.android,
      package: e2eSqlCipher ? "com.nexo.cobranza.e2e" : "com.nexo.cobranza",
    },
    experiments: {
      ...config.experiments,
      typedRoutes: !e2eSqlCipher,
    },
  };
};
