'use client';

import { useLocale } from '@/app/providers';
import { Button } from '@/components/ui/Button';
import {
  formatUnixMode,
  parseUnixMode,
  type UnixMode,
  type UnixPermissions,
} from '@/utils/permissions';
import { compareSemVer, SemVerError, sortSemVers } from '@/utils/semver';
import { calculateIpv4Subnet, type Ipv4Subnet } from '@/utils/subnet';
import {
  Card,
  Checkbox,
  Chip,
  Description,
  Form,
  Input,
  Label,
  TextArea,
  TextField,
  Typography,
} from '@heroui/react';
import { ArrowDownUp, GitCompareArrows } from 'lucide-react';
import { type FormEvent, useState } from 'react';

import { ErrorAlert } from './ErrorAlert';
import { ToggleField } from './ToggleField';
import { ToolOutput } from './ToolOutput';

const semverExample = [
  '1.2.3',
  '1.10.0',
  '1.2.3-alpha.1',
  '1.2.3+build.5',
  '2.0.0-rc.1',
].join('\n');

function describeSemVerError(
  error: unknown,
  strings: { errors: Record<string, string> },
) {
  return error instanceof SemVerError
    ? strings.errors[error.code]
    : strings.errors['invalid'];
}

export function SemverSorterTool() {
  const { copy } = useLocale();
  const strings = copy.tools.semver;
  const [source, setSource] = useState(semverExample);
  const [descending, setDescending] = useState(false);
  const [first, setFirst] = useState('1.2.3');
  const [second, setSecond] = useState('1.2.10');
  const [output, setOutput] = useState<string>();
  const [comparison, setComparison] = useState<string>();
  const [error, setError] = useState<string>();

  function clear() {
    setOutput(undefined);
    setComparison(undefined);
    setError(undefined);
  }

  function sort(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      const sorted = sortSemVers(source, descending);

      setOutput(sorted.length === 0 ? strings.empty : sorted.join('\n'));
      setError(undefined);
    } catch (caughtError) {
      setOutput(undefined);
      setError(describeSemVerError(caughtError, strings));
    }
  }

  function compare() {
    try {
      const result = compareSemVer(first, second);

      setComparison(
        result === 0
          ? strings.equal
          : result > 0
            ? strings.firstGreater
            : strings.firstLower,
      );
      setError(undefined);
    } catch (caughtError) {
      setComparison(undefined);
      setError(describeSemVerError(caughtError, strings));
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Form className="flex flex-col gap-4" onSubmit={sort}>
        <TextField
          fullWidth
          name="semver-list"
          value={source}
          onChange={(value) => {
            setSource(value);
            clear();
          }}
        >
          <Label>{strings.label}</Label>
          <TextArea rows={10} variant="secondary" spellCheck={false} />
          <Description>{strings.description}</Description>
        </TextField>

        <ToggleField
          checked={descending}
          label={strings.descending}
          onChange={(value) => {
            setDescending(value);
            clear();
          }}
        />

        <Button type="submit" className="self-start">
          <ArrowDownUp />
          {strings.sort}
        </Button>
      </Form>

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
        <TextField
          fullWidth
          name="semver-first"
          value={first}
          onChange={setFirst}
        >
          <Label>{strings.first}</Label>
          <Input variant="secondary" spellCheck={false} />
        </TextField>
        <TextField
          fullWidth
          name="semver-second"
          value={second}
          onChange={setSecond}
        >
          <Label>{strings.second}</Label>
          <Input variant="secondary" spellCheck={false} />
        </TextField>
        <Button type="button" variant="secondary" onPress={compare}>
          <GitCompareArrows />
          {strings.compare}
        </Button>
      </div>

      {comparison ? (
        <Typography.Paragraph className="text-sm">
          {comparison}
        </Typography.Paragraph>
      ) : null}

      {error ? <ErrorAlert title={strings.errorTitle} message={error} /> : null}
      {output !== undefined ? (
        <ToolOutput content={output} label={strings.output} format="plain" />
      ) : null}
    </div>
  );
}

