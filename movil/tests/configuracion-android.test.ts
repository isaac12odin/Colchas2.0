import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const configuracionExpo = JSON.parse(
  readFileSync(new URL("../app.json", import.meta.url), "utf8"),
).expo;
const plugin = require("../plugins/withVektraAndroidRelease.cjs") as {
  _pruebas: {
    actualizarGradleProperties: (
      propiedades: Array<
        | { type: "property"; key: string; value: string }
        | { type: "comment"; value: string }
      >,
      opciones: { arquitecturas: string; buildOptimizado: boolean },
    ) => Array<
      | { type: "property"; key: string; value: string }
      | { type: "comment"; value: string }
    >;
    agregarFirmaRelease: (contenido: string) => string;
    agregarIdiomasDeRecursos: (contenido: string) => string;
    crearManifestRelease: (contenido?: string) => string;
    normalizarArquitecturas: (valor: string) => string;
  };
};

const {
  actualizarGradleProperties,
  agregarFirmaRelease,
  agregarIdiomasDeRecursos,
  crearManifestRelease,
  normalizarArquitecturas,
} = plugin._pruebas;

function valorDe(
  propiedades: ReturnType<typeof actualizarGradleProperties>,
  clave: string,
) {
  return propiedades.find(
    (propiedad) => propiedad.type === "property" && propiedad.key === clave,
  );
}

describe("configuración Android reproducible", () => {
  it("versiona la entrega y permite responder a teléfono, tablet y paisaje", () => {
    expect(configuracionExpo.version).toBe("1.1.0");
    expect(configuracionExpo.android.versionCode).toBe(3);
    expect(configuracionExpo.orientation).toBe("default");
    expect(configuracionExpo.android.softwareKeyboardLayoutMode).toBe("resize");
  });

  it("genera el APK directo únicamente para arm64 y activa optimizaciones", () => {
    const propiedades = actualizarGradleProperties(
      [
        {
          type: "property",
          key: "reactNativeArchitectures",
          value: "x86_64",
        },
      ],
      { arquitecturas: "arm64-v8a", buildOptimizado: true },
    );

    expect(valorDe(propiedades, "reactNativeArchitectures")).toMatchObject({
      value: "arm64-v8a",
    });
    expect(
      valorDe(propiedades, "android.enableMinifyInReleaseBuilds"),
    ).toMatchObject({ value: "true" });
    expect(
      valorDe(propiedades, "android.enableShrinkResourcesInReleaseBuilds"),
    ).toMatchObject({ value: "true" });
    expect(valorDe(propiedades, "expo.useLegacyPackaging")).toMatchObject({
      value: "true",
    });
    expect(valorDe(propiedades, "expo.gif.enabled")).toMatchObject({
      value: "false",
    });
    expect(
      valorDe(propiedades, "EX_DEV_CLIENT_NETWORK_INSPECTOR"),
    ).toMatchObject({ value: "false" });
  });

  it("rechaza arquitecturas desconocidas en vez de producir un binario ambiguo", () => {
    expect(() => normalizarArquitecturas("arm64-v8a,mips")).toThrow("mips");
  });

  it("limita recursos a español e inglés de forma idempotente", () => {
    const gradle = "android {\n    defaultConfig {\n    }\n}\n";
    const unaVez = agregarIdiomasDeRecursos(gradle);
    const dosVeces = agregarIdiomasDeRecursos(unaVez);

    expect(unaVez).toContain('resourceConfigurations += ["es", "en"]');
    expect(dosVeces.match(/resourceConfigurations/g)).toHaveLength(1);
  });

  it("exige una firma release externa y nunca reutiliza la llave de depuración", () => {
    const gradle = [
      "android {",
      "    signingConfigs {",
      "        debug { }",
      "    }",
      "    buildTypes {",
      "        debug { signingConfig signingConfigs.debug }",
      "        release { signingConfig signingConfigs.debug }",
      "    }",
      "}",
    ].join("\n");
    const unaVez = agregarFirmaRelease(gradle);
    const dosVeces = agregarFirmaRelease(unaVez);

    expect(unaVez).toContain("VEKTRA_KEYSTORE_FILE");
    expect(unaVez).toMatch(
      /buildTypes\s*\{[\s\S]*?debug\s*\{\s*signingConfig signingConfigs\.debug\s*\}[\s\S]*?release\s*\{\s*signingConfig signingConfigs\.release/,
    );
    expect(unaVez).toContain("System.getenv('EAS_BUILD')");
    expect(unaVez).toContain("throw new GradleException");
    expect(dosVeces.match(/vektra-firma-release-android/g)).toHaveLength(2);
    expect(dosVeces.match(/def vektraKeystoreFile/g)).toHaveLength(1);
  });

  it("bloquea SYSTEM_ALERT_WINDOW sólo mediante el manifiesto release", () => {
    const nuevo = crearManifestRelease();
    const existente = crearManifestRelease(
      '<?xml version="1.0"?><manifest xmlns:android="http://schemas.android.com/apk/res/android"><application/></manifest>',
    );

    for (const manifest of [nuevo, existente]) {
      expect(manifest).toContain("android.permission.SYSTEM_ALERT_WINDOW");
      expect(manifest).toContain('tools:node="remove"');
      expect(manifest).toContain("xmlns:tools=");
    }
  });
});
