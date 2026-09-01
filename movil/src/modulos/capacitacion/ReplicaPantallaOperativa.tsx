import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";

import { usarTema } from "../../tema";
import {
  PanelGenerico,
  Retroalimentacion,
} from "./replica-operativa/componentesReplica";
import {
  identificarControl,
  type IdiomaReplica,
  normalizarReplica,
  productoPractica,
} from "./replica-operativa/dominioReplica";
import { estilosReplica as estilos } from "./replica-operativa/estilosReplica";
import {
  PanelInventario,
  PanelRutas,
} from "./replica-operativa/panelesCatalogos";
import { PanelInicio, PanelPerfil } from "./replica-operativa/panelesCuenta";
import { PanelPedidos } from "./replica-operativa/PanelPedidosReplica";

/**
 * Contrato de fidelidad visual conservado por los paneles extraídos:
 * <TarjetaClienteJornada, <TarjetaPedido, <TarjetaProductoMovil y <BotonMovil.
 */
interface ReplicaPantallaOperativaProps {
  pantalla: string;
  accion: string;
  completado: boolean;
  idioma: IdiomaReplica;
  alAccionar: () => void;
}

/** Réplica aislada: sólo el control operativo correcto completa el paso. */
export function ReplicaPantallaOperativa({
  pantalla,
  accion,
  completado,
  idioma,
  alAccionar,
}: ReplicaPantallaOperativaProps) {
  const tema = usarTema();
  const es = idioma === "es";
  const control = useMemo(
    () => identificarControl(pantalla, accion),
    [accion, pantalla],
  );
  const [retroLocal, establecerRetroLocal] = useState<string | null>(null);
  const [busqueda, establecerBusqueda] = useState("");

  useEffect(() => {
    establecerRetroLocal(null);
    establecerBusqueda("");
  }, [accion, pantalla]);

  const acertar = () => {
    if (completado) return;
    establecerRetroLocal(null);
    alAccionar();
  };
  const fallar = () =>
    establecerRetroLocal(
      es
        ? "Ese control no resuelve este paso. Lee el objetivo y prueba el control correspondiente."
        : "That control does not complete this step. Read the goal and try the matching control.",
    );
  const buscar = (valor: string) => {
    establecerBusqueda(valor);
    const consulta = normalizarReplica(valor.trim());
    if (!consulta) return establecerRetroLocal(null);
    const coincide = [
      productoPractica.nombre,
      productoPractica.sku,
      productoPractica.codigoBarras ?? "",
    ].some((dato) => normalizarReplica(dato).includes(consulta));
    if (coincide) acertar();
    else if (consulta.length >= 3)
      establecerRetroLocal(
        es
          ? "No hay coincidencias. Prueba “Colcha”, “COL-VIE-AZ” o 750100000042."
          : "No matches. Try “Quilt”, “COL-VIE-AZ”, or 750100000042.",
      );
  };

  return (
    <View
      accessibilityLabel={
        es
          ? `Réplica interactiva de ${pantalla}`
          : `Interactive ${pantalla} replica`
      }
      style={[
        estilos.dispositivo,
        { backgroundColor: tema.fondo, borderColor: tema.borde },
      ]}
    >
      <View style={estilos.barraAplicacion}>
        <View>
          <Text style={estilos.marca}>Vektra</Text>
          <Text style={estilos.nombrePantalla}>{pantalla.toUpperCase()}</Text>
        </View>
        <View style={estilos.insigniaPractica}>
          <View style={estilos.puntoPractica} />
          <Text style={estilos.insigniaTexto}>
            {es ? "PRÁCTICA" : "PRACTICE"}
          </Text>
        </View>
      </View>
      <View style={estilos.contenido}>
        <View
          style={[
            estilos.objetivo,
            { backgroundColor: tema.primarioSuave, borderColor: tema.primario },
          ]}
        >
          <Ionicons name="finger-print" size={19} color={tema.primario} />
          <View style={estilos.expandir}>
            <Text style={[estilos.objetivoEtiqueta, { color: tema.primario }]}>
              {es ? "OBJETIVO EN ESTA PANTALLA" : "GOAL ON THIS SCREEN"}
            </Text>
            <Text style={[estilos.objetivoTexto, { color: tema.texto }]}>
              {accion}
            </Text>
          </View>
        </View>
        {pantalla === "rutas" && (
          <PanelRutas
            control={control}
            es={es}
            tema={tema}
            acertar={acertar}
            fallar={fallar}
          />
        )}
        {pantalla === "inventario" && (
          <PanelInventario
            control={control}
            es={es}
            tema={tema}
            busqueda={busqueda}
            buscar={buscar}
            acertar={acertar}
            fallar={fallar}
          />
        )}
        {pantalla === "pedidos" && (
          <PanelPedidos
            control={control}
            es={es}
            tema={tema}
            busqueda={busqueda}
            buscar={buscar}
            acertar={acertar}
            fallar={fallar}
          />
        )}
        {pantalla === "inicio" && (
          <PanelInicio
            control={control}
            idioma={idioma}
            acertar={acertar}
            fallar={fallar}
          />
        )}
        {pantalla === "perfil" && (
          <PanelPerfil
            control={control}
            idioma={idioma}
            acertar={acertar}
            fallar={fallar}
          />
        )}
        {!["rutas", "inventario", "pedidos", "inicio", "perfil"].includes(
          pantalla,
        ) && <PanelGenerico idioma={idioma} />}
        {retroLocal ? (
          <Retroalimentacion
            texto={retroLocal}
            color={tema.peligro}
            fondo={tema.peligroSuave}
            icono="alert-circle"
          />
        ) : null}
        {completado ? (
          <Retroalimentacion
            texto={
              es
                ? "Acción correcta. Ya puedes continuar."
                : "Correct action. You can continue now."
            }
            color={tema.exito}
            fondo={tema.exitoSuave}
            icono="checkmark-circle"
          />
        ) : null}
      </View>
    </View>
  );
}
