import type { ConfigContext, ExpoConfig } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => {
  const e2eSqlCipher = process.env.EXPO_PUBLIC_E2E_SQLCIPHER === "SI";
  const buildAndroidOptimizado =
    process.env.VEKTRA_ANDROID_BUILD_OPTIMIZADO === "SI";
  const arquitecturasAndroid =
    process.env.VEKTRA_ANDROID_ARQUITECTURAS ??
    "armeabi-v7a,arm64-v8a,x86,x86_64";
  return {
    ...config,
    name: e2eSqlCipher ? "Vektra SQLCipher E2E" : (config.name ?? "Vektra"),
    slug: config.slug ?? "vektra",
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
    plugins: [
      ...(config.plugins ?? []),
      [
        "./plugins/withVektraAndroidRelease.cjs",
        {
          arquitecturas: arquitecturasAndroid,
          buildOptimizado: buildAndroidOptimizado,
        },
      ],
    ],
    experiments: {
      ...config.experiments,
      typedRoutes: !e2eSqlCipher,
    },
  };
};
