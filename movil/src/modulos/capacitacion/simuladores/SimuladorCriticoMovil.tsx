import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { ConfiguracionVenta } from "../../ventas/ConfiguracionVenta";
import { colores, usarTema } from "../../../tema";
import type { TipoSimuladorCapacitacionMovil } from "../catalogo";
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
  children,
}: {
  pantalla: string;
  titulo: string;
  icono: keyof typeof Ionicons.glyphMap;
  idioma: Idioma;
  children: React.ReactNode;
}) {
  const tema = usarTema();
  const es = idioma === "es";
  return (
    <View
      style={[
        estilos.marco,
        { backgroundColor: tema.panel, borderColor: tema.borde },
      ]}
    >
      <View style={estilos.cabecera}>
        <View style={estilos.icono}>
          <Ionicons name={icono} size={21} color="white" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={estilos.pantalla}>
            VEKTRA · {pantalla.toUpperCase()}
          </Text>
          <Text style={[estilos.titulo, { color: tema.texto }]}>{titulo}</Text>
        </View>
      </View>
      <View style={estilos.seguro}>
        <Ionicons name="shield-checkmark" size={15} color={colores.verde} />
        <Text style={estilos.seguroTexto}>
          {es ? "DATOS DE PRÁCTICA · SIN API" : "PRACTICE DATA · NO API"}
        </Text>
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
  if (!valor) return null;
  const es = idioma === "es";
  return (
    <View style={[estilos.retro, valor.correcta ? estilos.bien : estilos.mal]}>
      <Ionicons
        name={valor.correcta ? "checkmark-circle" : "alert-circle"}
        size={21}
        color={valor.correcta ? colores.verde : colores.rojo}
      />
      <View style={{ flex: 1 }}>
        <Text style={valor.correcta ? estilos.bienTitulo : estilos.malTitulo}>
          {valor.correcta
            ? es
              ? "Decisión correcta"
              : "Correct decision"
            : es
              ? "Corrige esta decisión"
              : "Correct this decision"}
        </Text>
        <Text style={estilos.retroTexto}>{valor.mensaje[idioma]}</Text>
        {valor.correcta && consecuencias && (
          <View style={estilos.metricas}>
            {consecuencias.map((item) => (
              <View key={item.etiqueta} style={estilos.metrica}>
                <Text style={estilos.metricaEtiqueta}>{item.etiqueta}</Text>
                <Text style={estilos.metricaValor}>{item.valor}</Text>
              </View>
            ))}
          </View>
        )}
        {valor.correcta && (
          <Pressable
            style={[estilos.boton, { marginTop: 13 }]}
            onPress={alCompletar}
          >
            <Ionicons name="checkmark" size={18} color="white" />
            <Text style={estilos.botonTexto}>
              {es ? "Completar práctica" : "Complete practice"}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function VentaCredito({ idioma, alCompletar }: Propiedades) {
  const tema = usarTema();
  const es = idioma === "es";
  const [valor, cambiar] = useState<VentaCreditoPractica>({
    cliente: "",
    producto: "",
    cantidad: 1,
    anticipo: 0,
    tarjeta: "",
    cuota: 0,
    periodicidad: "",
    vencimiento: fechaSugeridaEntregaPractica(),
  });
  const [retro, setRetro] = useState<ResultadoPractica | null>(null);
  const total = valor.cantidad * 1200;
  return (
    <Marco
      pantalla="venta"
      titulo={es ? "Nueva venta a crédito" : "New credit sale"}
      icono="cart"
      idioma={idioma}
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
          valor={String(valor.cantidad)}
          numerico
          alCambiar={(cantidad) =>
            cambiar({ ...valor, cantidad: Number(cantidad) })
          }
        />
      </Seccion>
      <ConfiguracionVenta
        tipo="CREDITO"
        montoTotal={total}
        anticipo={String(valor.anticipo)}
        periodicidad={valor.periodicidad || "SEMANAL"}
        cuota={String(valor.cuota)}
        primerVencimiento={valor.vencimiento}
        numeroTarjeta={valor.tarjeta}
        es={es}
        tema={tema}
        alCambiarTipo={() => undefined}
        alCambiarAnticipo={(anticipo) =>
          cambiar({ ...valor, anticipo: Number(anticipo) })
        }
        alCambiarPeriodicidad={(periodicidad) =>
          cambiar({ ...valor, periodicidad })
        }
        alCambiarCuota={(cuota) => cambiar({ ...valor, cuota: Number(cuota) })}
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
  const es = idioma === "es";
  const [valor, cambiar] = useState<AbonoPractica>({
    cliente: "",
    monto: 0,
    metodo: "EFECTIVO",
    referencia: "",
  });
  const [retro, setRetro] = useState<ResultadoPractica | null>(null);
  return (
    <Marco
      pantalla="jornada"
      titulo={es ? "Registrar abono" : "Record payment"}
      icono="cash"
      idioma={idioma}
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
      <View style={estilos.saldo}>
        <Text style={estilos.saldoEtiqueta}>
          {es ? "SALDO ACTUAL" : "CURRENT BALANCE"}
        </Text>
        <Text style={estilos.saldoValor}>$800.00</Text>
        <Text style={estilos.nota}>
          {es
            ? "Pedido pendiente: todavía no forma parte del saldo"
            : "Pending order: not part of balance yet"}
        </Text>
      </View>
      <Campo
        etiqueta={es ? "Monto del abono" : "Payment amount"}
        valor={String(valor.monto)}
        numerico
        alCambiar={(monto) => cambiar({ ...valor, monto: Number(monto) })}
      />
      <Selector
        etiqueta={es ? "Método" : "Method"}
        opciones={[
          { valor: "EFECTIVO", texto: es ? "Efectivo" : "Cash" },
          { valor: "TRANSFERENCIA", texto: es ? "Transferencia" : "Transfer" },
          { valor: "TARJETA", texto: es ? "Tarjeta" : "Card" },
        ]}
        valor={valor.metodo}
        alCambiar={(metodo) =>
          cambiar({ ...valor, metodo: metodo as AbonoPractica["metodo"] })
        }
      />
      {valor.metodo !== "EFECTIVO" && (
        <Campo
          etiqueta={es ? "Referencia" : "Reference"}
          valor={valor.referencia}
          alCambiar={(referencia) => cambiar({ ...valor, referencia })}
        />
      )}
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
      <Boton
        texto={es ? "Guardar abono de práctica" : "Save practice payment"}
        alPulsar={() => setRetro(validarAbonoPractica(valor))}
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
    periodicidad: "",
    primerVencimiento: fechaSugeridaEntregaPractica(),
  });
  const [retro, setRetro] = useState<ResultadoPractica | null>(null);
  return (
    <Marco
      pantalla="pedidos"
      titulo={es ? "Entregar PED-1042" : "Deliver PED-1042"}
      icono="cube"
      idioma={idioma}
    >
      <View style={estilos.ficha}>
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
        anticipo={String(valor.anticipo)}
        periodicidad={valor.periodicidad || "SEMANAL"}
        cuota={String(valor.cuota)}
        primerVencimiento={valor.primerVencimiento}
        numeroTarjeta={valor.tarjeta}
        es={es}
        tema={tema}
        alCambiarTipo={(tipo) =>
          cambiar({ ...valor, tipo, anticipo: tipo === "CONTADO" ? 1000 : 0 })
        }
        alCambiarAnticipo={(anticipo) =>
          cambiar({ ...valor, anticipo: Number(anticipo) })
        }
        alCambiarPeriodicidad={(periodicidad) =>
          cambiar({ ...valor, periodicidad })
        }
        alCambiarCuota={(cuota) => cambiar({ ...valor, cuota: Number(cuota) })}
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
  const es = idioma === "es";
  const [valor, cambiar] = useState<DevolucionPractica>({
    cantidad: 1,
    motivo: "",
    evidencia: false,
    autorizador: "",
    operadorCaja: "",
  });
  const [retro, setRetro] = useState<ResultadoPractica | null>(null);
  const importes = importesDevolucionPractica(valor.cantidad);
  return (
    <Marco
      pantalla="devoluciones"
      titulo={es ? "Devolución VTA-2048" : "Return VTA-2048"}
      icono="return-down-back"
      idioma={idioma}
    >
      <View style={estilos.ficha}>
        <Dato etiqueta={es ? "Cliente" : "Customer"} valor="Ana López" />
        <Dato etiqueta={es ? "Venta" : "Sale"} valor="2 Cobertores Roma" />
        <Dato etiqueta={es ? "Saldo" : "Balance"} valor="$600" />
      </View>
      <Campo
        etiqueta={es ? "Cantidad" : "Quantity"}
        valor={String(valor.cantidad)}
        numerico
        alCambiar={(cantidad) =>
          cambiar({ ...valor, cantidad: Number(cantidad) })
        }
      />
      <Campo
        etiqueta={es ? "Motivo detallado" : "Detailed reason"}
        valor={valor.motivo}
        alCambiar={(motivo) => cambiar({ ...valor, motivo })}
      />
      <Pressable
        style={[estilos.foto, valor.evidencia && estilos.fotoLista]}
        onPress={() => cambiar({ ...valor, evidencia: true })}
      >
        <Ionicons
          name="camera"
          size={25}
          color={valor.evidencia ? colores.verde : colores.gris}
        />
        <Text
          style={valor.evidencia ? estilos.fotoTextoLista : estilos.fotoTexto}
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
          <View style={estilos.conflicto}>
            <Ionicons name="warning" size={20} color={colores.rojo} />
            <Text style={estilos.conflictoTexto}>
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

function Seccion({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  const tema = usarTema();
  return (
    <View style={[estilos.seccion, { borderColor: tema.borde }]}>
      <Text style={[estilos.seccionTitulo, { color: tema.texto }]}>
        {titulo}
      </Text>
      {children}
    </View>
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
  const tema = usarTema();
  return (
    <View style={estilos.campoGrupo}>
      <Text style={estilos.etiqueta}>{etiqueta}</Text>
      <TextInput
        accessibilityLabel={etiqueta}
        style={[estilos.campo, { borderColor: tema.borde, color: tema.texto }]}
        value={valor}
        onChangeText={alCambiar}
        keyboardType={numerico ? "decimal-pad" : "default"}
        placeholderTextColor={colores.gris}
      />
    </View>
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
      <Text style={estilos.etiqueta}>{etiqueta}</Text>
      <View style={estilos.opciones}>
        {opciones.map((opcion) => (
          <Pressable
            key={opcion.valor}
            accessibilityRole="button"
            accessibilityLabel={opcion.texto}
            onPress={() => alCambiar(opcion.valor)}
            style={[
              estilos.opcion,
              { borderColor: tema.borde },
              valor === opcion.valor && estilos.opcionActiva,
            ]}
          >
            <Text
              style={
                valor === opcion.valor
                  ? estilos.opcionTextoActivo
                  : { color: tema.texto, fontSize: 12, fontWeight: "700" }
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
    <Pressable style={estilos.boton} onPress={alPulsar}>
      <Text style={estilos.botonTexto}>{texto}</Text>
      <Ionicons name="arrow-forward" size={18} color="white" />
    </Pressable>
  );
}

function Resumen({ filas }: { filas: [string, string][] }) {
  return (
    <View style={estilos.resumen}>
      {filas.map(([etiqueta, valor]) => (
        <View key={etiqueta} style={estilos.resumenFila}>
          <Text style={estilos.resumenEtiqueta}>{etiqueta}</Text>
          <Text style={estilos.resumenValor}>{valor}</Text>
        </View>
      ))}
    </View>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <View style={{ flexGrow: 1, minWidth: 120 }}>
      <Text style={estilos.datoEtiqueta}>{etiqueta}</Text>
      <Text style={estilos.datoValor}>{valor}</Text>
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
  return (
    <View style={estilos.operacion}>
      <View style={{ flex: 1 }}>
        <Text style={estilos.operacionTitulo}>{titulo}</Text>
        <Text style={estilos.nota}>{detalle}</Text>
      </View>
      <Text style={[estilos.estado, error && estilos.estadoError]}>
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
    fontSize: 9,
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
    backgroundColor: "#defbe6",
    paddingHorizontal: 9,
    paddingVertical: 5,
    marginTop: 13,
  },
  seguroTexto: { color: "#0e6027", fontSize: 8, fontWeight: "900" },
  seccion: { borderWidth: 1, borderRadius: 14, padding: 13, marginTop: 14 },
  seccionTitulo: { fontSize: 14, fontWeight: "900" },
  campoGrupo: { marginTop: 13 },
  etiqueta: {
    color: colores.gris,
    fontSize: 10,
    fontWeight: "800",
    marginBottom: 6,
  },
  campo: {
    borderWidth: 1,
    borderRadius: 10,
    minHeight: 45,
    paddingHorizontal: 11,
  },
  opciones: { gap: 7 },
  opcion: { borderWidth: 1, borderRadius: 10, padding: 11 },
  opcionActiva: { backgroundColor: colores.azul, borderColor: colores.azul },
  opcionTextoActivo: { color: "white", fontSize: 12, fontWeight: "800" },
  saldo: {
    borderRadius: 13,
    backgroundColor: colores.azulClaro,
    padding: 15,
    marginTop: 14,
  },
  saldoEtiqueta: { color: colores.azul, fontSize: 9, fontWeight: "900" },
  saldoValor: {
    color: colores.azul,
    fontSize: 27,
    fontWeight: "900",
    marginTop: 3,
  },
  nota: { color: colores.gris, fontSize: 10, lineHeight: 15, marginTop: 3 },
  resumen: {
    borderRadius: 13,
    backgroundColor: "#f4f4f4",
    padding: 14,
    marginTop: 15,
    gap: 8,
  },
  resumenFila: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  resumenEtiqueta: { color: colores.gris, fontSize: 11 },
  resumenValor: { color: colores.azulOscuro, fontSize: 12, fontWeight: "900" },
  boton: {
    minHeight: 47,
    borderRadius: 11,
    backgroundColor: colores.azul,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingHorizontal: 14,
    marginTop: 15,
  },
  botonTexto: { color: "white", fontSize: 12, fontWeight: "900" },
  retro: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 13,
    marginTop: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
  },
  bien: { borderColor: "#42be65", backgroundColor: "#defbe6" },
  mal: { borderColor: "#fa4d56", backgroundColor: "#fff1f1" },
  bienTitulo: { color: "#0e6027", fontSize: 12, fontWeight: "900" },
  malTitulo: { color: "#a2191f", fontSize: 12, fontWeight: "900" },
  retroTexto: { color: "#262626", fontSize: 11, lineHeight: 17, marginTop: 3 },
  metricas: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 },
  metrica: {
    minWidth: 95,
    flexGrow: 1,
    borderRadius: 9,
    backgroundColor: "white",
    padding: 8,
  },
  metricaEtiqueta: { color: colores.gris, fontSize: 8, fontWeight: "900" },
  metricaValor: {
    color: colores.azul,
    fontSize: 12,
    fontWeight: "900",
    marginTop: 2,
  },
  ficha: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 11,
    borderRadius: 13,
    backgroundColor: "#f4f4f4",
    padding: 14,
    marginTop: 14,
  },
  datoEtiqueta: { color: colores.gris, fontSize: 8, fontWeight: "900" },
  datoValor: {
    color: colores.azulOscuro,
    fontSize: 11,
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
  fotoLista: { borderColor: colores.verde, backgroundColor: "#defbe6" },
  fotoTexto: {
    color: colores.gris,
    fontSize: 11,
    fontWeight: "800",
    marginTop: 5,
  },
  fotoTextoLista: {
    color: "#0e6027",
    fontSize: 11,
    fontWeight: "800",
    marginTop: 5,
  },
  operacion: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: 12,
    padding: 12,
    marginTop: 9,
  },
  operacionTitulo: {
    color: colores.azulOscuro,
    fontSize: 12,
    fontWeight: "900",
  },
  estado: {
    color: "#8a5a00",
    backgroundColor: "#fff4ce",
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 4,
    fontSize: 7,
    fontWeight: "900",
  },
  estadoError: { color: "#a2191f", backgroundColor: "#fff1f1" },
  conflicto: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderRadius: 12,
    backgroundColor: "#fff1f1",
    padding: 13,
    marginTop: 13,
  },
  conflictoTexto: { flex: 1, color: "#750e13", fontSize: 11, lineHeight: 17 },
});
