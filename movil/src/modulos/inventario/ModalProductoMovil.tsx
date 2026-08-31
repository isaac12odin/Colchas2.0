import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ImageSourcePropType,
} from "react-native";

import { crearFuenteImagenApi } from "../../api";
import { colores, type usarTema } from "../../tema";
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
  const [borrador, establecerBorrador] = useState<BorradorProductoMovil>(
    borradorDesdeProducto(producto),
  );
  const [foto, establecerFoto] = useState<FotoProductoMovil | null>(null);
  const [eliminarFoto, establecerEliminarFoto] = useState(false);
  const [fuenteActual, establecerFuenteActual] =
    useState<ImageSourcePropType>();
  const [escaner, establecerEscaner] = useState<"BARRAS" | "QR" | null>(null);
  const [nuevaCategoria, establecerNuevaCategoria] = useState("");

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
      Alert.alert(
        es ? "Revisa el producto" : "Check the product",
        resultado.mensaje,
      );
      return;
    }
    if (await alGuardar(resultado.datos)) alCerrar();
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={alCerrar}
    >
      <KeyboardAvoidingView
        style={estilos.fondo}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={[estilos.modal, { backgroundColor: tema.panel }]}>
          <View style={estilos.encabezado}>
            <View style={{ flex: 1 }}>
              <Text style={[estilos.titulo, { color: tema.texto }]}>
                {producto
                  ? es
                    ? "Editar producto"
                    : "Edit product"
                  : es
                    ? "Nuevo producto"
                    : "New product"}
              </Text>
              <Text style={estilos.subtitulo}>
                {es
                  ? "Foto, agrupación y código en pocos pasos"
                  : "Photo, group, and code in a few steps"}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={es ? "Cerrar" : "Close"}
              disabled={guardando}
              onPress={alCerrar}
              style={estilos.cerrar}
            >
              <Ionicons name="close" size={25} color={tema.texto} />
            </Pressable>
          </View>
          <ScrollView
            style={estilos.desplazable}
            contentContainerStyle={estilos.formulario}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets
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
            <Campo
              etiqueta={es ? "Nombre del producto *" : "Product name *"}
              valor={borrador.nombre}
              alCambiar={(valor) => cambiar("nombre", valor)}
              tema={tema}
            />
            <View style={estilos.fila}>
              <Campo
                etiqueta={es ? "Marca *" : "Brand *"}
                valor={borrador.marca}
                alCambiar={(valor) => cambiar("marca", valor)}
                tema={tema}
                contenedor={estilos.flex}
              />
              <Campo
                etiqueta="SKU *"
                valor={borrador.sku}
                alCambiar={(valor) => cambiar("sku", valor)}
                tema={tema}
                autoCapitalize="characters"
                contenedor={estilos.flex}
              />
            </View>
            <View>
              <Text style={estilos.etiqueta}>
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
                      onPress={() => cambiar("categoriaId", categoria.id)}
                      style={[
                        estilos.categoria,
                        { borderColor: activa ? colores.azul : tema.borde },
                        activa && estilos.categoriaActiva,
                      ]}
                    >
                      <Text
                        style={[
                          estilos.categoriaTexto,
                          { color: activa ? "white" : tema.texto },
                        ]}
                      >
                        {categoria.nombre}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
              <View style={estilos.nuevaCategoria}>
                <TextInput
                  value={nuevaCategoria}
                  onChangeText={establecerNuevaCategoria}
                  placeholder={es ? "Otra agrupación" : "Another group"}
                  placeholderTextColor={colores.gris}
                  style={[
                    estilos.campo,
                    estilos.flex,
                    {
                      color: tema.texto,
                      borderColor: tema.borde,
                      backgroundColor: tema.fondo,
                    },
                  ]}
                />
                <Pressable
                  accessibilityLabel={es ? "Crear agrupación" : "Create group"}
                  disabled={nuevaCategoria.trim().length < 2}
                  style={estilos.agregarCategoria}
                  onPress={async () => {
                    const categoria = await alCrearCategoria(
                      nuevaCategoria.trim(),
                    );
                    if (!categoria) return;
                    cambiar("categoriaId", categoria.id);
                    establecerNuevaCategoria("");
                  }}
                >
                  <Ionicons name="add" size={21} color={colores.azul} />
                </Pressable>
              </View>
            </View>
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
            <View style={estilos.fila}>
              <Campo
                etiqueta={es ? "Costo *" : "Cost *"}
                valor={borrador.precioCompra}
                alCambiar={(valor) => cambiar("precioCompra", valor)}
                tema={tema}
                teclado="decimal-pad"
                contenedor={estilos.flex}
              />
              <Campo
                etiqueta={es ? "Precio de venta *" : "Sale price *"}
                valor={borrador.precioVenta}
                alCambiar={(valor) => cambiar("precioVenta", valor)}
                tema={tema}
                teclado="decimal-pad"
                contenedor={estilos.flex}
              />
            </View>
            <View style={estilos.fila}>
              {!producto && (
                <Campo
                  etiqueta={es ? "Existencia inicial" : "Initial stock"}
                  valor={borrador.existenciaInicial}
                  alCambiar={(valor) => cambiar("existenciaInicial", valor)}
                  tema={tema}
                  teclado="number-pad"
                  contenedor={estilos.flex}
                />
              )}
              <Campo
                etiqueta={es ? "Mínimo de alerta" : "Low-stock threshold"}
                valor={borrador.existenciaMinima}
                alCambiar={(valor) => cambiar("existenciaMinima", valor)}
                tema={tema}
                teclado="number-pad"
                contenedor={estilos.flex}
              />
            </View>
          </ScrollView>
          <Pressable
            accessibilityRole="button"
            disabled={guardando}
            onPress={() => void guardar()}
            style={[estilos.guardar, guardando && estilos.deshabilitado]}
          >
            {guardando ? (
              <ActivityIndicator color="white" />
            ) : (
              <Ionicons
                name="checkmark-circle-outline"
                size={20}
                color="white"
              />
            )}
            <Text style={estilos.guardarTexto}>
              {guardando
                ? es
                  ? "Guardando…"
                  : "Saving…"
                : producto
                  ? es
                    ? "Guardar cambios"
                    : "Save changes"
                  : es
                    ? "Crear producto"
                    : "Create product"}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
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
    </Modal>
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
    <View>
      <Text style={estilos.etiqueta}>{etiqueta}</Text>
      <View style={estilos.codigoFila}>
        <TextInput
          value={valor}
          onChangeText={alCambiar}
          autoCapitalize="none"
          placeholderTextColor={colores.gris}
          style={[
            estilos.campo,
            estilos.flex,
            {
              color: tema.texto,
              borderColor: tema.borde,
              backgroundColor: tema.fondo,
            },
          ]}
        />
        <Pressable
          accessibilityLabel={`${es ? "Escanear" : "Scan"} ${etiqueta}`}
          onPress={alEscanear}
          style={estilos.escanear}
        >
          <Ionicons name="scan" size={22} color="white" />
        </Pressable>
      </View>
    </View>
  );
}

