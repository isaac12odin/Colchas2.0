import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import { BotonMovil, CampoMovil } from "../../../componentes/ui";
import { TarjetaProductoMovil } from "../../inventario/TarjetaProductoMovil";
import { TarjetaClienteJornada } from "../../jornada/TarjetaClienteJornada";
import { TarjetaPedido } from "../../pedidos/TarjetaPedido";
import { Dato, PanelAccion, type PanelProps } from "./componentesReplica";
import {
  clientePractica,
  estadoPedidoParaControl,
  pedidoPractica,
  productoPractica,
} from "./dominioReplica";
import { estilosReplica as estilos } from "./estilosReplica";

export function PanelPedidos({
  control,
  es,
  tema,
  busqueda,
  buscar,
  acertar,
  fallar,
}: PanelProps & { busqueda: string; buscar: (valor: string) => void }) {
  if (control === "PEDIDO_CLIENTE")
    return (
      <>
        <Text style={[estilos.titulo, { color: tema.texto }]}>
          {es ? "Nuevo pedido · Cliente" : "New order · Customer"}
        </Text>
        <TarjetaClienteJornada
          cliente={clientePractica}
          es={es}
          tema={tema}
          alAbrir={acertar}
        />
      </>
    );
  if (control === "PEDIDO_PRODUCTO")
    return (
      <>
        <Text style={[estilos.titulo, { color: tema.texto }]}>
          {es ? "Nuevo pedido · Producto" : "New order · Product"}
        </Text>
        <CampoMovil
          etiqueta={es ? "Producto registrado" : "Registered product"}
          placeholder={es ? "Nombre, SKU o código" : "Name, SKU, or code"}
          icono="search"
          valor={busqueda}
          alCambiar={buscar}
        />
        <TarjetaProductoMovil
          producto={productoPractica}
          tema={tema}
          es={es}
          alEditar={fallar}
        />
      </>
    );
  if (control === "PEDIDO_GUARDAR")
    return (
      <PanelAccion tema={tema}>
        <Dato etiqueta={es ? "Cliente" : "Customer"} valor="Ana López" />
        <Dato
          etiqueta={es ? "Producto" : "Product"}
          valor="1 × Colcha Viena azul"
        />
        <Dato
          etiqueta={es ? "Estado" : "Status"}
          valor={es ? "Pendiente de pedir" : "Pending supplier"}
        />
        <BotonMovil
          texto={es ? "Guardar pedido pendiente" : "Save pending order"}
          icono="save-outline"
          alPulsar={acertar}
        />
      </PanelAccion>
    );
  if (control === "PEDIDO_ELEGIR_PROVEEDOR")
    return (
      <PanelAccion tema={tema}>
        <Dato
          etiqueta={es ? "Artículo" : "Item"}
          valor="1 × Colcha Viena azul"
        />
        <Pressable
          accessibilityRole="button"
          onPress={acertar}
          style={[
            estilos.selector,
            { borderColor: tema.primario, backgroundColor: tema.campo },
          ]}
        >
          <View style={estilos.expandir}>
            <Text
              style={[estilos.datoEtiqueta, { color: tema.textoSecundario }]}
            >
              {es ? "Proveedor" : "Supplier"}
            </Text>
            <Text style={[estilos.datoValor, { color: tema.texto }]}>
              {es ? "Elegir proveedor" : "Choose supplier"}
            </Text>
          </View>
          <Ionicons name="chevron-down" size={20} color={tema.primario} />
        </Pressable>
      </PanelAccion>
    );
  if (control === "PEDIDO_CONFIRMAR_PROVEEDOR")
    return (
      <PanelAccion tema={tema}>
        <Dato
          etiqueta={es ? "Proveedor asignado" : "Assigned supplier"}
          valor="Textiles del Centro"
        />
        <BotonMovil
          texto={
            es ? "Confirmar pedido al proveedor" : "Confirm supplier order"
          }
          icono="business-outline"
          alPulsar={acertar}
        />
      </PanelAccion>
    );
  if (control === "PEDIDO_COMPARAR")
    return (
      <PanelAccion tema={tema}>
        <Dato
          etiqueta={es ? "Esperado" : "Expected"}
          valor="1 × Colcha Viena azul"
        />
        <View style={estilos.filaBotones}>
          <BotonMovil
            texto={es ? "No coincide" : "Mismatch"}
            variante="secundario"
            expandido={false}
            estilo={estilos.botonMitad}
            alPulsar={fallar}
          />
          <BotonMovil
            texto={
              es ? "Producto y cantidad coinciden" : "Item and quantity match"
            }
            expandido={false}
            estilo={estilos.botonMitad}
            alPulsar={acertar}
          />
        </View>
      </PanelAccion>
    );
  const estado = estadoPedidoParaControl(control);
  return (
    <>
      <Text style={[estilos.titulo, { color: tema.texto }]}>Pedidos</Text>
      <TarjetaPedido
        pedido={pedidoPractica(estado)}
        es={es}
        tema={tema}
        puedeAlmacen={
          control === "PEDIDO_RECIBIR" || control === "PEDIDO_LISTO"
        }
        puedeAsignarProveedor={control === "PEDIDO_ASIGNAR"}
        puedeEntregar={false}
        alAvanzar={
          control === "PEDIDO_RECIBIR" || control === "PEDIDO_LISTO"
            ? acertar
            : fallar
        }
        alAsignarProveedor={control === "PEDIDO_ASIGNAR" ? acertar : fallar}
        alEntregar={fallar}
      />
    </>
  );
}
