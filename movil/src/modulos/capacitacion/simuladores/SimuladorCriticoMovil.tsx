import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import { BotonMovil, CampoMovil, TarjetaMovil } from "../../../componentes/ui";
import { FormularioAbono } from "../../jornada/FormularioAbono";
import type { MetodoAbono } from "../../jornada/dominioJornada";
import type { ClienteJornada } from "../../../tipos";
import { ConfiguracionVenta } from "../../ventas/ConfiguracionVenta";
import type { MetodoPago } from "../../ventas/dominioVenta";
import { colores, usarTema } from "../../../tema";
import type { TipoSimuladorCapacitacionMovil } from "../catalogo";
import { distribucionCapacitacionMovil } from "../presentacion";
import {
  type AbonoPractica,
  type DecisionConflicto,
  type DevolucionPractica,
  type EntregaPractica,
  fechaSugeridaEntregaPractica,
  importesDevolucionPractica,
  type ResultadoPractica,
  type VentaCreditoPractica,
  validarAbonoPractica,
  validarDevolucionPractica,
  validarEntregaPractica,
  validarSincronizacionPractica,
  validarVentaCreditoPractica,
} from "./dominio";

type Idioma = "es" | "en";

const clienteAbonoPractica: ClienteJornada = {
  id: "cliente-abono-practica",
  nombreCompleto: "Ana López",
  numeroTarjeta: "0042",
  telefono: "555 010 2244",
  direccion: "Av. Reforma 118",
  localidad: { nombre: "Centro" },
  orden: 2,
  saldo: { saldoActual: "800" },
  visita: null,
  pedidos: [],
  ventas: [],
  abonos: [],
  evaluacionesRiesgo: [{ nivel: "MEDIO" }],
  estadoCuenta: {
    saldoTotal: 800,
    abonoPeriodico: 200,
    vencido: 200,
    venceHoy: 0,
    cobrarHoy: 200,
    proximoVencimiento: null,
    cuotasVencidas: 1,
  },
};

export function SimuladorCriticoMovil({
  tipo,
  idioma,
  alCompletar,
}: {
  tipo: TipoSimuladorCapacitacionMovil;
  idioma: Idioma;
  alCompletar: () => void;
}) {
  const propiedades = { idioma, alCompletar };
  switch (tipo) {
    case "VENTA_CREDITO":
      return <VentaCredito {...propiedades} />;
    case "ABONO":
      return <Abono {...propiedades} />;
    case "ENTREGA_PEDIDO":
      return <Entrega {...propiedades} />;
    case "DEVOLUCION":
      return <Devolucion {...propiedades} />;
    case "SINCRONIZACION_CORRECCION":
      return <Sincronizacion {...propiedades} />;
  }
}

function Marco({
  pantalla,
  titulo,
  icono,
  idioma,
  pasos,
  pasoActual,
  children,
}: {
  pantalla: string;
  titulo: string;
  icono: keyof typeof Ionicons.glyphMap;
  idioma: Idioma;
  pasos: readonly string[];
  pasoActual: number;
  children: React.ReactNode;
}) {
  const tema = usarTema();
  const { width, fontScale } = useWindowDimensions();
  const distribucion = distribucionCapacitacionMovil(width);
  const apilarPasos = distribucion.compacta || fontScale >= 1.25;
  const es = idioma === "es";
  return (
    <View
      style={[
        estilos.marco,
        {
          backgroundColor: tema.panel,
          borderColor: tema.borde,
          padding: distribucion.compacta ? 12 : 16,
        },
      ]}
    >
      <View style={estilos.cabecera}>
        <View style={[estilos.icono, { backgroundColor: tema.primario }]}>
          <Ionicons name={icono} size={21} color={tema.sobrePrimario} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[estilos.pantalla, { color: tema.primario }]}>
            VEKTRA · {pantalla.toUpperCase()}
          </Text>
          <Text style={[estilos.titulo, { color: tema.texto }]}>{titulo}</Text>
        </View>
      </View>
      <View style={[estilos.seguro, { backgroundColor: tema.exitoSuave }]}>
        <Ionicons name="shield-checkmark" size={15} color={tema.exito} />
        <Text style={[estilos.seguroTexto, { color: tema.exito }]}>
          {es ? "DATOS DE PRÁCTICA · SIN API" : "PRACTICE DATA · NO API"}
        </Text>
      </View>
      <View
        accessibilityLabel={`${es ? "Paso" : "Step"} ${pasoActual + 1} ${
          es ? "de" : "of"
        } ${pasos.length}`}
        style={[estilos.pasos, apilarPasos && estilos.pasosApilados]}
      >
        {pasos.map((paso, indice) => {
          const activo = indice === pasoActual;
          const listo = indice < pasoActual;
          return (
            <View
              key={paso}
              style={[
                estilos.paso,
                {
                  backgroundColor: tema.campoDeshabilitado,
                  borderColor: tema.borde,
                  minWidth: apilarPasos ? "100%" : 100,
                },
                apilarPasos && estilos.pasoApilado,
                activo && { borderColor: tema.primario },
              ]}
            >
              <View
                style={[
                  estilos.pasoNumero,
                  { backgroundColor: tema.campoDeshabilitado },
                  (activo || listo) && {
                    backgroundColor: tema.primario,
                  },
                ]}
              >
                <Text
                  style={[
                    estilos.pasoNumeroTexto,
                    {
                      color:
                        activo || listo
                          ? tema.sobrePrimario
                          : tema.textoSecundario,
                    },
                  ]}
                >
                  {listo ? "✓" : indice + 1}
                </Text>
              </View>
              <Text
                style={[
                  estilos.pasoTexto,
                  { color: activo ? tema.primario : tema.texto },
                ]}
              >
                {paso}
              </Text>
            </View>
          );
        })}
      </View>
      {children}
    </View>
  );
}

