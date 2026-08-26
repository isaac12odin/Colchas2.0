export type FasePaso = "EJEMPLO" | "ACTUAR" | "COMPLETADO";
export const SELECTOR_CONTROL =
  "button, a[href], input, select, textarea, summary, [role='button'], [role='option']";

export function esVisible(elemento: HTMLElement) {
  const estilo = window.getComputedStyle(elemento);
  return (
    elemento.getClientRects().length > 0 &&
    estilo.visibility !== "hidden" &&
    estilo.display !== "none"
  );
}

export function objetivosVisibles(clave: string) {
  return [
    ...document.querySelectorAll<HTMLElement>(
      `[data-capacitacion="${CSS.escape(clave)}"]`,
    ),
  ].filter(esVisible);
}

export function clavePermitidaDesde(
  elemento: HTMLElement,
  permitidas: ReadonlySet<string>,
) {
  let actual: HTMLElement | null = elemento;
  while (actual && !actual.matches("[data-capacitacion-entrenador]")) {
    const clave = actual.dataset.capacitacion;
    if (clave && permitidas.has(clave)) return clave;
    actual = actual.parentElement;
  }
  return null;
}

export function valorValido(elemento: HTMLElement) {
  if (elemento instanceof HTMLInputElement) {
    if (elemento.type === "file") return Boolean(elemento.files?.length);
    if (elemento.type === "checkbox" || elemento.type === "radio")
      return elemento.checked;
    return elemento.value.trim().length > 0 && elemento.checkValidity();
  }
  if (elemento instanceof HTMLSelectElement)
    return elemento.value.trim().length > 0 && elemento.checkValidity();
  if (elemento instanceof HTMLTextAreaElement)
    return elemento.value.trim().length > 0 && elemento.checkValidity();
  return true;
}

export function describirControl(elemento: HTMLElement) {
  const campo = elemento as HTMLInputElement | HTMLSelectElement;
  return [
    elemento.dataset.capacitacion,
    elemento.getAttribute("aria-label"),
    elemento.textContent,
    "value" in campo ? campo.value : "",
  ]
    .filter(Boolean)
    .join(" · ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
}

export function limpiarMarcas() {
  document
    .querySelectorAll<HTMLElement>("[data-capacitacion-bloqueado]")
    .forEach((elemento) => {
      const tabindex = elemento.dataset.capacitacionTabindexAnterior;
      const aria = elemento.dataset.capacitacionAriaAnterior;
      if (tabindex === "__sin_atributo__") elemento.removeAttribute("tabindex");
      else if (tabindex !== undefined)
        elemento.setAttribute("tabindex", tabindex);
      if (aria === "__sin_atributo__")
        elemento.removeAttribute("aria-disabled");
      else if (aria !== undefined) elemento.setAttribute("aria-disabled", aria);
      delete elemento.dataset.capacitacionTabindexAnterior;
      delete elemento.dataset.capacitacionAriaAnterior;
      delete elemento.dataset.capacitacionBloqueado;
    });
  document
    .querySelectorAll<HTMLElement>("[data-capacitacion-objetivo]")
    .forEach((elemento) => delete elemento.dataset.capacitacionObjetivo);
  document
    .querySelectorAll<HTMLElement>("[data-capacitacion-auxiliar]")
    .forEach((elemento) => delete elemento.dataset.capacitacionAuxiliar);
}

export function rutaConPractica(href: string, leccionId: string) {
  const destino = new URL(href, window.location.href);
  if (destino.origin !== window.location.origin) return null;
  destino.searchParams.set("practica", leccionId);
  return `${destino.pathname}${destino.search}${destino.hash}`;
}

export function coincideRutaMutacion(patron: string, ruta: string) {
  const segmentosPatron = patron.split("/");
  const segmentosRuta = ruta.split("?")[0].split("/");
  return (
    segmentosPatron.length === segmentosRuta.length &&
    segmentosPatron.every(
      (segmento, indice) =>
        (segmento.startsWith(":") && Boolean(segmentosRuta[indice])) ||
        segmento === segmentosRuta[indice],
    )
  );
}

export function parametroRuta(patron: string, ruta: string, nombre: string) {
  const segmentosPatron = patron.split("/");
  const segmentosRuta = ruta.split("?")[0].split("/");
  const indice = segmentosPatron.indexOf(`:${nombre}`);
  return indice >= 0 ? segmentosRuta[indice] : undefined;
}
