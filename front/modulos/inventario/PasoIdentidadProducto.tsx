import { useState } from "react";

import { CampoFotoProducto } from "./CampoFotoProducto";
import type { ControlFormularioProducto } from "./usarFormularioProducto";
import type { CategoriaProducto, ProductoInventario } from "./tipos";
import { urlFotoProducto } from "./tipos";

export function PasoIdentidadProducto({
  control,
  producto,
  marcas,
  categorias,
  alCrearCategoria,
  es,
}: {
  control: ControlFormularioProducto;
  producto?: ProductoInventario | null;
  marcas: string[];
  categorias: CategoriaProducto[];
  alCrearCategoria: (nombre: string) => Promise<CategoriaProducto | null>;
  es: boolean;
}) {
  const campo = (
    nombre: keyof typeof control.valores,
    capacitacion: string,
    etiqueta: string,
    requerido = false,
    placeholder?: string,
    lista?: string,
  ) => (
    <label>
      <span className="etiqueta">{etiqueta}</span>
      <input
        className="campo"
        value={control.valores[nombre]}
        onChange={(evento) => control.cambiar(nombre, evento.target.value)}
        required={requerido}
        placeholder={placeholder}
        list={lista}
        data-capacitacion={capacitacion}
      />
    </label>
  );

  return (
    <section className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2 rounded-xl bg-slate-50 p-4 text-sm leading-6 dark:bg-slate-950">
        <strong className="block">
          {es ? "Primero identifica el artículo" : "First identify the item"}
        </strong>
        {es
          ? "Elige la agrupación del catálogo y captura la marca. Ejemplo: Agrupación “Colcha” · Marca “Nube Hogar”."
          : "Choose a catalog group and enter the brand."}
      </div>
      <div className="sm:col-span-2">
        <CampoFotoProducto
          fotoActual={producto ? urlFotoProducto(producto) : null}
          es={es}
          alCambiar={control.establecerCambioFoto}
        />
      </div>
      {campo(
        "nombre",
        "inventario.producto.nombre",
        es ? "Nombre del producto" : "Product name",
        true,
        es ? "Ej. Colcha matrimonial reversible" : "E.g. Reversible bedspread",
      )}
      <label>
        <span className="etiqueta">
          {es ? "Agrupación del catálogo" : "Catalog group"}
        </span>
        <select
          className="campo"
          value={control.valores.categoriaId}
          onChange={(evento) =>
            control.cambiar("categoriaId", evento.target.value)
          }
          required
          data-capacitacion="inventario.producto.categoria"
        >
          <option value="">
            {es ? "Selecciona: Colcha, Sábana…" : "Select a group"}
          </option>
          {categorias.map((categoria) => (
            <option key={categoria.id} value={categoria.id}>
              {categoria.nombre}
            </option>
          ))}
        </select>
        <NuevaCategoria
          es={es}
          alCrear={alCrearCategoria}
          alElegir={(id) => control.cambiar("categoriaId", id)}
        />
      </label>
      {campo(
        "marca",
        "inventario.producto.marca",
        es ? "Marca" : "Brand",
        true,
        es ? "Elige una existente o escribe una nueva" : "Choose or type",
        "marcas-producto",
      )}
      {campo("sku", "inventario.producto.sku", "SKU", true, "COL-MAT-01")}
      {campo(
        "codigoBarras",
        "inventario.producto.codigo-barras",
        es ? "Código de barras (opcional)" : "Barcode (optional)",
      )}
      {campo(
        "codigoQr",
        "inventario.producto.codigo-qr",
        es ? "Código QR (opcional)" : "QR code (optional)",
      )}
      <datalist id="marcas-producto">
        {marcas.map((marca) => (
          <option key={marca} value={marca} />
        ))}
      </datalist>
    </section>
  );
}

function NuevaCategoria({
  es,
  alCrear,
  alElegir,
}: {
  es: boolean;
  alCrear: (nombre: string) => Promise<CategoriaProducto | null>;
  alElegir: (id: string) => void;
}) {
  const [nombre, establecerNombre] = useState("");
  const [creando, establecerCreando] = useState(false);

  return (
    <div className="mt-2 flex gap-2">
      <input
        className="campo"
        value={nombre}
        onChange={(evento) => establecerNombre(evento.target.value)}
        placeholder={es ? "Nueva agrupación" : "New group"}
        aria-label={es ? "Nueva agrupación" : "New group"}
      />
      <button
        type="button"
        className="boton-secundario shrink-0"
        disabled={creando || nombre.trim().length < 2}
        onClick={async () => {
          establecerCreando(true);
          const creada = await alCrear(nombre.trim());
          establecerCreando(false);
          if (!creada) return;
          alElegir(creada.id);
          establecerNombre("");
        }}
      >
        {creando ? (es ? "Creando…" : "Creating…") : es ? "Agregar" : "Add"}
      </button>
    </div>
  );
}