function Retro({
  valor,
  idioma,
  consecuencias,
  alCompletar,
}: {
  valor: ResultadoPractica | null;
  idioma: Idioma;
  consecuencias?: { etiqueta: string; valor: string }[];
  alCompletar: () => void;
}) {
  const tema = usarTema();
  if (!valor) return null;
  const es = idioma === "es";
  return (
    <View
      style={[
        estilos.retro,
        {
          backgroundColor: valor.correcta ? tema.exitoSuave : tema.peligroSuave,
          borderColor: valor.correcta ? tema.exito : tema.peligro,
        },
      ]}
    >
      <Ionicons
        name={valor.correcta ? "checkmark-circle" : "alert-circle"}
        size={21}
        color={valor.correcta ? tema.exito : tema.peligro}
      />
      <View style={{ flex: 1 }}>
        <Text
          style={[
            valor.correcta ? estilos.bienTitulo : estilos.malTitulo,
            {
              color: valor.correcta ? tema.exito : tema.peligro,
            },
          ]}
        >
          {valor.correcta
            ? es
              ? "Decisión correcta"
              : "Correct decision"
            : es
              ? "Corrige esta decisión"
              : "Correct this decision"}
        </Text>
        <Text style={[estilos.retroTexto, { color: tema.texto }]}>
          {valor.mensaje[idioma]}
        </Text>
        {valor.correcta && consecuencias && (
          <View style={estilos.metricas}>
            {consecuencias.map((item) => (
              <View
                key={item.etiqueta}
                style={[
                  estilos.metrica,
                  { backgroundColor: tema.panelElevado },
                ]}
              >
                <Text
                  style={[
                    estilos.metricaEtiqueta,
                    { color: tema.textoSecundario },
                  ]}
                >
                  {item.etiqueta}
                </Text>
                <Text style={[estilos.metricaValor, { color: tema.primario }]}>
                  {item.valor}
                </Text>
              </View>
            ))}
          </View>
        )}
        {valor.correcta && (
          <BotonMovil
            texto={es ? "Completar práctica" : "Complete practice"}
            alPulsar={alCompletar}
            icono="checkmark"
            estilo={[estilos.boton, { marginTop: 13 }]}
          />
        )}
      </View>
    </View>
  );
}

