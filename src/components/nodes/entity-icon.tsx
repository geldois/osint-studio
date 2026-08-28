import {
  Building2,
  FileText,
  Landmark,
  Mail,
  MapPin,
  Phone,
  Scale,
  ShieldAlert,
  User,
  Vote,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { NodeType } from "@/types/api";

const ICON_BY_NODE_TYPE: Record<NodeType, LucideIcon> = {
  address: MapPin,
  cnae: Landmark,
  company: Building2,
  email: Mail,
  legal_process: Scale,
  person: User,
  phone: Phone,
  political_exposure: Vote,
  sanction: ShieldAlert,
  text_source: FileText,
};

export function EntityIcon({
  nodeType,
  size = 14,
}: {
  nodeType: NodeType;
  size?: number;
}) {
  const Icon = ICON_BY_NODE_TYPE[nodeType];
  return <Icon size={size} />;
}
