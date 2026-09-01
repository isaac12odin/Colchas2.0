import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { api } from "../../api";
import {
  BotonMovil,
  CampoMovil,
  EstadoMovil,
  HojaFormulario,
  ProgresoPasos,
  TarjetaMovil,
  usarDisenoResponsivo,
} from "../../componentes/ui";
import { radios, tactilMinimo, type usarTema } from "../../tema";
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
  const diseno = usarDisenoResponsivo();
  const visibleAnterior = useRef(false);
  const [paso, establecerPaso] = useState(1);
  const [borrador, establecerBorrador] = useState(borradorInicial);
  const [cliente, establecerCliente] = useState<ClientePedidoMovil | null>(
    null,
  );
  const [producto, establecerProducto] = useState<ProductoMovil | null>(null);
  const [buscarCliente, establecerBuscarCliente] = useState("");
  const [buscarProducto, establecerBuscarProducto] = useState("");
  const [error, establecerError] = useState("");
  const clientes = usarBusqueda<ClientePedidoMovil>(
    visible && paso === 1 && !cliente,
    "/clientes",
    buscarCliente,
  );
  const productos = usarBusqueda<ProductoMovil>(
    visible && paso === 2 && !producto,
    "/inventario/productos",
    buscarProducto,
  );

  useEffect(() => {
    const esApertura = visible && !visibleAnterior.current;
    visibleAnterior.current = visible;
    if (!esApertura) return;
    establecerPaso(1);
    establecerBorrador(borradorInicial());
    establecerCliente(null);
    establecerProducto(null);
    establecerBuscarCliente("");
    establecerBuscarProducto("");
    establecerError("");
    if (!clienteInicialId) return;
    let vigente = true;
    void api<ClientePedidoMovil>(`/clientes/${clienteInicialId}`)
      .then((inicial) => {
        if (!vigente) return;
        establecerCliente(inicial);
        establecerBorrador((actual) => ({ ...actual, clienteId: inicial.id }));
      })
      .catch(() => undefined);
    return () => {
      vigente = false;
    };
  }, [clienteInicialId, visible]);

  function cambiar(campo: keyof BorradorNuevoPedido, valor: string) {
    establecerError("");
    establecerBorrador((actual) => ({ ...actual, [campo]: valor }));
  }

  async function crear() {
    const codigo = validarNuevoPedido(borrador);
    if (codigo) {
      const mensajes = {
        CLIENTE: es ? "Selecciona a la clienta." : "Select the customer.",
        PRODUCTO: es ? "Selecciona el producto." : "Select the product.",
        CANTIDAD: es
          ? "La cantidad debe ser un entero mayor a cero."
          : "Quantity must be a positive whole number.",
        FECHA: es
          ? "La fecha debe usar AAAA-MM-DD y no puede estar en el pasado."
          : "Date must use YYYY-MM-DD and cannot be in the past.",
        NOTAS: es
          ? "Las notas no pueden exceder 1,000 caracteres."
          : "Notes cannot exceed 1,000 characters.",
      };
      establecerError(mensajes[codigo]);
      return;
    }
    await alCrear(borrador);
  }

  const total =
    Number(producto?.precioVenta ?? 0) * Number(borrador.cantidad || 0);
  const pie =
    paso === 1 ? (
      <BotonMovil
        texto={es ? "Continuar a producto" : "Continue to product"}
        icono="arrow-forward"
        deshabilitado={!cliente || sinConexion}
        alPulsar={() => establecerPaso(2)}
      />
    ) : paso === 2 ? (
      <View style={estilos.accionesPie}>
        <BotonMovil
          texto={es ? "Continuar a detalles" : "Continue to details"}
          icono="arrow-forward"
          deshabilitado={!producto || sinConexion}
          alPulsar={() => establecerPaso(3)}
        />
        <BotonMovil
          texto={es ? "Volver" : "Back"}
          variante="texto"
          alPulsar={() => establecerPaso(1)}
        />
      </View>
    ) : (
      <View style={estilos.accionesPie}>
        <BotonMovil
          texto={es ? "Crear pedido pendiente" : "Create pending order"}
          icono="receipt-outline"
          cargando={creando}
          deshabilitado={sinConexion}
          alPulsar={() => void crear()}
        />
        <BotonMovil
          texto={es ? "Volver" : "Back"}
          variante="texto"
          deshabilitado={creando}
          alPulsar={() => establecerPaso(2)}
        />
      </View>
    );

  return (
    <HojaFormulario
      visible={visible}
      bloqueada={creando}
      alCerrar={alCerrar}
      titulo={es ? "Nuevo pedido" : "New order"}
      subtitulo={
        es
          ? "No crea deuda ni descuenta inventario hasta la entrega."
          : "No debt or stock change is created until delivery."
      }
      estiloContenido={estilos.contenido}
      pie={pie}
    >
      <ProgresoPasos
        actual={paso}
        pasos={
          es
            ? ["Clienta", "Producto", "Detalles"]
            : ["Customer", "Product", "Details"]
        }
      />
      {sinConexion ? (
        <EstadoMovil
          tipo="advertencia"
          texto={
            es
              ? "Crear el pedido requiere conexión para evitar duplicados. Puedes consultar los existentes sin señal."
              : "Creating an order requires connectivity to prevent duplicates. Existing orders remain available offline."
          }
        />
      ) : null}

      {paso === 1 ? (
        <View style={estilos.paso}>
          <TituloPaso
            titulo={es ? "¿Para quién es?" : "Who is it for?"}
            detalle={
              es
                ? "Busca por nombre, teléfono, dirección o tarjeta."
                : "Search by name, phone, address, or card."
            }
            tema={tema}
          />
          {cliente ? (
            <Seleccion
              icono="person"
              titulo={cliente.nombreCompleto}
              detalle={`${cliente.telefono} · ${cliente.localidad?.nombre ?? cliente.direccion}${cliente.numeroTarjeta ? ` · ${es ? "Tarjeta" : "Card"} ${cliente.numeroTarjeta}` : ""}`}
              es={es}
              tema={tema}
              alCambiar={() => {
                establecerCliente(null);
                cambiar("clienteId", "");
              }}
            />
          ) : (
            <Buscador
              etiqueta={es ? "Buscar clienta" : "Search customer"}
              placeholder={
                es
                  ? "Nombre, teléfono, dirección o tarjeta"
                  : "Name, phone, address, or card"
              }
              valor={buscarCliente}
              alCambiar={establecerBuscarCliente}
              cargando={clientes.cargando}
              sinResultados={!clientes.cargando && clientes.datos.length === 0}
              mensajeVacio={
                es
                  ? "No encontramos una clienta con esos datos."
                  : "No customer matched those details."
              }
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
        </View>
      ) : null}

      {paso === 2 ? (
        <View style={estilos.paso}>
          <TituloPaso
            titulo={
              es ? "¿Qué producto pidió?" : "Which product was requested?"
            }
            detalle={
              es
                ? "Sólo puedes elegir mercancía registrada en inventario."
                : "Only registered inventory products can be selected."
            }
            tema={tema}
          />
          {producto ? (
            <Seleccion
              icono="cube"
              titulo={producto.nombre}
              detalle={`${producto.marca} · ${producto.sku} · ${dinero.format(Number(producto.precioVenta))}`}
              es={es}
              tema={tema}
              alCambiar={() => {
                establecerProducto(null);
                cambiar("productoId", "");
              }}
            />
          ) : (
            <Buscador
              etiqueta={es ? "Buscar producto" : "Search product"}
              placeholder={
                es ? "Nombre, marca, SKU o código" : "Name, brand, SKU, or code"
              }
              valor={buscarProducto}
              alCambiar={establecerBuscarProducto}
              cargando={productos.cargando}
              sinResultados={
                !productos.cargando && productos.datos.length === 0
              }
              mensajeVacio={
                es
                  ? "Ese producto no está registrado. Almacén o Administración deben crearlo primero."
                  : "That product is not registered. Warehouse or Administration must create it first."
              }
              tema={tema}
            >
              {productos.datos.map((opcion) => (
                <Opcion
                  key={opcion.id}
                  titulo={opcion.nombre}
                  detalle={`${opcion.marca} · ${opcion.sku} · ${dinero.format(Number(opcion.precioVenta))}`}
                  tema={tema}
                  alPulsar={() => {
                    establecerProducto(opcion);
                    cambiar("productoId", opcion.id);
                  }}
                />
              ))}
            </Buscador>
          )}
        </View>
      ) : null}

      {paso === 3 ? (
        <View style={estilos.paso}>
          <TituloPaso
            titulo={es ? "Revisa la solicitud" : "Review the request"}
            detalle={
              es
                ? "Indica cantidad y, si existe, la fecha prometida."
                : "Enter the quantity and, if available, the promised date."
            }
            tema={tema}
          />
          <View
            style={[
              estilos.fila,
              (diseno.compacto || diseno.fontScale > 1.2) && estilos.apilada,
            ]}
          >
            <CampoMovil
              etiqueta={es ? "Cantidad" : "Quantity"}
              valor={borrador.cantidad}
              alCambiar={(valor) => cambiar("cantidad", valor)}
              teclado="number-pad"
              requerido
              estilo={estilos.flex}
            />
            <CampoMovil
              etiqueta={es ? "Fecha compromiso" : "Promise date"}
              ayuda={
                es
                  ? "Opcional · AAAA-MM-DD · no pasada"
                  : "Optional · YYYY-MM-DD · not in the past"
              }
              valor={borrador.fechaCompromiso}
              alCambiar={(valor) => cambiar("fechaCompromiso", valor)}
              placeholder="AAAA-MM-DD"
              icono="calendar-outline"
              estilo={estilos.flex}
            />
          </View>
          <CampoMovil
            etiqueta={es ? "Notas (opcional)" : "Notes (optional)"}
            valor={borrador.notas}
            alCambiar={(valor) => cambiar("notas", valor)}
            multilinea
            maxLength={1000}
            placeholder={
              es ? "Color, medida u observaciones" : "Color, size, or notes"
            }
          />
          {cliente && producto ? (
            <TarjetaMovil estilo={estilos.resumen}>
              <View style={estilos.expandir}>
                <Text
                  style={[
                    estilos.resumenEtiqueta,
                    { color: tema.textoSecundario },
                  ]}
                >
                  {es ? "PEDIDO A CREAR" : "ORDER TO CREATE"}
                </Text>
                <Text style={[estilos.resumenTexto, { color: tema.texto }]}>
                  {borrador.cantidad || "0"} × {producto.nombre}
                </Text>
                <Text
                  style={[
                    estilos.resumenCliente,
                    { color: tema.textoSecundario },
                  ]}
                >
                  {cliente.nombreCompleto}
                </Text>
              </View>
              <Text style={[estilos.total, { color: tema.primario }]}>
                {dinero.format(total)}
              </Text>
            </TarjetaMovil>
          ) : null}
          {error ? <EstadoMovil tipo="error" texto={error} /> : null}
        </View>
      ) : null}
    </HojaFormulario>
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

function TituloPaso({
  titulo,
  detalle,
  tema,
}: {
  titulo: string;
  detalle: string;
  tema: ReturnType<typeof usarTema>;
}) {
  return (
    <View>
      <Text style={[estilos.pasoTitulo, { color: tema.texto }]}>{titulo}</Text>
      <Text style={[estilos.pasoDetalle, { color: tema.textoSecundario }]}>
        {detalle}
      </Text>
    </View>
  );
}

function Buscador({
  etiqueta,
  placeholder,
  valor,
  alCambiar,
  cargando,
  sinResultados,
  mensajeVacio,
  tema,
  children,
}: {
  etiqueta: string;
  placeholder: string;
  valor: string;
  alCambiar: (valor: string) => void;
  cargando: boolean;
  sinResultados: boolean;
  mensajeVacio: string;
  tema: ReturnType<typeof usarTema>;
  children: React.ReactNode;
}) {
  return (
    <View style={estilos.busquedaBloque}>
      <View style={estilos.busquedaFila}>
        <CampoMovil
          etiqueta={etiqueta}
          valor={valor}
          alCambiar={alCambiar}
          placeholder={placeholder}
          icono="search-outline"
          autoCapitalize="none"
          estilo={estilos.flex}
        />
        {cargando ? (
          <ActivityIndicator color={tema.primario} style={estilos.cargando} />
        ) : null}
      </View>
      <View style={estilos.opciones}>{children}</View>
      {sinResultados ? (
        <Text style={[estilos.vacio, { color: tema.textoSecundario }]}>
          {mensajeVacio}
        </Text>
      ) : null}
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
      accessibilityRole="button"
      accessibilityLabel={`${titulo}. ${detalle}`}
      onPress={alPulsar}
      style={({ pressed }) => [
        estilos.opcion,
        { borderColor: tema.borde },
        pressed && { opacity: 0.65 },
      ]}
    >
      <View style={estilos.expandir}>
        <Text style={[estilos.opcionTitulo, { color: tema.texto }]}>
          {titulo}
        </Text>
        <Text
          style={[estilos.opcionDetalle, { color: tema.textoSecundario }]}
          numberOfLines={2}
        >
          {detalle}
        </Text>
      </View>
      <Ionicons name="add-circle-outline" size={22} color={tema.primario} />
    </Pressable>
  );
}

function Seleccion({
  icono,
  titulo,
  detalle,
  es,
  tema,
  alCambiar,
}: {
  icono: "person" | "cube";
  titulo: string;
  detalle: string;
  es: boolean;
  tema: ReturnType<typeof usarTema>;
  alCambiar: () => void;
}) {
  return (
    <View style={[estilos.seleccion, { backgroundColor: tema.exitoSuave }]}>
      <Ionicons name={icono} size={22} color={tema.exito} />
      <View style={estilos.expandir}>
        <Text style={[estilos.opcionTitulo, { color: tema.texto }]}>
          {titulo}
        </Text>
        <Text
          style={[estilos.opcionDetalle, { color: tema.textoSecundario }]}
          numberOfLines={3}
        >
          {detalle}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={es ? `Cambiar ${titulo}` : `Change ${titulo}`}
        onPress={alCambiar}
        style={estilos.cambiar}
      >
        <Text style={[estilos.cambiarTexto, { color: tema.primario }]}>
          {es ? "Cambiar" : "Change"}
        </Text>
      </Pressable>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenido: { gap: 16 },
  paso: { gap: 15 },
  pasoTitulo: { fontSize: 19, lineHeight: 25, fontWeight: "900" },
  pasoDetalle: { fontSize: 13, lineHeight: 19, marginTop: 3 },
  accionesPie: { gap: 2 },
  busquedaBloque: { gap: 7 },
  busquedaFila: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  cargando: { width: tactilMinimo, height: tactilMinimo },
  opciones: { gap: 7 },
  opcion: {
    minHeight: 64,
    borderTopWidth: 1,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  opcionTitulo: { fontSize: 14, lineHeight: 19, fontWeight: "800" },
  opcionDetalle: { fontSize: 12, lineHeight: 17, marginTop: 2 },
  seleccion: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: radios.campo,
    padding: 12,
  },
  cambiar: {
    minHeight: tactilMinimo,
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  cambiarTexto: { fontSize: 12, fontWeight: "900" },
  fila: { flexDirection: "row", gap: 11 },
  apilada: { flexDirection: "column" },
  flex: { flex: 1 },
  resumen: { flexDirection: "row", alignItems: "center", gap: 12 },
  resumenEtiqueta: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "900",
    letterSpacing: 0.7,
  },
  resumenTexto: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "900",
    marginTop: 3,
  },
  resumenCliente: { fontSize: 12, lineHeight: 17, marginTop: 2 },
  total: { fontSize: 18, lineHeight: 24, fontWeight: "900" },
  vacio: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    paddingVertical: 20,
  },
  expandir: { flex: 1, minWidth: 0 },
});