function VentaCredito({ idioma, alCompletar }: Propiedades) {
  const es = idioma === "es";
  const [valor, cambiar] = useState<VentaCreditoPractica>({
    cliente: "",
    producto: "",
    cantidad: 1,
    anticipo: 0,
    tarjeta: "",
    cuota: 0,
    periodicidad: "SEMANAL",
    vencimiento: fechaSugeridaEntregaPractica(),
  });
  const [captura, cambiarCaptura] = useState({
    cantidad: "1",
    anticipo: "",
    cuota: "",
  });
  const [metodoAnticipo, cambiarMetodoAnticipo] =
    useState<MetodoPago>("EFECTIVO");
  const [retro, setRetro] = useState<ResultadoPractica | null>(null);
  const total = valor.cantidad * 1200;
  const pasoActual = !valor.cliente ? 0 : !valor.producto ? 1 : 2;
  return (
    <Marco
      pantalla="venta"
      titulo={es ? "Nueva venta a crédito" : "New credit sale"}
      icono="cart"
      idioma={idioma}
      pasos={
        es
          ? ["Clienta", "Producto", "Crédito"]
          : ["Customer", "Product", "Credit"]
      }
      pasoActual={pasoActual}
    >
      <Seccion titulo={es ? "1. Confirma clienta" : "1. Confirm customer"}>
        <Selector
          etiqueta={
            es
              ? "Buscar por nombre, teléfono o tarjeta"
              : "Search by name, phone, or card"
          }
          opciones={[{ valor: "ana", texto: "Ana López · 555 010 2244" }]}
          valor={valor.cliente}
          alCambiar={(cliente) => cambiar({ ...valor, cliente })}
        />
      </Seccion>
      <Seccion
        titulo={
          es ? "2. Elige mercancía registrada" : "2. Choose registered goods"
        }
      >
        <Selector
          etiqueta={es ? "Producto" : "Product"}
          opciones={[
            { valor: "colcha", texto: "Colcha Viena · $1,200 · stock 3" },
          ]}
          valor={valor.producto}
          alCambiar={(producto) => cambiar({ ...valor, producto })}
        />
        <Campo
          etiqueta={es ? "Cantidad" : "Quantity"}
          valor={captura.cantidad}
          numerico
          alCambiar={(cantidad) => {
            cambiarCaptura((actual) => ({ ...actual, cantidad }));
            cambiar({ ...valor, cantidad: numeroCapturado(cantidad) });
          }}
        />
      </Seccion>
      <ConfiguracionVenta
        tipo="CREDITO"
        montoTotal={total}
        anticipo={captura.anticipo}
        metodoAnticipo={metodoAnticipo}
        periodicidad={valor.periodicidad || "SEMANAL"}
        cuota={captura.cuota}
        primerVencimiento={valor.vencimiento}
        numeroTarjeta={valor.tarjeta}
        es={es}
        alCambiarTipo={() => undefined}
        alCambiarAnticipo={(anticipo) => {
          cambiarCaptura((actual) => ({ ...actual, anticipo }));
          cambiar({ ...valor, anticipo: numeroCapturado(anticipo) });
        }}
        alCambiarMetodoAnticipo={cambiarMetodoAnticipo}
        alCambiarPeriodicidad={(periodicidad) =>
          cambiar({ ...valor, periodicidad })
        }
        alCambiarCuota={(cuota) => {
          cambiarCaptura((actual) => ({ ...actual, cuota }));
          cambiar({ ...valor, cuota: numeroCapturado(cuota) });
        }}
        alCambiarVencimiento={(vencimiento) =>
          cambiar({ ...valor, vencimiento })
        }
        alCambiarNumeroTarjeta={(tarjeta) => cambiar({ ...valor, tarjeta })}
      />
      <Resumen
        filas={[
          [es ? "Total" : "Total", `$${total.toFixed(0)}`],
          [es ? "Saldo anterior" : "Previous balance", "$500"],
          [
            es ? "Saldo después" : "Balance after",
            `$${(500 + Math.max(0, total - valor.anticipo)).toFixed(0)}`,
          ],
        ]}
      />
      <Boton
        texto={es ? "Confirmar venta de práctica" : "Confirm practice sale"}
        alPulsar={() => setRetro(validarVentaCreditoPractica(valor))}
      />
      <Retro
        valor={retro}
        idioma={idioma}
        alCompletar={alCompletar}
        consecuencias={
          retro?.correcta
            ? [
                {
                  etiqueta: es ? "Saldo" : "Balance",
                  valor: `$500 → $${500 + total - valor.anticipo}`,
                },
                {
                  etiqueta: es ? "Stock" : "Stock",
                  valor: `3 → ${3 - valor.cantidad}`,
                },
                {
                  etiqueta: es ? "Corte" : "Closing",
                  valor: `$0 → $${valor.anticipo}`,
                },
              ]
            : undefined
        }
      />
    </Marco>
  );
}

