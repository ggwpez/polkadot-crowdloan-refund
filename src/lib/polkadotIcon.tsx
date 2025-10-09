import Icon from "@w3f/polkadot-icons/Icon";
import React from "react";

type Props = React.SVGProps<SVGSVGElement> & {
  name: string;
  variant?: "keyline" | "solid";
};

export default function PolkadotIcon({
  name,
  variant = "keyline",
  ...props
}: Props) {
  // Cast to any to avoid strict union typing across many icon names.
  return (
    <Icon name={name as any} variant={variant as any} {...(props as any)} />
  );
}
