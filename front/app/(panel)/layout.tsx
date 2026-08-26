import { Suspense } from "react";

import { Panel } from "@/componentes/panel";

export default function DisposicionPanel({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-screen place-items-center text-sm text-slate-500">
          Cargando Vektra…
        </div>
      }
    >
      <Panel>{children}</Panel>
    </Suspense>
  );
}