function Abono({ idioma, alCompletar }: Propiedades) {
  const tema = usarTema();
  const es = idioma === "es";
  const [valor, cambiar] = useState<AbonoPractica>({
    cliente: "",
    monto: 0,
    metodo: "EFECTIVO",
    referencia: "",
  });
  const [montoCapturado, cambiarMontoCapturado] = useState("");
  const [notas, cambiarNotas] = useState("");
  const [retro, setRetro] = useState<ResultadoPractica | null>(null);
  const metodoReal: MetodoAbono =
    valor.metodo === "TRANSFERENCIA" ? "TRANSFERENCIA" : "EFECTIVO";
  return (
    <Marco
      pantalla="jornada"
      titulo={es ? "Registrar abono" : "Record payment"}
      icono="cash"
      idioma={idioma}
      pasos={
        es
          ? ["Clienta", "Importe y método", "Confirmación"]
          : ["Customer", "Amount and method", "Confirmation"]
      }
      pasoActual={!valor.cliente ? 0 : valor.monto <= 0 ? 1 : 2}
    >
      <Selector
        etiqueta={
          es
            ? "Clienta de la ruta o búsqueda externa"
            : "Route customer or external search"
        }
        opciones={[{ valor: "ana", texto: "Ana López · tarjeta 0042" }]}
        valor={valor.cliente}
        alCambiar={(cliente) => cambiar({ ...valor, cliente })}
      />
      <View style={[estilos.saldo, { backgroundColor: tema.primarioSuave }]}>
        <Text style={[estilos.saldoEtiqueta, { color: tema.primario }]}>
          {es ? "SALDO ACTUAL" : "CURRENT BALANCE"}
        </Text>
        <Text style={[estilos.saldoValor, { color: tema.primario }]}>
          $800.00
        </Text>
        <Text style={[estilos.nota, { color: tema.textoSecundario }]}>
          {es
            ? "Pedido pendiente: todavía no forma parte del saldo"
            : "Pending order: not part of balance yet"}
        </Text>
      </View>
      <View
        style={[
          estilos.formularioReal,
          { borderColor: tema.borde, backgroundColor: tema.panel },
        ]}
      >
        <Text style={[estilos.componenteReal, { color: tema.primario }]}>
          {es
            ? "MISMO FORMULARIO DE LA JORNADA REAL"
            : "SAME FORM AS THE REAL WORKDAY"}
        </Text>
        <FormularioAbono
          cliente={clienteAbonoPractica}
          es={es}
          tema={tema}
          monto={montoCapturado}
          metodo={metodoReal}
          referencia={valor.referencia}
          notas={notas}
          guardando={false}
          alCambiarMonto={(monto) => {
            cambiarMontoCapturado(monto);
            cambiar({ ...valor, monto: numeroCapturado(monto) });
            setRetro(null);
          }}
          alCambiarMetodo={(metodo) => {
            if (metodo === "OTRO") return;
            cambiar({ ...valor, metodo });
            setRetro(null);
          }}
          alCambiarReferencia={(referencia) => {
            cambiar({ ...valor, referencia });
            setRetro(null);
          }}
          alCambiarNotas={cambiarNotas}
          alVolver={() => cambiar({ ...valor, cliente: "" })}
          alGuardar={(monto) => {
            const siguienteValor = { ...valor, monto };
            cambiar(siguienteValor);
            setRetro(validarAbonoPractica(siguienteValor));
          }}
        />
      </View>
      <Resumen
        filas={[
          [
            es ? "Saldo proyectado" : "Projected balance",
            `$${Math.max(0, 800 - valor.monto).toFixed(0)}`,
          ],
          [
            es ? "Movimiento al corte" : "Closing movement",
            `$${valor.monto.toFixed(0)} · ${valor.metodo}`,
          ],
        ]}
      />
      <Retro
        valor={retro}
        idioma={idioma}
        alCompletar={alCompletar}
        consecuencias={
          retro?.correcta
            ? [
                {
                  etiqueta: es ? "Saldo" : "Balance",
                  valor: `$800 → $${800 - valor.monto}`,
                },
                {
                  etiqueta: es ? "Corte" : "Closing",
                  valor: `$0 → $${valor.monto}`,
                },
              ]
            : undefined
        }
      />
    </Marco>
  );
}

function Entrega({ idioma, alCompletar }: Propiedades) {
  const tema = usarTema();
  const es = idioma === "es";
  const [valor, cambiar] = useState<EntregaPractica>({
    tipo: "CREDITO",
    anticipo: 0,
    tarjeta: "",
    cuota: 0,
    periodicidad: "SEMANAL",
    primerVencimiento: fechaSugeridaEntregaPractica(),
  });
  const [captura, cambiarCaptura] = useState({ anticipo: "", cuota: "" });
  const [metodoAnticipo, cambiarMetodoAnticipo] =
    useState<MetodoPago>("EFECTIVO");
  const [retro, setRetro] = useState<ResultadoPractica | null>(null);
  return (
    <Marco
      pantalla="pedidos"
      titulo={es ? "Entregar PED-1042" : "Deliver PED-1042"}
      icono="cube"
      idioma={idioma}
      pasos={
        es
          ? ["Pedido", "Forma de venta", "Entrega"]
          : ["Order", "Sale type", "Delivery"]
      }
      pasoActual={
        valor.anticipo <= 0
          ? 0
          : valor.tipo === "CREDITO" && !valor.tarjeta
            ? 1
            : 2
      }
    >
      <View
        style={[estilos.ficha, { backgroundColor: tema.campoDeshabilitado }]}
      >
        <Dato etiqueta={es ? "Cliente" : "Customer"} valor="Ana López" />
        <Dato etiqueta={es ? "Producto" : "Product"} valor="Colcha Nórdica" />
        <Dato
          etiqueta={es ? "Proveedor (sólo lectura)" : "Supplier (read-only)"}
          valor="Textiles del Centro"
        />
        <Dato etiqueta="Total" valor="$1,000" />
      </View>
      <ConfiguracionVenta
        tipo={valor.tipo}
        montoTotal={1000}
        anticipo={captura.anticipo}
        metodoAnticipo={metodoAnticipo}
        periodicidad={valor.periodicidad || "SEMANAL"}
        cuota={captura.cuota}
        primerVencimiento={valor.primerVencimiento}
        numeroTarjeta={valor.tarjeta}
        es={es}
        alCambiarTipo={(tipo) => {
          const anticipo = tipo === "CONTADO" ? "1000" : "";
          cambiarCaptura((actual) => ({ ...actual, anticipo }));
          cambiar({ ...valor, tipo, anticipo: numeroCapturado(anticipo) });
        }}
        alCambiarAnticipo={(anticipo) => {
          cambiarCaptura((actual) => ({ ...actual, anticipo }));
          cambiar({ ...valor, anticipo: numeroCapturado(anticipo) });
        }}
        alCambiarMetodoAnticipo={cambiarMetodoAnticipo}
        alCambiarPeriodicidad={(periodicidad) =>
          cambiar({ ...valor, periodicidad })
        }
        alCambiarCuota={(cuota) => {
          cambiarCaptura((actual) => ({ ...actual, cuota }));
          cambiar({ ...valor, cuota: numeroCapturado(cuota) });
        }}
        alCambiarVencimiento={(primerVencimiento) =>
          cambiar({ ...valor, primerVencimiento })
        }
        alCambiarNumeroTarjeta={(tarjeta) => cambiar({ ...valor, tarjeta })}
      />
      <Boton
        texto={
          es ? "Confirmar entrega de práctica" : "Confirm practice delivery"
        }
        alPulsar={() => setRetro(validarEntregaPractica(valor))}
      />
      <Retro
        valor={retro}
        idioma={idioma}
        alCompletar={alCompletar}
        consecuencias={
          retro?.correcta
            ? [
                {
                  etiqueta: es ? "Pedido" : "Order",
                  valor: es ? "Listo → Entregado" : "Ready → Delivered",
                },
                {
                  etiqueta: es ? "Saldo" : "Balance",
                  valor: `$0 → $${valor.tipo === "CREDITO" ? 1000 - valor.anticipo : 0}`,
                },
                { etiqueta: es ? "Stock" : "Stock", valor: "2 → 1" },
              ]
            : undefined
        }
      />
    </Marco>
  );
}

