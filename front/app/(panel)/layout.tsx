import { Panel } from "@/componentes/panel";

export default function DisposicionPanel({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Panel>{children}</Panel>;
}
