import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from "react-native";

import { crearFuenteImagenApi } from "../../api";
import {
  BotonMovil,
  CampoMovil,
  EstadoMovil,
  HojaFormulario,
  usarDisenoResponsivo,
} from "../../componentes/ui";
import { radios, tactilMinimo, type usarTema } from "../../tema";
import { CampoFotoProductoMovil } from "./CampoFotoProductoMovil";
import { EscanerCodigoProducto } from "./EscanerCodigoProducto";
import { prepararDatosProducto } from "./dominioInventario";
import {
  borradorDesdeProducto,
  type BorradorProductoMovil,
  type CategoriaProductoMovil,
  type DatosProductoMovil,
  type FotoProductoMovil,
  type ProductoInventarioMovil,
} from "./tipos";

export function ModalProductoMovil({
  visible,
  producto,
  guardando,
  es,
  tema,
  alCerrar,
  alGuardar,
  categorias,
  alCrearCategoria,
  codigoInicial,
}: {
  visible: boolean;
  producto: ProductoInventarioMovil | null;
  guardando: boolean;
  es: boolean;
  tema: ReturnType<typeof usarTema>;
  alCerrar: () => void;
  alGuardar: (datos: DatosProductoMovil) => Promise<boolean>;
  categorias: CategoriaProductoMovil[];
  codigoInicial: { valor: string; tipo: "BARRAS" | "QR" } | null;
  alCrearCategoria: (nombre: string) => Promise<CategoriaProductoMovil | null>;
}) {
  const diseno = usarDisenoResponsivo();
  const [borrador, establecerBorrador] = useState<BorradorProductoMovil>(
    borradorDesdeProducto(producto),
  );
  const [foto, establecerFoto] = useState<FotoProductoMovil | null>(null);
  const [eliminarFoto, establecerEliminarFoto] = useState(false);
  const [fuenteActual, establecerFuenteActual] =
    useState<ImageSourcePropType>();
  const [escaner, establecerEscaner] = useState<"BARRAS" | "QR" | null>(null);
  const [nuevaCategoria, establecerNuevaCategoria] = useState("");
  const [error, establecerError] = useState("");

  useEffect(() => {
    if (!visible) return;
    const siguiente = borradorDesdeProducto(producto);
    if (!producto && codigoInicial) {
      siguiente.sku = codigoInicial.valor.slice(0, 60);
      if (codigoInicial.tipo === "QR") siguiente.codigoQr = codigoInicial.valor;
      else siguiente.codigoBarras = codigoInicial.valor;
    }
    establecerBorrador(siguiente);
    establecerFoto(null);
    establecerEliminarFoto(false);
    establecerNuevaCategoria("");
    establecerError("");
  }, [codigoInicial, producto, visible]);

  useEffect(() => {
    let activa = true;
    if (!visible || !producto?.tieneFoto) {
      establecerFuenteActual(undefined);
      return;
    }
    const version = producto.fotoActualizadaEn
      ? `?v=${encodeURIComponent(producto.fotoActualizadaEn)}`
      : "";
    void crearFuenteImagenApi(
      `/inventario/productos/${producto.id}/foto${version}`,
    )
      .then((fuente) => {
        if (activa) establecerFuenteActual(fuente);
      })
      .catch(() => {
        if (activa) establecerFuenteActual(undefined);
      });
    return () => {
      activa = false;
    };
  }, [producto?.fotoActualizadaEn, producto?.id, producto?.tieneFoto, visible]);

  function cambiar(campo: keyof BorradorProductoMovil, valor: string) {
    establecerError("");
    establecerBorrador((actual) => ({ ...actual, [campo]: valor }));
  }

  async function guardar() {
    const resultado = prepararDatosProducto(borrador, {
      editando: Boolean(producto),
      foto,
      eliminarFoto,
      es,
    });
    if (!resultado.exito) {
      establecerError(resultado.mensaje);
      return;
    }
    if (await alGuardar(resultado.datos)) alCerrar();
  }

  const apilar = diseno.compacto || diseno.fontScale > 1.2;
  return (
    <>
      <HojaFormulario
        visible={visible}
        bloqueada={guardando}
        alCerrar={alCerrar}
        titulo={
          producto
            ? es
              ? "Editar producto"
              : "Edit product"
            : es
              ? "Nuevo producto"
              : "New product"
        }
        subtitulo={
          es
            ? "Captura foto y datos para identificarlo sin confusiones."
            : "Add a photo and details for clear identification."
        }
        estiloContenido={estilos.formulario}
        pie={
          <BotonMovil
            texto={
              producto
                ? es
                  ? "Guardar cambios"
                  : "Save changes"
                : es
                  ? "Crear producto"
                  : "Create product"
            }
            icono="checkmark-circle-outline"
            cargando={guardando}
            alPulsar={() => void guardar()}
          />
        }
      >
        <CampoFotoProductoMovil
          foto={foto}
          fuenteActual={eliminarFoto ? undefined : fuenteActual}
          tieneFotoActual={Boolean(producto?.tieneFoto && !eliminarFoto)}
          es={es}
          tema={tema}
          alCambiar={(nueva) => {
            establecerFoto(nueva);
            establecerEliminarFoto(false);
          }}
          alEliminar={() => {
            establecerFoto(null);
            establecerEliminarFoto(Boolean(producto?.tieneFoto));
          }}
        />

        <Text style={[estilos.seccion, { color: tema.texto }]}>
          {es ? "Identificación" : "Identification"}
        </Text>
        <CampoMovil
          etiqueta={es ? "Nombre del producto" : "Product name"}
          valor={borrador.nombre}
          alCambiar={(valor) => cambiar("nombre", valor)}
          placeholder={es ? "Ej. Colcha matrimonial" : "E.g. Double bedspread"}
          requerido
        />
        <View style={[estilos.fila, apilar && estilos.apilada]}>
          <CampoMovil
            etiqueta={es ? "Marca" : "Brand"}
            valor={borrador.marca}
            alCambiar={(valor) => cambiar("marca", valor)}
            requerido
            estilo={estilos.flex}
          />
          <CampoMovil
            etiqueta="SKU"
            valor={borrador.sku}
            alCambiar={(valor) => cambiar("sku", valor)}
            autoCapitalize="characters"
            requerido
            estilo={estilos.flex}
          />
        </View>

        <View style={estilos.categoriasBloque}>
          <Text style={[estilos.etiqueta, { color: tema.textoSecundario }]}>
            {es ? "Agrupación *" : "Group *"}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={estilos.categorias}
          >
            {categorias.map((categoria) => {
              const activa = borrador.categoriaId === categoria.id;
              return (
                <Pressable
                  key={categoria.id}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: activa }}
                  onPress={() => cambiar("categoriaId", categoria.id)}
                  style={({ pressed }) => [
                    estilos.categoria,
                    {
                      borderColor: activa ? tema.primario : tema.bordeFuerte,
                      backgroundColor: activa ? tema.primario : tema.campo,
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      estilos.categoriaTexto,
                      { color: activa ? tema.sobrePrimario : tema.texto },
                    ]}
                  >
                    {categoria.nombre}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <View style={estilos.nuevaCategoria}>
            <CampoMovil
              etiqueta={es ? "Nueva agrupación" : "New group"}
              valor={nuevaCategoria}
              alCambiar={establecerNuevaCategoria}
              placeholder={es ? "Ej. Cobertores" : "E.g. Blankets"}
              estilo={estilos.flex}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={es ? "Crear agrupación" : "Create group"}
              accessibilityState={{
                disabled: nuevaCategoria.trim().length < 2,
              }}
              disabled={nuevaCategoria.trim().length < 2}
              style={({ pressed }) => [
                estilos.agregarCategoria,
                { backgroundColor: tema.primarioSuave },
                nuevaCategoria.trim().length < 2 && { opacity: 0.4 },
                pressed && { opacity: 0.65 },
              ]}
              onPress={async () => {
                const categoria = await alCrearCategoria(nuevaCategoria.trim());
                if (!categoria) return;
                cambiar("categoriaId", categoria.id);
                establecerNuevaCategoria("");
              }}
            >
              <Ionicons name="add" size={23} color={tema.primario} />
            </Pressable>
          </View>
        </View>

        <Text style={[estilos.seccion, { color: tema.texto }]}>
          {es ? "Códigos" : "Codes"}
        </Text>
        <CampoCodigo
          etiqueta={es ? "Código de barras" : "Barcode"}
          valor={borrador.codigoBarras}
          alCambiar={(valor) => cambiar("codigoBarras", valor)}
          alEscanear={() => establecerEscaner("BARRAS")}
          tema={tema}
          es={es}
        />
        <CampoCodigo
          etiqueta="QR"
          valor={borrador.codigoQr}
          alCambiar={(valor) => cambiar("codigoQr", valor)}
          alEscanear={() => establecerEscaner("QR")}
          tema={tema}
          es={es}
        />

        <Text style={[estilos.seccion, { color: tema.texto }]}>
          {es ? "Precios y existencia" : "Pricing and stock"}
        </Text>
        <View style={[estilos.fila, apilar && estilos.apilada]}>
          <CampoMovil
            etiqueta={es ? "Costo" : "Cost"}
            valor={borrador.precioCompra}
            alCambiar={(valor) => cambiar("precioCompra", valor)}
            teclado="decimal-pad"
            icono="pricetag-outline"
            requerido
            estilo={estilos.flex}
          />
          <CampoMovil
            etiqueta={es ? "Precio de venta" : "Sale price"}
            valor={borrador.precioVenta}
            alCambiar={(valor) => cambiar("precioVenta", valor)}
            teclado="decimal-pad"
            icono="cash-outline"
            requerido
            estilo={estilos.flex}
          />
        </View>
        <View style={[estilos.fila, apilar && estilos.apilada]}>
          {!producto ? (
            <CampoMovil
              etiqueta={es ? "Existencia inicial" : "Initial stock"}
              valor={borrador.existenciaInicial}
              alCambiar={(valor) => cambiar("existenciaInicial", valor)}
              teclado="number-pad"
              requerido
              estilo={estilos.flex}
            />
          ) : null}
          <CampoMovil
            etiqueta={es ? "Avisar cuando queden" : "Low-stock threshold"}
            valor={borrador.existenciaMinima}
            alCambiar={(valor) => cambiar("existenciaMinima", valor)}
            teclado="number-pad"
            requerido
            estilo={estilos.flex}
          />
        </View>
        {error ? <EstadoMovil tipo="error" texto={error} /> : null}
      </HojaFormulario>

      <EscanerCodigoProducto
        visible={Boolean(escaner)}
        tipo={escaner ?? "BARRAS"}
        es={es}
        alCerrar={() => establecerEscaner(null)}
        alDetectar={(codigo, tipoDetectado) => {
          cambiar(tipoDetectado === "QR" ? "codigoQr" : "codigoBarras", codigo);
          if (!borrador.sku.trim()) cambiar("sku", codigo.slice(0, 60));
          establecerEscaner(null);
        }}
      />
    </>
  );
}

function CampoCodigo({
  etiqueta,
  valor,
  alCambiar,
  alEscanear,
  tema,
  es,
}: {
  etiqueta: string;
  valor: string;
  alCambiar: (valor: string) => void;
  alEscanear: () => void;
  tema: ReturnType<typeof usarTema>;
  es: boolean;
}) {
  return (
    <View style={estilos.codigoFila}>
      <CampoMovil
        etiqueta={etiqueta}
        valor={valor}
        alCambiar={alCambiar}
        autoCapitalize="none"
        estilo={estilos.flex}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${es ? "Escanear" : "Scan"} ${etiqueta}`}
        onPress={alEscanear}
        style={({ pressed }) => [
          estilos.escanear,
          { backgroundColor: tema.primario },
          pressed && { opacity: 0.7 },
        ]}
      >
        <Ionicons name="scan" size={22} color={tema.sobrePrimario} />
      </Pressable>
    </View>
  );
}

const estilos = StyleSheet.create({
  formulario: { gap: 15 },
  seccion: { fontSize: 16, lineHeight: 21, fontWeight: "900", marginTop: 7 },
  fila: { flexDirection: "row", gap: 11 },
  apilada: { flexDirection: "column" },
  flex: { flex: 1 },
  categoriasBloque: { gap: 6 },
  etiqueta: { fontSize: 13, lineHeight: 18, fontWeight: "700" },
  categorias: { gap: 8, paddingVertical: 2 },
  categoria: {
    minHeight: tactilMinimo,
    borderRadius: radios.campo,
    borderWidth: 1,
    paddingHorizontal: 14,
    justifyContent: "center",
  },
  categoriaTexto: { fontSize: 13, fontWeight: "800" },
  nuevaCategoria: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  agregarCategoria: {
    width: tactilMinimo + 2,
    height: tactilMinimo + 2,
    borderRadius: radios.campo,
    alignItems: "center",
    justifyContent: "center",
  },
  codigoFila: { flexDirection: "row", gap: 8, alignItems: "flex-end" },
  escanear: {
    width: tactilMinimo + 2,
    height: tactilMinimo + 2,
    borderRadius: radios.campo,
    alignItems: "center",
    justifyContent: "center",
  },
});