function Devolucion({ idioma, alCompletar }: Propiedades) {
  const tema = usarTema();
  const es = idioma === "es";
  const [valor, cambiar] = useState<DevolucionPractica>({
    cantidad: 1,
    motivo: "",
    evidencia: false,
    autorizador: "",
    operadorCaja: "",
  });
  const [cantidadCapturada, cambiarCantidadCapturada] = useState("1");
  const [retro, setRetro] = useState<ResultadoPractica | null>(null);
  const importes = importesDevolucionPractica(valor.cantidad);
  return (
    <Marco
      pantalla="devoluciones"
      titulo={es ? "Devolución VTA-2048" : "Return VTA-2048"}
      icono="return-down-back"
      idioma={idioma}
      pasos={
        es
          ? ["Mercancía", "Evidencia", "Autorización"]
          : ["Goods", "Evidence", "Authorization"]
      }
      pasoActual={!valor.motivo ? 0 : !valor.evidencia ? 1 : 2}
    >
      <View
        style={[estilos.ficha, { backgroundColor: tema.campoDeshabilitado }]}
      >
        <Dato etiqueta={es ? "Cliente" : "Customer"} valor="Ana López" />
        <Dato etiqueta={es ? "Venta" : "Sale"} valor="2 Cobertores Roma" />
        <Dato etiqueta={es ? "Saldo" : "Balance"} valor="$600" />
      </View>
      <Campo
        etiqueta={es ? "Cantidad" : "Quantity"}
        valor={cantidadCapturada}
        numerico
        alCambiar={(cantidad) => {
          cambiarCantidadCapturada(cantidad);
          cambiar({ ...valor, cantidad: numeroCapturado(cantidad) });
        }}
      />
      <Campo
        etiqueta={es ? "Motivo detallado" : "Detailed reason"}
        valor={valor.motivo}
        alCambiar={(motivo) => cambiar({ ...valor, motivo })}
      />
      <Pressable
        style={[
          estilos.foto,
          { borderColor: tema.borde },
          valor.evidencia && {
            borderColor: tema.exito,
            backgroundColor: tema.exitoSuave,
          },
        ]}
        onPress={() => cambiar({ ...valor, evidencia: true })}
      >
        <Ionicons
          name="camera"
          size={25}
          color={valor.evidencia ? tema.exito : tema.textoTenue}
        />
        <Text
          style={[
            valor.evidencia ? estilos.fotoTextoLista : estilos.fotoTexto,
            { color: valor.evidencia ? tema.exito : tema.textoSecundario },
          ]}
        >
          {valor.evidencia
            ? es
              ? "evidencia-devolucion.jpg adjunta"
              : "return-evidence.jpg attached"
            : es
              ? "Adjuntar foto de evidencia"
              : "Attach evidence photo"}
        </Text>
      </Pressable>
      <Selector
        etiqueta={es ? "Autoriza" : "Authorized by"}
        opciones={[
          {
            valor: "ADMINISTRADOR",
            texto: es ? "Administración" : "Administration",
          },
          { valor: "CONTABLE", texto: es ? "Contabilidad" : "Accounting" },
          {
            valor: "ALMACENISTA",
            texto: es ? "Almacén (sin permiso)" : "Warehouse (not allowed)",
          },
        ]}
        valor={valor.autorizador}
        alCambiar={(autorizador) =>
          cambiar({
            ...valor,
            autorizador: autorizador as DevolucionPractica["autorizador"],
          })
        }
      />
      <Selector
        etiqueta={es ? "Caja que entrega el dinero" : "Cash desk issuing money"}
        opciones={[
          {
            valor: "ADMINISTRADOR",
            texto: es ? "Caja Administración" : "Administration cash desk",
          },
          {
            valor: "COBRADOR",
            texto: es ? "Caja Cobrador" : "Collector cash desk",
          },
          {
            valor: "CONTABLE",
            texto: es
              ? "Contabilidad (no opera caja)"
              : "Accounting (no cash desk)",
          },
        ]}
        valor={valor.operadorCaja}
        alCambiar={(operadorCaja) =>
          cambiar({
            ...valor,
            operadorCaja: operadorCaja as DevolucionPractica["operadorCaja"],
          })
        }
      />
      <Resumen
        filas={[
          [es ? "Importe" : "Amount", `$${importes.total}`],
          [es ? "Compensa saldo" : "Offsets balance", `$${importes.saldo}`],
          [es ? "Reembolso" : "Refund", `$${importes.reembolso}`],
        ]}
      />
      <Boton
        texto={
          es ? "Autorizar devolución de práctica" : "Authorize practice return"
        }
        alPulsar={() => setRetro(validarDevolucionPractica(valor))}
      />
      <Retro
        valor={retro}
        idioma={idioma}
        alCompletar={alCompletar}
        consecuencias={
          retro?.correcta
            ? [
                {
                  etiqueta: es ? "Saldo" : "Balance",
                  valor: `$600 → $${600 - importes.saldo}`,
                },
                {
                  etiqueta: es ? "Inventario" : "Stock",
                  valor: `5 → ${5 + valor.cantidad}`,
                },
                {
                  etiqueta: es ? "Caja" : "Cash desk",
                  valor: `$900 → $${900 - importes.reembolso}`,
                },
              ]
            : undefined
        }
      />
    </Marco>
  );
}