function Campo({
  etiqueta,
  valor,
  alCambiar,
  tema,
  teclado,
  autoCapitalize = "sentences",
  contenedor,
}: {
  etiqueta: string;
  valor: string;
  alCambiar: (valor: string) => void;
  tema: ReturnType<typeof usarTema>;
  teclado?: "decimal-pad" | "number-pad";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  contenedor?: object;
}) {
  return (
    <View style={contenedor}>
      <Text style={estilos.etiqueta}>{etiqueta}</Text>
      <TextInput
        value={valor}
        onChangeText={alCambiar}
        keyboardType={teclado}
        autoCapitalize={autoCapitalize}
        placeholderTextColor={colores.gris}
        style={[
          estilos.campo,
          {
            color: tema.texto,
            borderColor: tema.borde,
            backgroundColor: tema.fondo,
          },
        ]}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  fondo: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,.5)",
    justifyContent: "flex-end",
  },
  modal: {
    maxHeight: "94%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 18,
    paddingBottom: Platform.OS === "ios" ? 30 : 18,
  },
  encabezado: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  titulo: { fontSize: 20, fontWeight: "900" },
  subtitulo: { color: colores.gris, fontSize: 11, marginTop: 2 },
  cerrar: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  desplazable: { maxHeight: 620 },
  formulario: { gap: 12, paddingBottom: 8 },
  fila: { flexDirection: "row", gap: 10 },
  flex: { flex: 1 },
  categorias: { gap: 8, paddingBottom: 8 },
  categoria: {
    minHeight: 38,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    justifyContent: "center",
  },
  categoriaActiva: { backgroundColor: colores.azul },
  categoriaTexto: { fontSize: 12, fontWeight: "800" },
  nuevaCategoria: { flexDirection: "row", alignItems: "center", gap: 8 },
  agregarCategoria: {
    width: 45,
    height: 45,
    borderRadius: 10,
    backgroundColor: colores.azulClaro,
    alignItems: "center",
    justifyContent: "center",
  },
  codigoFila: { flexDirection: "row", gap: 8, alignItems: "center" },
  escanear: {
    width: 48,
    height: 45,
    borderRadius: 10,
    backgroundColor: colores.azul,
    alignItems: "center",
    justifyContent: "center",
  },
  etiqueta: {
    color: colores.gris,
    fontSize: 11,
    fontWeight: "800",
    marginBottom: 5,
  },
  campo: {
    minHeight: 45,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 11,
  },
  guardar: {
    minHeight: 52,
    borderRadius: 12,
    backgroundColor: colores.azul,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    marginTop: 14,
  },
  guardarTexto: { color: "white", fontWeight: "900" },
  deshabilitado: { opacity: 0.5 },
});
