"use client";

import { useState } from "react";
import { Banknote, Plus } from "lucide-react";

import { usarAplicacion } from "@/componentes/proveedores";
import { EncabezadoPagina, MensajeError, Modal } from "@/componentes/ui";
import { FormularioVentaWeb } from "@/modulos/ventas/FormularioVentaWeb";
import { TablaVentas } from "@/modulos/ventas/TablaVentas";
import { usarVentasWeb } from "@/modulos/ventas/usarVentasWeb";
import { FormularioAbonoRapido } from "@/modulos/cobranza/FormularioAbonoRapido";
import { usarAccionInicial } from "@/lib/usarAccionInicial";

export default function PaginaVentas() {
  const { t, idioma, usuario } = usarAplicacion();
  const es = idioma === "es";
  const control = usarVentasWeb();
  const [abonoAbierto, establecerAbonoAbierto] = useState(false);
  const puedeAbonar =
    usuario?.rol === "ADMINISTRADOR" ||
    usuario?.rol === "CONTABLE" ||
    usuario?.rol === "COBRADOR";
  usarAccionInicial((accion) => {
    if (accion === "nueva") control.abrirModal();
    if (accion === "abono" && puedeAbonar) establecerAbonoAbierto(true);
  });

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
          <div className="flex flex-wrap gap-2">
            {puedeAbonar && (
              <button
                className="boton-secundario"
                onClick={() => establecerAbonoAbierto(true)}
                data-capacitacion="ventas.abono.abrir"
              >
                <Banknote size={18} />
                {es ? "Registrar abono" : "Record payment"}
              </button>
            )}
            <button
              className="boton-primario"
              onClick={control.abrirModal}
              data-capacitacion="ventas.nueva.abrir"
            >
              <Plus size={18} />
              {es ? "Nueva venta" : "New sale"}
            </button>
          </div>
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
        ancho="amplio"
      >
        <FormularioVentaWeb
          es={es}
          guardando={control.guardando}
          resultado={control.resultado}
          error={control.error}
          puedeAutorizarDescuento={usuario?.rol === "ADMINISTRADOR"}
          alCancelar={control.cerrarModal}
          alNuevaVenta={control.reiniciarVenta}
          alEnviar={control.crear}
        />
      </Modal>
      <Modal
        abierto={abonoAbierto}
        cerrar={() => establecerAbonoAbierto(false)}
        titulo={es ? "Registrar abono" : "Record payment"}
      >
        <FormularioAbonoRapido
          key={String(abonoAbierto)}
          es={es}
          alCancelar={() => establecerAbonoAbierto(false)}
          alActualizar={control.cargar}
          prefijoCapacitacion="ventas.abono"
        />
      </Modal>
    </>
  );
}