function Sincronizacion({ idioma, alCompletar }: Propiedades) {
  const tema = usarTema();
  const es = idioma === "es";
  const [enviado, setEnviado] = useState(false);
  const [decision, setDecision] = useState<DecisionConflicto>("");
  const [retro, setRetro] = useState<ResultadoPractica | null>(null);
  return (
    <Marco
      pantalla="sincronización"
      titulo={es ? "3 movimientos pendientes" : "3 pending operations"}
      icono="cloud-upload"
      idioma={idioma}
      pasos={
        es
          ? ["Pendientes", "Conflicto", "Resultado"]
          : ["Pending", "Conflict", "Result"]
      }
      pasoActual={!enviado ? 0 : retro?.correcta ? 2 : 1}
    >
      <Operacion
        titulo={es ? "Abono LOC-801" : "Payment LOC-801"}
        detalle="$300 · Ana López"
        estado={
          enviado
            ? es
              ? "CONFIRMADO"
              : "CONFIRMED"
            : es
              ? "PENDIENTE"
              : "PENDING"
        }
        error={false}
      />
      <Operacion
        titulo={es ? "Venta LOC-802" : "Sale LOC-802"}
        detalle={
          es
            ? "Colcha Viena · stock local 1"
            : "Vienna bedspread · local stock 1"
        }
        estado={
          enviado
            ? es
              ? "CONFLICTO"
              : "CONFLICT"
            : es
              ? "PENDIENTE"
              : "PENDING"
        }
        error={enviado}
      />
      <Operacion
        titulo={es ? "Visita LOC-803" : "Visit LOC-803"}
        detalle={
          es ? "No abonó · evidencia local" : "No payment · local evidence"
        }
        estado={
          enviado
            ? es
              ? "CONFIRMADA"
              : "CONFIRMED"
            : es
              ? "PENDIENTE"
              : "PENDING"
        }
        error={false}
      />
      {!enviado ? (
        <Boton
          texto={
            es
              ? "Enviar pendientes de práctica"
              : "Send practice pending operations"
          }
          alPulsar={() => {
            setEnviado(true);
            setRetro(null);
          }}
        />
      ) : (
        <>
          <View
            style={[estilos.conflicto, { backgroundColor: tema.peligroSuave }]}
          >
            <Ionicons name="warning" size={20} color={tema.peligro} />
            <Text style={[estilos.conflictoTexto, { color: tema.peligro }]}>
              {es
                ? "Servidor: stock 0. El teléfono intentó vender 1. Los otros dos movimientos sí fueron aceptados."
                : "Server: stock 0. The phone attempted to sell 1. The other two operations were accepted."}
            </Text>
          </View>
          <Selector
            etiqueta={es ? "Decisión sobre el conflicto" : "Conflict decision"}
            opciones={[
              {
                valor: "BORRAR",
                texto: es ? "Borrar movimiento" : "Delete operation",
              },
              { valor: "FORZAR", texto: es ? "Forzar venta" : "Force sale" },
              {
                valor: "REVISAR",
                texto: es
                  ? "Conservar folio y enviar a revisión"
                  : "Keep receipt and send for review",
              },
            ]}
            valor={decision}
            alCambiar={(opcion) => setDecision(opcion as DecisionConflicto)}
          />
          <Boton
            texto={es ? "Resolver decisión" : "Resolve decision"}
            alPulsar={() =>
              setRetro(validarSincronizacionPractica(enviado, decision))
            }
          />
        </>
      )}
      <Retro
        valor={retro}
        idioma={idioma}
        alCompletar={alCompletar}
        consecuencias={
          retro?.correcta
            ? [
                { etiqueta: es ? "Confirmadas" : "Confirmed", valor: "2" },
                { etiqueta: es ? "En revisión" : "In review", valor: "1" },
                {
                  etiqueta: es ? "Evidencia borrada" : "Deleted evidence",
                  valor: "0",
                },
              ]
            : undefined
        }
      />
    </Marco>
  );
}