type PermissionsStrings = {
  owner: string;
  group: string;
  other: string;
  read: string;
  write: string;
  execute: string;
  setuid: string;
  setgid: string;
  sticky: string;
};

function PermissionGroup({
  label,
  bits,
  strings,
  onChange,
}: {
  label: string;
  bits: UnixPermissions;
  strings: PermissionsStrings;
  onChange: (bits: UnixPermissions) => void;
}) {
  const rows: Array<{ key: keyof UnixPermissions; label: string }> = [
    { key: 'read', label: strings.read },
    { key: 'write', label: strings.write },
    { key: 'execute', label: strings.execute },
  ];

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-medium">{label}</legend>
      {rows.map((row) => (
        <Checkbox
          key={row.key}
          isSelected={bits[row.key]}
          onChange={(selected) => onChange({ ...bits, [row.key]: selected })}
        >
          <Checkbox.Content>
            <Checkbox.Control>
              <Checkbox.Indicator />
            </Checkbox.Control>
            {row.label}
          </Checkbox.Content>
        </Checkbox>
      ))}
    </fieldset>
  );
}

function toMode(bits: UnixMode) {
  const group = (permissions: UnixPermissions, shift: number) =>
    (permissions.read ? 0o4 << shift : 0) |
    (permissions.write ? 0o2 << shift : 0) |
    (permissions.execute ? 0o1 << shift : 0);

  return (
    group(bits.owner, 6) |
    group(bits.group, 3) |
    group(bits.other, 0) |
    (bits.setuid ? 0o4000 : 0) |
    (bits.setgid ? 0o2000 : 0) |
    (bits.sticky ? 0o1000 : 0)
  );
}

export function UnixPermissionsTool() {
  const { copy } = useLocale();
  const strings = copy.tools.permissions;
  const [source, setSource] = useState('755');
  const [mode, setMode] = useState<UnixMode | undefined>(() =>
    parseUnixMode('755'),
  );

  function update(value: string) {
    setSource(value);
    setMode(parseUnixMode(value));
  }

  function updateBits(next: UnixMode) {
    const nextMode = toMode(next);
    const formatted = formatUnixMode(nextMode);

    if (!formatted) {
      return;
    }

    setMode(formatted);
    // Show four digits only when special bits are present.
    setSource(nextMode > 0o777 ? formatted.octal : formatted.octal.slice(1));
  }

  return (
    <div className="flex flex-col gap-4">
      <Form
        className="flex flex-col gap-4"
        onSubmit={(event) => event.preventDefault()}
      >
        <TextField fullWidth name="unix-mode" value={source} onChange={update}>
          <Label>{strings.label}</Label>
          <Input variant="secondary" spellCheck={false} placeholder="755" />
          <Description>{strings.description}</Description>
        </TextField>
      </Form>

      {mode ? (
        <>
          <ToolOutput
            content={[
              `${strings.octal}: ${mode.octal}`,
              `${strings.symbolic}: ${mode.symbolic}`,
            ].join('\n')}
            label={strings.output}
            format="key-value"
          />

          <Card variant="secondary" className="dark:bg-default/20">
            <Card.Header>
              <Card.Title>{strings.bitsTitle}</Card.Title>
              <Card.Description>{strings.bitsDescription}</Card.Description>
            </Card.Header>
            <Card.Content className="flex flex-col gap-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <PermissionGroup
                  label={strings.owner}
                  bits={mode.owner}
                  strings={strings}
                  onChange={(bits) => updateBits({ ...mode, owner: bits })}
                />
                <PermissionGroup
                  label={strings.group}
                  bits={mode.group}
                  strings={strings}
                  onChange={(bits) => updateBits({ ...mode, group: bits })}
                />
                <PermissionGroup
                  label={strings.other}
                  bits={mode.other}
                  strings={strings}
                  onChange={(bits) => updateBits({ ...mode, other: bits })}
                />
              </div>

              <div className="flex flex-wrap gap-4">
                <Checkbox
                  isSelected={mode.setuid}
                  onChange={(selected) =>
                    updateBits({ ...mode, setuid: selected })
                  }
                >
                  <Checkbox.Content>
                    <Checkbox.Control>
                      <Checkbox.Indicator />
                    </Checkbox.Control>
                    {strings.setuid}
                  </Checkbox.Content>
                </Checkbox>
                <Checkbox
                  isSelected={mode.setgid}
                  onChange={(selected) =>
                    updateBits({ ...mode, setgid: selected })
                  }
                >
                  <Checkbox.Content>
                    <Checkbox.Control>
                      <Checkbox.Indicator />
                    </Checkbox.Control>
                    {strings.setgid}
                  </Checkbox.Content>
                </Checkbox>
                <Checkbox
                  isSelected={mode.sticky}
                  onChange={(selected) =>
                    updateBits({ ...mode, sticky: selected })
                  }
                >
                  <Checkbox.Content>
                    <Checkbox.Control>
                      <Checkbox.Indicator />
                    </Checkbox.Control>
                    {strings.sticky}
                  </Checkbox.Content>
                </Checkbox>
              </div>
            </Card.Content>
          </Card>
        </>
      ) : (
        <ErrorAlert title={strings.errorTitle} message={strings.invalid} />
      )}
    </div>
  );
}

