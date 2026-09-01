import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import { BotonMovil, CampoMovil } from "../../../componentes/ui";
import { TarjetaProductoMovil } from "../../inventario/TarjetaProductoMovil";
import { BarraEstadoJornada } from "../../jornada/BarraEstadoJornada";
import { TarjetaClienteJornada } from "../../jornada/TarjetaClienteJornada";
import type { PanelProps } from "./componentesReplica";
import { clientePractica, productoPractica } from "./dominioReplica";
import { estilosReplica as estilos } from "./estilosReplica";

export function PanelRutas({ control, es, tema, acertar, fallar }: PanelProps) {
  if (control === "RUTA_ABRIR")
    return (
      <>
        <BarraEstadoJornada
          offline={false}
          pendientes={0}
          es={es}
          alVerPendientes={fallar}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={es ? "Abrir Ruta Norte" : "Open North Route"}
          onPress={acertar}
          style={({ pressed }) => [
            estilos.tarjetaRuta,
            {
              backgroundColor: tema.panel,
              borderColor: tema.primario,
              opacity: pressed ? 0.74 : 1,
            },
          ]}
        >
          <View
            style={[estilos.iconoRuta, { backgroundColor: tema.primarioSuave }]}
          >
            <Ionicons name="map" size={24} color={tema.primario} />
          </View>
          <View style={estilos.expandir}>
            <Text style={[estilos.titulo, { color: tema.texto }]}>
              Ruta Norte
            </Text>
            <Text style={[estilos.detalle, { color: tema.textoSecundario }]}>
              {es ? "12 clientes · martes" : "12 customers · Tuesday"}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={21} color={tema.primario} />
        </Pressable>
      </>
    );
  return (
    <>
      <Text style={[estilos.titulo, { color: tema.texto }]}>Ruta Norte</Text>
      <TarjetaClienteJornada
        cliente={clientePractica}
        es={es}
        tema={tema}
        alAbrir={control === "RUTA_CLIENTE" ? acertar : fallar}
      />
      {control === "RUTA_NO_PAGO" ? (
        <View style={estilos.filaBotones}>
          <BotonMovil
            texto={es ? "Pagó" : "Paid"}
            icono="cash-outline"
            variante="secundario"
            expandido={false}
            estilo={estilos.botonMitad}
            alPulsar={fallar}
          />
          <BotonMovil
            texto={es ? "No pagó" : "No payment"}
            icono="close-circle-outline"
            expandido={false}
            estilo={estilos.botonMitad}
            alPulsar={acertar}
          />
        </View>
      ) : null}
    </>
  );
}

export function PanelInventario({
  control,
  es,
  tema,
  busqueda,
  buscar,
  acertar,
  fallar,
}: PanelProps & { busqueda: string; buscar: (valor: string) => void }) {
  if (control === "INVENTARIO_FOLIO")
    return (
      <View
        style={[
          estilos.panel,
          { backgroundColor: tema.panel, borderColor: tema.borde },
        ]}
      >
        <View style={estilos.filaTitulo}>
          <Ionicons name="return-down-back" size={22} color={tema.primario} />
          <View style={estilos.expandir}>
            <Text style={[estilos.titulo, { color: tema.texto }]}>
              DEV-1042
            </Text>
            <Text style={[estilos.detalle, { color: tema.textoSecundario }]}>
              {es ? "Autorizada · 1 pieza" : "Approved · 1 item"}
            </Text>
          </View>
        </View>
        <BotonMovil
          texto={es ? "Revisar folio autorizado" : "Review approved receipt"}
          icono="document-text-outline"
          variante="secundario"
          alPulsar={acertar}
        />
      </View>
    );
  return (
    <>
      <View style={estilos.filaTitulo}>
        <Text style={[estilos.titulo, { color: tema.texto, flex: 1 }]}>
          Inventario
        </Text>
        <BotonMovil
          texto={es ? "Nuevo" : "New"}
          icono="add"
          expandido={false}
          alPulsar={control === "INVENTARIO_NUEVO" ? acertar : fallar}
        />
      </View>
      {control === "INVENTARIO_ESCANEAR" ? (
        <BotonMovil
          texto={es ? "Escanear código" : "Scan code"}
          icono="scan-outline"
          variante="secundario"
          alPulsar={acertar}
        />
      ) : (
        <CampoMovil
          etiqueta={es ? "Buscar producto" : "Find product"}
          placeholder={es ? "Nombre, SKU o código" : "Name, SKU, or code"}
          icono="search"
          valor={busqueda}
          alCambiar={control === "INVENTARIO_BUSCAR" ? buscar : () => fallar()}
        />
      )}
      <TarjetaProductoMovil
        producto={productoPractica}
        tema={tema}
        es={es}
        alEditar={control === "INVENTARIO_EXISTENCIA" ? acertar : fallar}
      />
      {control === "INVENTARIO_EXISTENCIA" ? (
        <Text style={[estilos.ayuda, { color: tema.textoSecundario }]}>
          {es
            ? "Toca el producto y verifica que la existencia sea 3 piezas."
            : "Tap the product and verify stock is 3 items."}
        </Text>
      ) : null}
    </>
  );
}
