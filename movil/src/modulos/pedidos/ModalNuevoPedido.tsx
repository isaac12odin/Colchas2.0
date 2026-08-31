import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
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
} from "react-native";

import { api } from "../../api";
import { colores, type usarTema } from "../../tema";
import type { ClientePedidoMovil, ProductoMovil } from "../../tipos";
import { dinero } from "../../utilidades/formato";
import { type BorradorNuevoPedido, validarNuevoPedido } from "./dominioPedidos";

interface Pagina<T> {
  datos: T[];
}

const borradorInicial = (): BorradorNuevoPedido => ({
  clienteId: "",
  productoId: "",
  cantidad: "1",
  fechaCompromiso: "",
  notas: "",
});

export function ModalNuevoPedido({
  visible,
  clienteInicialId,
  creando,
  sinConexion,
  es,
  tema,
  alCerrar,
  alCrear,
}: {
  visible: boolean;
  clienteInicialId?: string;
  creando: boolean;
  sinConexion: boolean;
  es: boolean;
  tema: ReturnType<typeof usarTema>;
  alCerrar: () => void;
  alCrear: (borrador: BorradorNuevoPedido) => Promise<boolean>;
}) {
  const visibleAnterior = useRef(false);
  const [borrador, establecerBorrador] = useState(borradorInicial);
  const [cliente, establecerCliente] = useState<ClientePedidoMovil | null>(
    null,
  );
  const [producto, establecerProducto] = useState<ProductoMovil | null>(null);
  const [buscarCliente, establecerBuscarCliente] = useState("");
  const [buscarProducto, establecerBuscarProducto] = useState("");
  const clientes = usarBusqueda<ClientePedidoMovil>(
    visible && !cliente,
    "/clientes",
    buscarCliente,
  );
  const productos = usarBusqueda<ProductoMovil>(
    visible && !producto,
    "/inventario/productos",
    buscarProducto,
  );

  useEffect(() => {
    const esApertura = visible && !visibleAnterior.current;
    visibleAnterior.current = visible;
    if (!esApertura) return;
    establecerBorrador(borradorInicial());
    establecerCliente(null);
    establecerProducto(null);
    establecerBuscarCliente("");
    establecerBuscarProducto("");
    if (!clienteInicialId) return;
    let vigente = true;
    void api<ClientePedidoMovil>(`/clientes/${clienteInicialId}`)
      .then((inicial) => {
        if (!vigente) return;
        establecerCliente(inicial);
        establecerBorrador((actual) => ({
          ...actual,
          clienteId: inicial.id,
        }));
      })
      .catch(() => undefined);
    return () => {
      vigente = false;
    };
  }, [clienteInicialId, visible]);

  function cambiar(campo: keyof BorradorNuevoPedido, valor: string) {
    establecerBorrador((actual) => ({ ...actual, [campo]: valor }));
  }

  async function crear() {
    const error = validarNuevoPedido(borrador);
    if (error) {
      const mensajes = {
        CLIENTE: es ? "Selecciona a la clienta." : "Select the customer.",
        PRODUCTO: es ? "Selecciona el producto." : "Select the product.",
        CANTIDAD: es
          ? "La cantidad debe ser un entero mayor a cero."
          : "Quantity must be a positive whole number.",
        FECHA: es
          ? "Usa la fecha con formato AAAA-MM-DD."
          : "Use the YYYY-MM-DD date format.",
        NOTAS: es
          ? "Las notas no pueden exceder 1,000 caracteres."
          : "Notes cannot exceed 1,000 characters.",
      };
      Alert.alert(es ? "Revisa el pedido" : "Check the order", mensajes[error]);
      return;
    }
    await alCrear(borrador);
  }

  const total =
    Number(producto?.precioVenta ?? 0) * Number(borrador.cantidad || 0);

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
            <View style={estilos.expandir}>
              <Text style={[estilos.titulo, { color: tema.texto }]}>
                {es ? "Nuevo pedido" : "New order"}
              </Text>
              <Text style={estilos.subtitulo}>
                {es
                  ? "Registra lo solicitado; todavía no crea venta ni deuda."
                  : "Record the request; it does not create a sale or debt yet."}
              </Text>
            </View>
            <Pressable
              accessibilityLabel={es ? "Cerrar" : "Close"}
              disabled={creando}
              onPress={alCerrar}
              style={estilos.cerrar}
            >
              <Ionicons name="close" size={24} color={tema.texto} />
            </Pressable>
          </View>

          <ScrollView
            style={estilos.desplazable}
            contentContainerStyle={estilos.formulario}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets
          >
            {sinConexion && (
              <View style={estilos.sinConexion}>
                <Ionicons name="cloud-offline" size={18} color="#8a3b12" />
                <Text style={estilos.sinConexionTexto}>
                  {es
                    ? "Para crear pedidos se necesita conexión; no perderás lo capturado mientras permanezcas aquí."
                    : "Creating orders requires a connection; this draft remains while you stay here."}
                </Text>
              </View>
            )}

            <Seccion
              numero="1"
              titulo={es ? "Clienta" : "Customer"}
              tema={tema}
            >
              {cliente ? (
                <Seleccion
                  titulo={cliente.nombreCompleto}
                  detalle={`${cliente.telefono} · ${cliente.localidad?.nombre ?? cliente.direccion}`}
                  es={es}
                  tema={tema}
                  alCambiar={() => {
                    establecerCliente(null);
                    cambiar("clienteId", "");
                  }}
                />
              ) : (
                <Buscador
                  etiqueta={
                    es
                      ? "Nombre, teléfono, dirección o tarjeta"
                      : "Name, phone, address, or card"
                  }
                  valor={buscarCliente}
                  alCambiar={establecerBuscarCliente}
                  cargando={clientes.cargando}
                  tema={tema}
                >
                  {clientes.datos.map((opcion) => (
                    <Opcion
                      key={opcion.id}
                      titulo={opcion.nombreCompleto}
                      detalle={`${opcion.telefono} · ${opcion.localidad?.nombre ?? opcion.direccion}`}
                      tema={tema}
                      alPulsar={() => {
                        establecerCliente(opcion);
                        cambiar("clienteId", opcion.id);
                      }}
                    />
                  ))}
                </Buscador>
              )}
            </Seccion>

            <Seccion
              numero="2"
              titulo={es ? "Producto" : "Product"}
              tema={tema}
            >
              {producto ? (
                <Seleccion
                  titulo={producto.nombre}
                  detalle={`${producto.sku} · ${dinero.format(Number(producto.precioVenta))}`}
                  es={es}
                  tema={tema}
                  alCambiar={() => {
                    establecerProducto(null);
                    cambiar("productoId", "");
                  }}
                />
              ) : (
                <Buscador
                  etiqueta={
                    es
                      ? "Producto, marca, SKU o código"
                      : "Product, brand, SKU, or code"
                  }
                  valor={buscarProducto}
                  alCambiar={establecerBuscarProducto}
                  cargando={productos.cargando}
                  tema={tema}
                >
                  {productos.datos.map((opcion) => (
                    <Opcion
                      key={opcion.id}
                      titulo={opcion.nombre}
                      detalle={`${opcion.sku} · ${dinero.format(Number(opcion.precioVenta))}`}
                      tema={tema}
                      alPulsar={() => {
                        establecerProducto(opcion);
                        cambiar("productoId", opcion.id);
                      }}
                    />
                  ))}
                </Buscador>
              )}
            </Seccion>

            <Seccion
              numero="3"
              titulo={es ? "Cantidad y promesa" : "Quantity and promise"}
              tema={tema}
            >
              <View style={estilos.filaCampos}>
                <Campo
                  etiqueta={es ? "Cantidad" : "Quantity"}
                  valor={borrador.cantidad}
                  alCambiar={(valor) => cambiar("cantidad", valor)}
                  tema={tema}
                  teclado="number-pad"
                  contenedor={estilos.cantidad}
                />
                <Campo
                  etiqueta={
                    es
                      ? "Fecha compromiso (opcional)"
                      : "Promise date (optional)"
                  }
                  valor={borrador.fechaCompromiso}
                  alCambiar={(valor) => cambiar("fechaCompromiso", valor)}
                  tema={tema}
                  placeholder="AAAA-MM-DD"
                  contenedor={estilos.expandir}
                />
              </View>
              <Campo
                etiqueta={es ? "Notas (opcional)" : "Notes (optional)"}
                valor={borrador.notas}
                alCambiar={(valor) => cambiar("notas", valor)}
                tema={tema}
                multilinea
              />
            </Seccion>

            {cliente && producto && (
              <View style={estilos.resumen}>
                <View style={estilos.expandir}>
                  <Text style={estilos.resumenEtiqueta}>
                    {es ? "SOLICITUD A CREAR" : "REQUEST TO CREATE"}
                  </Text>
                  <Text style={[estilos.resumenTexto, { color: tema.texto }]}>
                    {borrador.cantidad || "0"} × {producto.nombre}
                  </Text>
                  <Text style={estilos.resumenCliente}>
                    {cliente.nombreCompleto}
                  </Text>
                </View>
                <Text style={estilos.total}>{dinero.format(total)}</Text>
              </View>
            )}
          </ScrollView>

          <Pressable
            disabled={creando || sinConexion}
            onPress={() => void crear()}
            style={[
              estilos.guardar,
              (creando || sinConexion) && estilos.deshabilitado,
            ]}
          >
            {creando ? (
              <ActivityIndicator color="white" />
            ) : (
              <Ionicons name="receipt-outline" size={20} color="white" />
            )}
            <Text style={estilos.guardarTexto}>
              {creando
                ? es
                  ? "Creando…"
                  : "Creating…"
                : es
                  ? "Crear pedido pendiente"
                  : "Create pending order"}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function usarBusqueda<T>(activa: boolean, ruta: string, termino: string) {
  const [datos, establecerDatos] = useState<T[]>([]);
  const [cargando, establecerCargando] = useState(false);
  useEffect(() => {
    if (!activa) return;
    let vigente = true;
    const espera = setTimeout(
      () => {
        establecerCargando(true);
        void api<Pagina<T>>(
          `${ruta}?limite=8&buscar=${encodeURIComponent(termino.trim())}`,
        )
          .then((respuesta) => {
            if (vigente) establecerDatos(respuesta.datos);
          })
          .catch(() => {
            if (vigente) establecerDatos([]);
          })
          .finally(() => {
            if (vigente) establecerCargando(false);
          });
      },
      termino ? 250 : 0,
    );
    return () => {
      vigente = false;
      clearTimeout(espera);
    };
  }, [activa, ruta, termino]);
  return { datos, cargando };
}

function Seccion({
  numero,
  titulo,
  tema,
  children,
}: {
  numero: string;
  titulo: string;
  tema: ReturnType<typeof usarTema>;
  children: React.ReactNode;
}) {
  return (
    <View style={[estilos.seccion, { borderColor: tema.borde }]}>
      <View style={estilos.seccionTituloFila}>
        <Text style={estilos.numero}>{numero}</Text>
        <Text style={[estilos.seccionTitulo, { color: tema.texto }]}>
          {titulo}
        </Text>
      </View>
      {children}
    </View>
  );
}

function Buscador({
  etiqueta,
  valor,
  alCambiar,
  cargando,
  tema,
  children,
}: {
  etiqueta: string;
  valor: string;
  alCambiar: (valor: string) => void;
  cargando: boolean;
  tema: ReturnType<typeof usarTema>;
  children: React.ReactNode;
}) {
  return (
    <View>
      <View style={[estilos.buscar, { borderColor: tema.borde }]}>
        <Ionicons name="search" size={18} color={colores.gris} />
        <TextInput
          value={valor}
          onChangeText={alCambiar}
          placeholder={etiqueta}
          placeholderTextColor={colores.gris}
          autoCapitalize="none"
          style={[estilos.buscarCampo, { color: tema.texto }]}
        />
        {cargando && <ActivityIndicator size="small" color={colores.azul} />}
      </View>
      <View style={estilos.opciones}>{children}</View>
    </View>
  );
}

function Opcion({
  titulo,
  detalle,
  tema,
  alPulsar,
}: {
  titulo: string;
  detalle: string;
  tema: ReturnType<typeof usarTema>;
  alPulsar: () => void;
}) {
  return (
    <Pressable
      onPress={alPulsar}
      style={[estilos.opcion, { borderColor: tema.borde }]}
    >
      <View style={estilos.expandir}>
        <Text style={[estilos.opcionTitulo, { color: tema.texto }]}>
          {titulo}
        </Text>
        <Text style={estilos.opcionDetalle} numberOfLines={1}>
          {detalle}
        </Text>
      </View>
      <Ionicons name="add-circle-outline" size={20} color={colores.azul} />
    </Pressable>
  );
}

function Seleccion({
  titulo,
  detalle,
  es,
  tema,
  alCambiar,
}: {
  titulo: string;
  detalle: string;
  es: boolean;
  tema: ReturnType<typeof usarTema>;
  alCambiar: () => void;
}) {
  return (
    <View style={estilos.seleccion}>
      <Ionicons name="checkmark-circle" size={22} color={colores.verde} />
      <View style={estilos.expandir}>
        <Text style={[estilos.opcionTitulo, { color: tema.texto }]}>
          {titulo}
        </Text>
        <Text style={estilos.opcionDetalle} numberOfLines={1}>
          {detalle}
        </Text>
      </View>
      <Pressable onPress={alCambiar} style={estilos.cambiar}>
        <Text style={estilos.cambiarTexto}>{es ? "Cambiar" : "Change"}</Text>
      </Pressable>
    </View>
  );
}

function Campo({
  etiqueta,
  valor,
  alCambiar,
  tema,
  teclado,
  placeholder,
  multilinea,
  contenedor,
}: {
  etiqueta: string;
  valor: string;
  alCambiar: (valor: string) => void;
  tema: ReturnType<typeof usarTema>;
  teclado?: "number-pad";
  placeholder?: string;
  multilinea?: boolean;
  contenedor?: object;
}) {
  return (
    <View style={contenedor}>
      <Text style={estilos.etiqueta}>{etiqueta}</Text>
      <TextInput
        value={valor}
        onChangeText={alCambiar}
        keyboardType={teclado}
        placeholder={placeholder}
        placeholderTextColor={colores.gris}
        multiline={multilinea}
        maxLength={multilinea ? 1000 : undefined}
        style={[
          estilos.campo,
          multilinea && estilos.notas,
          { borderColor: tema.borde, color: tema.texto },
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
  encabezado: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  titulo: { fontSize: 21, fontWeight: "900" },
  subtitulo: {
    color: colores.gris,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  expandir: { flex: 1 },
  cerrar: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  desplazable: { maxHeight: 610 },
  formulario: { gap: 13, paddingVertical: 14, paddingBottom: 24 },
  sinConexion: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: "#fff2e8",
    borderRadius: 11,
    padding: 11,
  },
  sinConexionTexto: { flex: 1, color: "#8a3b12", fontSize: 11, lineHeight: 17 },
  seccion: { borderWidth: 1, borderRadius: 14, padding: 13 },
  seccionTituloFila: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 11,
  },
  numero: {
    width: 25,
    height: 25,
    borderRadius: 13,
    textAlign: "center",
    textAlignVertical: "center",
    backgroundColor: colores.azul,
    color: "white",
    fontWeight: "900",
    fontSize: 12,
    lineHeight: 25,
  },
  seccionTitulo: { fontSize: 15, fontWeight: "900" },
  buscar: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 11,
    paddingHorizontal: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  buscarCampo: { flex: 1, minHeight: 46 },
  opciones: { gap: 7, marginTop: 8 },
  opcion: {
    minHeight: 54,
    borderTopWidth: 1,
    paddingTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  opcionTitulo: { fontSize: 13, fontWeight: "800" },
  opcionDetalle: { color: colores.gris, fontSize: 10, marginTop: 3 },
  seleccion: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    backgroundColor: "#defbe6",
    borderRadius: 11,
    padding: 11,
  },
  cambiar: { minHeight: 40, justifyContent: "center", paddingHorizontal: 4 },
  cambiarTexto: { color: colores.azul, fontSize: 11, fontWeight: "800" },
  filaCampos: { flexDirection: "row", gap: 10 },
  cantidad: { width: 95 },
  etiqueta: {
    color: colores.gris,
    fontSize: 10,
    fontWeight: "800",
    marginBottom: 6,
  },
  campo: {
    minHeight: 46,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 11,
  },
  notas: { height: 75, paddingTop: 10, textAlignVertical: "top" },
  resumen: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colores.azulClaro,
    borderRadius: 13,
    padding: 14,
  },
  resumenEtiqueta: { color: colores.azul, fontSize: 9, fontWeight: "900" },
  resumenTexto: { fontSize: 14, fontWeight: "900", marginTop: 4 },
  resumenCliente: { color: colores.gris, fontSize: 10, marginTop: 2 },
  total: { color: colores.azul, fontSize: 17, fontWeight: "900" },
  guardar: {
    minHeight: 53,
    borderRadius: 12,
    backgroundColor: colores.azul,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  guardarTexto: { color: "white", fontWeight: "900", fontSize: 15 },
  deshabilitado: { opacity: 0.43 },
});
