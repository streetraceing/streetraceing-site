export type Ipv4Subnet = {
  address: string;
  prefix: number;
  mask: string;
  wildcard: string;
  network: string;
  broadcast: string;
  firstHost: string;
  lastHost: string;
  totalAddresses: number;
  usableHosts: number;
  kind: 'subnet' | 'point-to-point' | 'host';
};

function formatAddress(address: number): string {
  return [
    address >>> 24,
    (address >>> 16) & 255,
    (address >>> 8) & 255,
    address & 255,
  ].join('.');
}

export function calculateIpv4Subnet(value: string): Ipv4Subnet | undefined {
  if (value.length > 18) return undefined;
  const match =
    /^(0|[1-9][0-9]{0,2})\.(0|[1-9][0-9]{0,2})\.(0|[1-9][0-9]{0,2})\.(0|[1-9][0-9]{0,2})\/(0|[1-9][0-9]?)$/.exec(
      value,
    );
  if (!match || match[0] !== value) return undefined;
  const octets = match.slice(1, 5).map(Number);
  const prefix = Number(match[5]);
  if (octets.some((octet) => octet > 255) || prefix > 32) return undefined;

  const address = octets.reduce((result, octet) => result * 256 + octet, 0);
  const totalAddresses = 2 ** (32 - prefix);
  const wildcard = totalAddresses - 1;
  const mask = ~wildcard >>> 0;
  const network = (address & mask) >>> 0;
  const broadcast = network + wildcard;
  const kind =
    prefix === 32 ? 'host' : prefix === 31 ? 'point-to-point' : 'subnet';
  // /31 uses both endpoints; /32 is a single host. These endpoints are not
  // reserved broadcasts in those cases, despite the common field name.
  const firstHost = prefix >= 31 ? network : network + 1;
  const lastHost = prefix >= 31 ? broadcast : broadcast - 1;

  return {
    address: formatAddress(address),
    prefix,
    mask: formatAddress(mask),
    wildcard: formatAddress(wildcard),
    network: formatAddress(network),
    broadcast: formatAddress(broadcast),
    firstHost: formatAddress(firstHost),
    lastHost: formatAddress(lastHost),
    totalAddresses,
    usableHosts: prefix >= 31 ? totalAddresses : totalAddresses - 2,
    kind,
  };
}
