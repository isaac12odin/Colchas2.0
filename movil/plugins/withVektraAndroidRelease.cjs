const fs = require("node:fs/promises");
const path = require("node:path");

const {
  createRunOncePlugin,
  withAppBuildGradle,
  withDangerousMod,
  withGradleProperties,
} = require("@expo/config-plugins");
const {
  mergeContents,
} = require("@expo/config-plugins/build/utils/generateCode");

const NOMBRE_PLUGIN = "with-vektra-android-release";
const VERSION_PLUGIN = "1.0.0";
const ARQUITECTURAS_PERMITIDAS = new Set([
  "armeabi-v7a",
  "arm64-v8a",
  "x86",
  "x86_64",
]);
const ARQUITECTURAS_UNIVERSALES = ["armeabi-v7a", "arm64-v8a", "x86", "x86_64"];
const PROPIEDADES_RELEASE = {
  "android.enableBundleCompression": "true",
  "android.enableMinifyInReleaseBuilds": "true",
  "android.enableShrinkResourcesInReleaseBuilds": "true",
  "expo.gif.enabled": "false",
  "expo.useLegacyPackaging": "true",
  "expo.webp.animated": "false",
  "expo.webp.enabled": "true",
};

function normalizarArquitecturas(valor) {
  const entradas = Array.isArray(valor)
    ? valor
    : String(valor || ARQUITECTURAS_UNIVERSALES.join(",")).split(",");
  const arquitecturas = [
    ...new Set(entradas.map((entrada) => entrada.trim()).filter(Boolean)),
  ];
  const invalidas = arquitecturas.filter(
    (arquitectura) => !ARQUITECTURAS_PERMITIDAS.has(arquitectura),
  );

  if (arquitecturas.length === 0 || invalidas.length > 0) {
    throw new Error(
      `Arquitecturas Android inválidas: ${invalidas.join(", ") || "ninguna"}.`,
    );
  }

  return arquitecturas.join(",");
}

function establecerPropiedad(propiedades, clave, valor) {
  const restantes = propiedades.filter(
    (propiedad) => !(propiedad.type === "property" && propiedad.key === clave),
  );
  restantes.push({ type: "property", key: clave, value: valor });
  return restantes;
}

function actualizarGradleProperties(
  propiedades,
  { arquitecturas, buildOptimizado },
) {
  let resultado = propiedades;
  const valores = {
    ...PROPIEDADES_RELEASE,
    EX_DEV_CLIENT_NETWORK_INSPECTOR: buildOptimizado ? "false" : "true",
    reactNativeArchitectures: normalizarArquitecturas(arquitecturas),
  };

  for (const [clave, valor] of Object.entries(valores)) {
    resultado = establecerPropiedad(resultado, clave, valor);
  }

  return resultado;
}

