import { cp, mkdir } from "node:fs/promises";
import path from "node:path";

const raiz = process.cwd();
const destino = path.join(raiz, ".next", "standalone", "front");

// Next deja JS del servidor en standalone; Docker y esta prueba añaden los
// recursos estáticos por separado, como recomienda el modo de despliegue.
await mkdir(path.join(destino, ".next"), { recursive: true });
await cp(
  path.join(raiz, ".next", "static"),
  path.join(destino, ".next", "static"),
  {
    recursive: true,
    force: true,
  },
);
await cp(path.join(raiz, "public"), path.join(destino, "public"), {
  recursive: true,
  force: true,
});

console.log("Artefacto standalone preparado con public y .next/static.");
