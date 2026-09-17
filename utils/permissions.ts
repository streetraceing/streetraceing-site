export type UnixPermissions = {
  read: boolean;
  write: boolean;
  execute: boolean;
};

export type UnixMode = {
  octal: string;
  symbolic: string;
  owner: UnixPermissions;
  group: UnixPermissions;
  other: UnixPermissions;
  setuid: boolean;
  setgid: boolean;
  sticky: boolean;
};

export function formatUnixMode(mode: number): UnixMode | undefined {
  if (!Number.isInteger(mode) || mode < 0 || mode > 0o7777) return undefined;

  const permissions = (shift: number): UnixPermissions => ({
    read: (mode & (0o4 << shift)) !== 0,
    write: (mode & (0o2 << shift)) !== 0,
    execute: (mode & (0o1 << shift)) !== 0,
  });
  const owner = permissions(6);
  const group = permissions(3);
  const other = permissions(0);
  const setuid = (mode & 0o4000) !== 0;
  const setgid = (mode & 0o2000) !== 0;
  const sticky = (mode & 0o1000) !== 0;

  const symbolicPart = (
    bits: UnixPermissions,
    special: boolean,
    flag: 's' | 't',
  ): string => {
    let execute = bits.execute ? 'x' : '-';
    if (special) execute = bits.execute ? flag : flag.toUpperCase();
    return `${bits.read ? 'r' : '-'}${bits.write ? 'w' : '-'}${execute}`;
  };

  return {
    octal: mode.toString(8).padStart(4, '0'),
    symbolic:
      symbolicPart(owner, setuid, 's') +
      symbolicPart(group, setgid, 's') +
      symbolicPart(other, sticky, 't'),
    owner,
    group,
    other,
    setuid,
    setgid,
    sticky,
  };
}

export function parseUnixMode(value: string): UnixMode | undefined {
  if ((value.length === 3 || value.length === 4) && !/[^0-7]/.test(value)) {
    return formatUnixMode(Number.parseInt(value, 8));
  }
  if (
    value.length !== 9 ||
    !/^[r-][w-][xsS-][r-][w-][xsS-][r-][w-][xtT-]$/.test(value)
  ) {
    return undefined;
  }

  let mode = 0;
  for (let index = 0; index < 3; index++) {
    const offset = index * 3;
    const shift = (2 - index) * 3;
    if (value[offset] === 'r') mode |= 0o4 << shift;
    if (value[offset + 1] === 'w') mode |= 0o2 << shift;
    if ('xst'.includes(value[offset + 2])) mode |= 0o1 << shift;
  }
  if (/[sS]/.test(value[2])) mode |= 0o4000;
  if (/[sS]/.test(value[5])) mode |= 0o2000;
  if (/[tT]/.test(value[8])) mode |= 0o1000;
  return formatUnixMode(mode);
}