function agregarIdiomasDeRecursos(contenido) {
  return mergeContents({
    src: contenido,
    newSrc: '        resourceConfigurations += ["es", "en"]',
    tag: "vektra-idiomas-android",
    anchor: /defaultConfig\s*\{/,
    offset: 1,
    comment: "//",
  }).contents;
}

function agregarFirmaRelease(contenido) {
  let resultado = mergeContents({
    src: contenido,
    newSrc: [
      "def vektraKeystoreFile = System.getenv('VEKTRA_KEYSTORE_FILE')",
      "def vektraStorePassword = System.getenv('VEKTRA_STORE_PASSWORD')",
      "def vektraKeyAlias = System.getenv('VEKTRA_KEY_ALIAS') ?: 'vektra-release'",
    ].join("\n"),
    tag: "vektra-credenciales-firma-android",
    anchor: /android\s*\{/,
    offset: 0,
    comment: "//",
  }).contents;

  resultado = mergeContents({
    src: resultado,
    newSrc: [
      "        release {",
      "            if (System.getenv('EAS_BUILD')) {",
      "                // EAS Build inyecta credentials.json después del prebuild.",
      "            } else {",
      "                if (!vektraKeystoreFile || !vektraStorePassword) {",
      "                    throw new GradleException('La firma release de Vektra requiere VEKTRA_KEYSTORE_FILE y VEKTRA_STORE_PASSWORD.')",
      "                }",
      "                storeFile file(vektraKeystoreFile)",
      "                storePassword vektraStorePassword",
      "                keyAlias vektraKeyAlias",
      "                keyPassword vektraStorePassword",
      "            }",
      "        }",
    ].join("\n"),
    tag: "vektra-firma-release-android",
    anchor: /signingConfigs\s*\{/,
    offset: 1,
    comment: "//",
  }).contents;

  return resultado.replace(
    /(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?)signingConfig signingConfigs\.debug/,
    "$1signingConfig signingConfigs.release",
  );
}

function crearManifestRelease(contenidoActual = "") {
  const permiso =
    '  <uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" tools:node="remove"/>';
  let contenido = contenidoActual.trim();

  if (!contenido) {
    return [
      '<?xml version="1.0" encoding="utf-8"?>',
      '<manifest xmlns:android="http://schemas.android.com/apk/res/android"',
      '  xmlns:tools="http://schemas.android.com/tools">',
      permiso,
      "</manifest>",
      "",
    ].join("\n");
  }

  if (!contenido.includes("xmlns:tools=")) {
    contenido = contenido.replace(
      /<manifest\b/,
      '<manifest xmlns:tools="http://schemas.android.com/tools"',
    );
  }

  const patronPermiso =
    /\s*<uses-permission\b[^>]*android\.permission\.SYSTEM_ALERT_WINDOW[^>]*\/?>(?:\s*<\/uses-permission>)?/m;
  if (patronPermiso.test(contenido)) {
    contenido = contenido.replace(patronPermiso, `\n${permiso}`);
  } else {
    contenido = contenido.replace(
      /<\/manifest>\s*$/,
      `${permiso}\n</manifest>`,
    );
  }

  return `${contenido.trim()}\n`;
}

function withVektraAndroidRelease(config, opciones = {}) {
  const arquitecturas = normalizarArquitecturas(opciones.arquitecturas);
  const buildOptimizado = opciones.buildOptimizado === true;

  config = withGradleProperties(config, (configuracion) => {
    configuracion.modResults = actualizarGradleProperties(
      configuracion.modResults,
      { arquitecturas, buildOptimizado },
    );
    return configuracion;
  });

  config = withAppBuildGradle(config, (configuracion) => {
    if (configuracion.modResults.language !== "groovy") {
      throw new Error(
        `${NOMBRE_PLUGIN} requiere android/app/build.gradle en Groovy.`,
      );
    }
    configuracion.modResults.contents = agregarFirmaRelease(
      agregarIdiomasDeRecursos(configuracion.modResults.contents),
    );
    return configuracion;
  });

  config = withDangerousMod(config, [
    "android",
    async (configuracion) => {
      if (configuracion.modRequest.introspect) return configuracion;

      const rutaManifest = path.join(
        configuracion.modRequest.platformProjectRoot,
        "app",
        "src",
        "release",
        "AndroidManifest.xml",
      );
      let contenidoActual = "";
      try {
        contenidoActual = await fs.readFile(rutaManifest, "utf8");
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
      }

      await fs.mkdir(path.dirname(rutaManifest), { recursive: true });
      await fs.writeFile(
        rutaManifest,
        crearManifestRelease(contenidoActual),
        "utf8",
      );
      return configuracion;
    },
  ]);

  return config;
}

const plugin = createRunOncePlugin(
  withVektraAndroidRelease,
  NOMBRE_PLUGIN,
  VERSION_PLUGIN,
);

plugin._pruebas = {
  actualizarGradleProperties,
  agregarFirmaRelease,
  agregarIdiomasDeRecursos,
  crearManifestRelease,
  normalizarArquitecturas,
};

module.exports = plugin;
