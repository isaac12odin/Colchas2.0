import { getRandomBytesAsync } from "expo-crypto";

const MAYUSCULAS = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const MINUSCULAS = "abcdefghijkmnopqrstuvwxyz";
const NUMEROS = "23456789";
const SIMBOLOS = "!@#$%*-_=+";
const TODOS = `${MAYUSCULAS}${MINUSCULAS}${NUMEROS}${SIMBOLOS}`;

function caracter(alfabeto: string, byte: number) {
  return alfabeto[byte % alfabeto.length];
}

/**
 * Construye una clave de 20 caracteres con entropía del sistema operativo.
 * Se evita I/l/1/O/0 para que también sea fácil dictarla o capturarla.
 */
export async function generarContrasenaSegura() {
  const longitud = 20;
  const aleatorios = await getRandomBytesAsync(longitud * 2);
  const caracteres = [
    caracter(MAYUSCULAS, aleatorios[0]),
    caracter(MINUSCULAS, aleatorios[1]),
    caracter(NUMEROS, aleatorios[2]),
    caracter(SIMBOLOS, aleatorios[3]),
    ...Array.from({ length: longitud - 4 }, (_, indice) =>
      caracter(TODOS, aleatorios[indice + 4]),
    ),
  ];

  for (let indice = caracteres.length - 1; indice > 0; indice -= 1) {
    const destino = aleatorios[longitud + indice] % (indice + 1);
    [caracteres[indice], caracteres[destino]] = [
      caracteres[destino],
      caracteres[indice],
    ];
  }
  return caracteres.join("");
}
