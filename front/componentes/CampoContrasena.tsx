"use client";

import { useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff, RefreshCw } from "lucide-react";
import { usarAplicacion } from "./proveedores";

const grupos = {
  minusculas: "abcdefghijkmnopqrstuvwxyz",
  mayusculas: "ABCDEFGHJKLMNPQRSTUVWXYZ",
  numeros: "23456789",
  simbolos: "!@#$%_-",
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
export function generarContrasenaSegura(longitud = 16) {
  const tamano = Math.max(12, longitud);
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
  const { idioma } = usarAplicacion();
  const [visible, establecerVisible] = useState(false);
  const etiqueta = visible
    ? idioma === "es"
      ? "Ocultar clave"
      : "Hide secret"
    : idioma === "es"
      ? "Mostrar clave"
      : "Show secret";
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
        aria-label={etiqueta}
        title={etiqueta}
      >
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}

export function BotonGenerarContrasena({
  alGenerar,
  texto,
  dataCapacitacion,
}: {
  alGenerar: (contrasena: string) => void;
  texto?: string;
  dataCapacitacion?: string;
}) {
  const { idioma } = usarAplicacion();
  return (
    <button
      type="button"
      className="boton-secundario"
      data-capacitacion={dataCapacitacion}
      onClick={() => alGenerar(generarContrasenaSegura())}
    >
      <RefreshCw aria-hidden size={16} />{" "}
      {texto ??
        (idioma === "es"
          ? "Generar contraseña segura"
          : "Generate secure password")}
    </button>
  );
}

export function RequisitosContrasena({ valor }: { valor: string }) {
  const { idioma } = usarAplicacion();
  const es = idioma === "es";
  return (
    <div
      className="grid gap-1 text-xs leading-5 text-slate-500 sm:grid-cols-2"
      aria-live="polite"
    >
      <span
        className={valor.length >= 12 ? "font-semibold text-emerald-600" : ""}
      >
        {valor.length >= 12 ? "✓" : "○"}{" "}
        {es ? "Mínimo 12 caracteres" : "At least 12 characters"}
      </span>
      <span
        className={
          /[a-z]/.test(valor) && /[A-Z]/.test(valor) && /\d/.test(valor)
            ? "font-semibold text-emerald-600"
            : ""
        }
      >
        {/[a-z]/.test(valor) && /[A-Z]/.test(valor) && /\d/.test(valor)
          ? "✓"
          : "○"}{" "}
        {es
          ? "Recomendado: letras y números"
          : "Recommended: letters and numbers"}
      </span>
    </div>
  );
}
