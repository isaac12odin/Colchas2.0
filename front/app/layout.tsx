import type { Metadata } from "next";
import "./globals.css";
import { Proveedores } from "@/componentes/proveedores";

export const metadata: Metadata = {
  title: { default: "Vektra", template: "%s · Vektra" },
  description: "Gestion de cobranza, ventas, rutas e inventario.",
};

export default function DisposicionRaiz({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>
        <Proveedores>{children}</Proveedores>
      </body>
    </html>
  );
}
