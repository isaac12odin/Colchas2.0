"use client";

import { useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff, RefreshCw } from "lucide-react";

const grupos = {
  minusculas: "abcdefghijkmnopqrstuvwxyz",
  mayusculas: "ABCDEFGHJKLMNPQRSTUVWXYZ",
  numeros: "23456789",
};

function enteroSeguro(maximo: number) {
  const limite = Math.floor(0x1_0000_0000 / maximo) * maximo;
  const valor = new Uint32Array(1);
  do crypto.getRandomValues(valor);
  while (valor[0] >= limite);
  return valor[0] % maximo;
}

function elegir(conjunto: string) {
  return conjunto[enteroSeguro(conjunto.length)];
}

/** Genera una clave legible sin Math.random y evita caracteres ambiguos. */
export function generarContrasenaSegura(longitud = 8) {
  const tamano = Math.max(6, longitud);
  const todos = Object.values(grupos).join("");
  const caracteres = Object.values(grupos).map(elegir);
  while (caracteres.length < tamano) caracteres.push(elegir(todos));
  for (let indice = caracteres.length - 1; indice > 0; indice -= 1) {
    const destino = enteroSeguro(indice + 1);
    [caracteres[indice], caracteres[destino]] = [
      caracteres[destino],
      caracteres[indice],
    ];
  }
  return caracteres.join("");
}

export function CampoContrasena({
  className = "campo",
  ...propiedades
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const [visible, establecerVisible] = useState(false);
  return (
    <div className="relative">
      <input
        {...propiedades}
        className={`${className} pr-12`}
        type={visible ? "text" : "password"}
      />
      <button
        type="button"
        className="absolute inset-y-0 right-0 grid w-11 place-items-center text-slate-500 hover:text-blue-700"
        onClick={() => establecerVisible((actual) => !actual)}
        aria-label={visible ? "Ocultar clave" : "Mostrar clave"}
        title={visible ? "Ocultar clave" : "Mostrar clave"}
      >
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}

export function BotonGenerarContrasena({
  alGenerar,
  texto = "Generar clave segura",
  dataCapacitacion,
}: {
  alGenerar: (contrasena: string) => void;
  texto?: string;
  dataCapacitacion?: string;
}) {
  return (
    <button
      type="button"
      className="boton-secundario"
      data-capacitacion={dataCapacitacion}
      onClick={() => alGenerar(generarContrasenaSegura())}
    >
      <RefreshCw size={16} /> {texto}
    </button>
  );
}

export function RequisitosContrasena({ valor }: { valor: string }) {
  return (
    <p className="text-xs leading-5 text-slate-500">
      <span
        className={valor.length >= 6 ? "font-semibold text-emerald-600" : ""}
      >
        {valor.length >= 6 ? "✓" : "○"} Mínimo 6 caracteres
      </span>
    </p>
  );
}
