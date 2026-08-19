import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const alfabeto = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function generarSecretoMfa() {
  const bytes = randomBytes(20);
  let bits = "";
  for (const byte of bytes) bits += byte.toString(2).padStart(8, "0");
  let salida = "";
  for (let indice = 0; indice < bits.length; indice += 5)
    salida += alfabeto[Number.parseInt(bits.slice(indice, indice + 5).padEnd(5, "0"), 2)];
  return salida;
}

function decodificarBase32(valor: string) {
  let bits = "";
  for (const caracter of valor.replace(/=+$/g, "").toUpperCase()) {
    const indice = alfabeto.indexOf(caracter);
    if (indice < 0) throw new Error("Secreto MFA invalido");
    bits += indice.toString(2).padStart(5, "0");
  }
  const bytes: number[] = [];
  for (let indice = 0; indice + 8 <= bits.length; indice += 8)
    bytes.push(Number.parseInt(bits.slice(indice, indice + 8), 2));
  return Buffer.from(bytes);
}

export function codigoParaContador(secreto: string, contador: bigint) {
  const mensaje = Buffer.alloc(8);
  mensaje.writeBigUInt64BE(contador);
  const hash = createHmac("sha1", decodificarBase32(secreto)).update(mensaje).digest();
  const desplazamiento = hash[hash.length - 1]! & 0x0f;
  const numero =
    (((hash[desplazamiento]! & 0x7f) << 24) |
      ((hash[desplazamiento + 1]! & 0xff) << 16) |
      ((hash[desplazamiento + 2]! & 0xff) << 8) |
      (hash[desplazamiento + 3]! & 0xff)) %
    1_000_000;
  return numero.toString().padStart(6, "0");
}

export function validarCodigoMfa(
  secreto: string,
  codigo: string,
  ahora = Date.now(),
) {
  if (!/^\d{6}$/.test(codigo)) return null;
  const contadorActual = BigInt(Math.floor(ahora / 30_000));
  const recibido = Buffer.from(codigo);
  for (const diferencia of [-1n, 0n, 1n]) {
    const contador = contadorActual + diferencia;
    const esperado = Buffer.from(codigoParaContador(secreto, contador));
    if (timingSafeEqual(recibido, esperado)) return contador;
  }
  return null;
}

export function uriConfiguracionMfa(correo: string, secreto: string) {
  const etiqueta = encodeURIComponent(`Nexo Cobranza:${correo}`);
  return `otpauth://totp/${etiqueta}?secret=${secreto}&issuer=${encodeURIComponent("Nexo Cobranza")}&algorithm=SHA1&digits=6&period=30`;
}