interface Propiedades {
  idioma: Idioma;
  alCompletar: () => void;
}

function numeroCapturado(valor: string) {
  if (!valor.trim()) return 0;
  const numero = Number(valor.replace(",", "."));
  return Number.isFinite(numero) ? numero : 0;
}

function Seccion({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <TarjetaMovil estilo={estilos.seccion}>
      <TituloSeccion texto={titulo} />
      {children}
    </TarjetaMovil>
  );
}

function TituloSeccion({ texto }: { texto: string }) {
  const tema = usarTema();
  return (
    <Text style={[estilos.seccionTitulo, { color: tema.texto }]}>{texto}</Text>
  );
}

function Campo({
  etiqueta,
  valor,
  alCambiar,
  numerico,
}: {
  etiqueta: string;
  valor: string;
  alCambiar: (valor: string) => void;
  numerico?: boolean;
}) {
  return (
    <CampoMovil
      etiqueta={etiqueta}
      valor={valor}
      alCambiar={alCambiar}
      teclado={numerico ? "decimal-pad" : "default"}
      estilo={estilos.campoGrupo}
    />
  );
}

function Selector({
  etiqueta,
  valor,
  opciones,
  alCambiar,
}: {
  etiqueta: string;
  valor: string;
  opciones: { valor: string; texto: string }[];
  alCambiar: (valor: string) => void;
}) {
  const tema = usarTema();
  return (
    <View style={estilos.campoGrupo}>
      <Text style={[estilos.etiqueta, { color: tema.textoSecundario }]}>
        {etiqueta}
      </Text>
      <View style={estilos.opciones}>
        {opciones.map((opcion) => (
          <Pressable
            key={opcion.valor}
            accessibilityRole="button"
            accessibilityLabel={opcion.texto}
            onPress={() => alCambiar(opcion.valor)}
            style={[
              estilos.opcion,
              {
                borderColor: tema.borde,
                backgroundColor: tema.campo,
              },
              valor === opcion.valor && {
                backgroundColor: tema.primario,
                borderColor: tema.primario,
              },
            ]}
          >
            <Text
              style={
                valor === opcion.valor
                  ? [estilos.opcionTextoActivo, { color: tema.sobrePrimario }]
                  : { color: tema.texto, fontSize: 13, fontWeight: "700" }
              }
            >
              {opcion.texto}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function Boton({ texto, alPulsar }: { texto: string; alPulsar: () => void }) {
  return (
    <BotonMovil
      texto={texto}
      alPulsar={alPulsar}
      icono="arrow-forward"
      estilo={estilos.boton}
    />
  );
}

function Resumen({ filas }: { filas: [string, string][] }) {
  const tema = usarTema();
  return (
    <View
      style={[estilos.resumen, { backgroundColor: tema.campoDeshabilitado }]}
    >
      {filas.map(([etiqueta, valor]) => (
        <View key={etiqueta} style={estilos.resumenFila}>
          <Text
            style={[estilos.resumenEtiqueta, { color: tema.textoSecundario }]}
          >
            {etiqueta}
          </Text>
          <Text style={[estilos.resumenValor, { color: tema.texto }]}>
            {valor}
          </Text>
        </View>
      ))}
    </View>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  const tema = usarTema();
  return (
    <View style={{ flexGrow: 1, minWidth: 120 }}>
      <Text style={[estilos.datoEtiqueta, { color: tema.textoSecundario }]}>
        {etiqueta}
      </Text>
      <Text style={[estilos.datoValor, { color: tema.texto }]}>{valor}</Text>
    </View>
  );
}

function Operacion({
  titulo,
  detalle,
  estado,
  error,
}: {
  titulo: string;
  detalle: string;
  estado: string;
  error: boolean;
}) {
  const tema = usarTema();
  return (
    <View
      style={[
        estilos.operacion,
        {
          backgroundColor: tema.campo,
          borderColor: tema.borde,
        },
      ]}
    >
      <View style={estilos.operacionContenido}>
        <Text style={[estilos.operacionTitulo, { color: tema.texto }]}>
          {titulo}
        </Text>
        <Text style={[estilos.nota, { color: tema.textoSecundario }]}>
          {detalle}
        </Text>
      </View>
      <Text
        style={[
          estilos.estado,
          {
            color: error ? tema.peligro : tema.advertencia,
            backgroundColor: error ? tema.peligroSuave : tema.advertenciaSuave,
          },
        ]}
      >
        {estado}
      </Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  marco: { borderWidth: 1, borderRadius: 20, padding: 16, marginTop: 18 },
  cabecera: { flexDirection: "row", alignItems: "center", gap: 11 },
  icono: {
    width: 43,
    height: 43,
    borderRadius: 12,
    backgroundColor: colores.azul,
    alignItems: "center",
    justifyContent: "center",
  },
  pantalla: {
    color: colores.azul,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1,
  },
  titulo: { fontSize: 19, fontWeight: "900", marginTop: 3 },
  seguro: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
    marginTop: 13,
  },
  seguroTexto: { fontSize: 12, fontWeight: "900" },
  pasos: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginTop: 13,
  },
  pasosApilados: { flexDirection: "column" },
  paso: {
    flex: 1,
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 11,
    paddingHorizontal: 8,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  pasoApilado: { flex: 0, width: "100%", minHeight: 56 },
  pasoNumero: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  pasoNumeroTexto: { color: colores.gris, fontSize: 12, fontWeight: "900" },
  pasoTexto: { flex: 1, fontSize: 13, lineHeight: 19, fontWeight: "800" },
  seccion: { borderWidth: 1, borderRadius: 14, padding: 13, marginTop: 14 },
  seccionTitulo: { fontSize: 14, fontWeight: "900" },
  campoGrupo: { marginTop: 13 },
  etiqueta: {
    color: colores.gris,
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 6,
  },
  opciones: { gap: 7 },
  opcion: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    justifyContent: "center",
  },
  opcionActiva: { backgroundColor: colores.azul, borderColor: colores.azul },
  opcionTextoActivo: { color: "white", fontSize: 13, fontWeight: "800" },
  saldo: {
    borderRadius: 13,
    backgroundColor: colores.azulClaro,
    padding: 15,
    marginTop: 14,
  },
  saldoEtiqueta: { color: colores.azul, fontSize: 12, fontWeight: "900" },
  saldoValor: {
    color: colores.azul,
    fontSize: 27,
    fontWeight: "900",
    marginTop: 3,
  },
  formularioReal: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 13,
    marginTop: 14,
  },
  componenteReal: {
    color: colores.azul,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.7,
  },
  nota: { color: colores.gris, fontSize: 12, lineHeight: 17, marginTop: 3 },
  resumen: {
    borderRadius: 13,
    padding: 14,
    marginTop: 15,
    gap: 8,
  },
  resumenFila: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 10,
  },
  resumenEtiqueta: { color: colores.gris, fontSize: 13, flexShrink: 1 },
  resumenValor: { color: colores.azulOscuro, fontSize: 14, fontWeight: "900" },
  boton: {
    marginTop: 15,
  },
  retro: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 13,
    marginTop: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
  },
  bienTitulo: { fontSize: 14, fontWeight: "900" },
  malTitulo: { fontSize: 14, fontWeight: "900" },
  retroTexto: { fontSize: 13, lineHeight: 19, marginTop: 3 },
  metricas: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 },
  metrica: {
    minWidth: 95,
    flexGrow: 1,
    borderRadius: 9,
    padding: 8,
  },
  metricaEtiqueta: { color: colores.gris, fontSize: 12, fontWeight: "900" },
  metricaValor: {
    color: colores.azul,
    fontSize: 14,
    fontWeight: "900",
    marginTop: 2,
  },
  ficha: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 11,
    borderRadius: 13,
    padding: 14,
    marginTop: 14,
  },
  datoEtiqueta: { color: colores.gris, fontSize: 12, fontWeight: "900" },
  datoValor: {
    color: colores.azulOscuro,
    fontSize: 13,
    fontWeight: "800",
    marginTop: 3,
  },
  foto: {
    minHeight: 86,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: colores.borde,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
  },
  fotoTexto: {
    color: colores.gris,
    fontSize: 13,
    fontWeight: "800",
    marginTop: 5,
  },
  fotoTextoLista: {
    fontSize: 13,
    fontWeight: "800",
    marginTop: 5,
  },
  operacion: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 9,
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: 12,
    padding: 12,
    marginTop: 9,
  },
  operacionContenido: { flexGrow: 1, flexShrink: 1, minWidth: 180 },
  operacionTitulo: {
    color: colores.azulOscuro,
    fontSize: 14,
    fontWeight: "900",
  },
  estado: {
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 4,
    fontSize: 12,
    fontWeight: "900",
  },
  conflicto: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderRadius: 12,
    padding: 13,
    marginTop: 13,
  },
  conflictoTexto: { flex: 1, fontSize: 13, lineHeight: 19 },
});
