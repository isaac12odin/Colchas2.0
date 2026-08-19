"use client";

import { Plus } from "lucide-react";

import { usarAplicacion } from "@/componentes/proveedores";
import { EncabezadoPagina, MensajeError, Modal } from "@/componentes/ui";
import { FormularioVentaWeb } from "@/modulos/ventas/FormularioVentaWeb";
import { TablaVentas } from "@/modulos/ventas/TablaVentas";
import { usarVentasWeb } from "@/modulos/ventas/usarVentasWeb";

export default function PaginaVentas() {
  const { t, idioma, usuario } = usarAplicacion();
  const es = idioma === "es";
  const control = usarVentasWeb();

  return (
    <>
      <EncabezadoPagina
        titulo={t.ventas}
        descripcion={
          es
            ? "Ventas a crédito, de contado y al público general."
            : "Credit, cash, and general-public sales."
        }
        accion={
          <button className="boton-primario" onClick={control.abrirModal}>
            <Plus size={18} />
            {es ? "Venta" : "Sale"}
          </button>
        }
      />
      {control.error && <MensajeError mensaje={control.error} />}
      <TablaVentas
        control={control}
        es={es}
        buscarTexto={t.buscar}
        mostrarCostos={
          usuario?.rol === "ADMINISTRADOR" || usuario?.rol === "CONTABLE"
        }
      />
      <Modal
        abierto={control.modal}
        cerrar={control.cerrarModal}
        titulo={es ? "Registrar venta" : "Record sale"}
      >
        <FormularioVentaWeb
          tipo={control.tipo}
          es={es}
          cancelar={t.cancelar}
          guardar={t.guardar}
          alCambiarTipo={control.establecerTipo}
          alCancelar={control.cerrarModal}
          alEnviar={control.crear}
        />
      </Modal>
    </>
  );
}
