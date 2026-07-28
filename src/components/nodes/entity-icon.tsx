import { Building2, Landmark, Mail, MapPin, Phone, ShieldAlert, User } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { NodeType } from "@/types/api";

const ICON_BY_NODE_TYPE: Record<NodeType, LucideIcon> = {
  address: MapPin,
  cnae: Landmark,
  company: Building2,
  email: Mail,
  person: User,
  phone: Phone,
  sanction: ShieldAlert,
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