type SubnetStrings = {
  address: string;
  prefix: string;
  mask: string;
  wildcard: string;
  network: string;
  broadcast: string;
  firstHost: string;
  lastHost: string;
  totalAddresses: string;
  usableHosts: string;
  kinds: Record<Ipv4Subnet['kind'], string>;
};

function buildSubnetSummary(result: Ipv4Subnet, strings: SubnetStrings) {
  return [
    `${strings.address}: ${result.address}`,
    `${strings.prefix}: /${result.prefix}`,
    `${strings.mask}: ${result.mask}`,
    `${strings.wildcard}: ${result.wildcard}`,
    `${strings.network}: ${result.network}`,
    `${strings.broadcast}: ${result.broadcast}`,
    `${strings.firstHost}: ${result.firstHost}`,
    `${strings.lastHost}: ${result.lastHost}`,
    `${strings.totalAddresses}: ${result.totalAddresses}`,
    `${strings.usableHosts}: ${result.usableHosts}`,
  ].join('\n');
}

export function SubnetCalculatorTool() {
  const { copy } = useLocale();
  const strings = copy.tools.subnet;
  const [source, setSource] = useState('192.168.1.130/26');
  const result = calculateIpv4Subnet(source.trim());

  return (
    <div className="flex flex-col gap-4">
      <Form
        className="flex flex-col gap-4"
        onSubmit={(event) => event.preventDefault()}
      >
        <TextField
          fullWidth
          name="ipv4-subnet"
          value={source}
          onChange={setSource}
        >
          <Label>{strings.label}</Label>
          <Input
            variant="secondary"
            spellCheck={false}
            placeholder="192.168.1.130/26"
          />
          <Description>{strings.description}</Description>
        </TextField>
      </Form>

      {result ? (
        <>
          <div className="flex flex-wrap gap-2">
            <Chip color="accent" variant="soft" size="sm">
              {strings.kinds[result.kind]}
            </Chip>
            <Chip variant="secondary" size="sm">
              /{result.prefix}
            </Chip>
          </div>

          <ToolOutput
            content={buildSubnetSummary(result, strings)}
            label={strings.output}
            format="key-value"
          />

          <Typography.Paragraph size="sm" className="text-muted">
            {strings.note}
          </Typography.Paragraph>
        </>
      ) : (
        <ErrorAlert title={strings.errorTitle} message={strings.invalid} />
      )}
    </div>
  );
}
