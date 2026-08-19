import { app } from "./app.js";
import { entorno } from "./configuracion/entorno.js";
import { prisma } from "./infraestructura/prisma.js";
import { registro } from "./infraestructura/registro.js";

const servidor = app.listen(entorno.PORT, () => {
  registro.info({ puerto: entorno.PORT }, "API de Nexo Cobranza iniciada");
});

async function cerrar(senal: string) {
  registro.info({ senal }, "Cerrando aplicacion");
  servidor.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on("SIGTERM", () => void cerrar("SIGTERM"));
process.on("SIGINT", () => void cerrar("SIGINT"));
