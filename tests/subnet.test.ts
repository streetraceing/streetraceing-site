import assert from 'node:assert/strict';
import test from 'node:test';

import { calculateIpv4Subnet } from '../utils/subnet';

test('IPv4 subnet arithmetic returns the complete /24 result without network access', () => {
  assert.deepEqual(calculateIpv4Subnet('192.168.1.130/24'), {
    address: '192.168.1.130',
    prefix: 24,
    mask: '255.255.255.0',
    wildcard: '0.0.0.255',
    network: '192.168.1.0',
    broadcast: '192.168.1.255',
    firstHost: '192.168.1.1',
    lastHost: '192.168.1.254',
    totalAddresses: 256,
    usableHosts: 254,
    kind: 'subnet',
  });
  assert.deepEqual(calculateIpv4Subnet('172.16.5.200/20'), {
    address: '172.16.5.200',
    prefix: 20,
    mask: '255.255.240.0',
    wildcard: '0.0.15.255',
    network: '172.16.0.0',
    broadcast: '172.16.15.255',
    firstHost: '172.16.0.1',
    lastHost: '172.16.15.254',
    totalAddresses: 4_096,
    usableHosts: 4_094,
    kind: 'subnet',
  });
});

test('/0 retains all 32 unsigned address bits and exact address counts', () => {
  for (const address of ['0.0.0.0', '128.0.0.1', '255.255.255.255']) {
    assert.deepEqual(calculateIpv4Subnet(`${address}/0`), {
      address,
      prefix: 0,
      mask: '0.0.0.0',
      wildcard: '255.255.255.255',
      network: '0.0.0.0',
      broadcast: '255.255.255.255',
      firstHost: '0.0.0.1',
      lastHost: '255.255.255.254',
      totalAddresses: 4_294_967_296,
      usableHosts: 4_294_967_294,
      kind: 'subnet',
    });
  }
});

test('/31 exposes both point-to-point endpoints and /32 exposes the single host', () => {
  for (const address of ['192.0.2.10', '192.0.2.11']) {
    assert.deepEqual(calculateIpv4Subnet(`${address}/31`), {
      address,
      prefix: 31,
      mask: '255.255.255.254',
      wildcard: '0.0.0.1',
      network: '192.0.2.10',
      broadcast: '192.0.2.11',
      firstHost: '192.0.2.10',
      lastHost: '192.0.2.11',
      totalAddresses: 2,
      usableHosts: 2,
      kind: 'point-to-point',
    });
  }
  assert.equal(
    calculateIpv4Subnet('255.255.255.255/31')?.firstHost,
    '255.255.255.254',
  );
  assert.equal(calculateIpv4Subnet('0.0.0.0/31')?.lastHost, '0.0.0.1');
  for (const address of ['0.0.0.0', '192.0.2.10', '255.255.255.255']) {
    assert.deepEqual(calculateIpv4Subnet(`${address}/32`), {
      address,
      prefix: 32,
      mask: '255.255.255.255',
      wildcard: '0.0.0.0',
      network: address,
      broadcast: address,
      firstHost: address,
      lastHost: address,
      totalAddresses: 1,
      usableHosts: 1,
      kind: 'host',
    });
  }
});

test('subnet arithmetic works at high unsigned addresses and network/broadcast inputs', () => {
  const upper = calculateIpv4Subnet('255.255.255.255/1');
  assert.equal(upper?.network, '128.0.0.0');
  assert.equal(upper?.broadcast, '255.255.255.255');
  assert.equal(upper?.firstHost, '128.0.0.1');
  assert.equal(upper?.lastHost, '255.255.255.254');
  for (const address of ['203.0.113.0', '203.0.113.3']) {
    const subnet = calculateIpv4Subnet(`${address}/30`);
    assert.equal(subnet?.network, '203.0.113.0');
    assert.equal(subnet?.broadcast, '203.0.113.3');
    assert.equal(subnet?.firstHost, '203.0.113.1');
    assert.equal(subnet?.lastHost, '203.0.113.2');
    assert.equal(subnet?.usableHosts, 2);
  }
});

test('strict IPv4/CIDR parsing rejects ambiguous, partial, and noninteger forms', () => {
  for (const value of [
    '',
    '192.0.2.1',
    '192.0.2.1/',
    '/24',
    '192.0.2/24',
    '192.0.2.1.0/24',
    '256.0.0.1/24',
    '1.2.3.-1/24',
    '01.2.3.4/24',
    '1.02.3.4/24',
    '1.2.03.4/24',
    '1.2.3.04/24',
    '00.0.0.0/0',
    '0x7f.0.0.1/8',
    '2130706433/8',
    '1.2.3.4/33',
    '1.2.3.4/-1',
    '1.2.3.4/+1',
    '1.2.3.4/1.0',
    '1.2.3.4/1e1',
    '1.2.3.4/01',
    '1.2.3.4/00',
    '1.2.3.4/24/1',
    '1.2.3.4/255.255.255.0',
    ' 1.2.3.4/24',
    '1.2.3.4/24 ',
    '1.2.3.4/24\n',
    '1.2.3.4/24\r\n',
    '1.2.3.4 /24',
    '1.2.3.4/ 24',
    'localhost/24',
    '::1/128',
  ]) {
    assert.equal(calculateIpv4Subnet(value), undefined, value);
  }
});

test('all prefix lengths produce aligned networks, complementary masks, and bounded hosts', () => {
  const toNumber = (value: string): number =>
    value.split('.').reduce((total, part) => total * 256 + Number(part), 0);
  const address = toNumber('203.0.113.199');
  for (let prefix = 0; prefix <= 32; prefix++) {
    const subnet = calculateIpv4Subnet(`203.0.113.199/${prefix}`);
    assert.ok(subnet);
    const total = 2 ** (32 - prefix);
    const network = Math.floor(address / total) * total;
    assert.equal(subnet.totalAddresses, total);
    assert.equal(toNumber(subnet.network), network);
    assert.equal(toNumber(subnet.broadcast), network + total - 1);
    assert.equal(toNumber(subnet.mask) + toNumber(subnet.wildcard), 0xffffffff);
    assert.equal(toNumber(subnet.firstHost), network + (prefix < 31 ? 1 : 0));
    assert.equal(
      toNumber(subnet.lastHost),
      network + total - 1 - (prefix < 31 ? 1 : 0),
    );
    assert.equal(subnet.usableHosts, prefix < 31 ? total - 2 : total);
  }
});
