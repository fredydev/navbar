import sample from './architecture.json';
import { buildModel } from './model';
import { analyzeSecurity } from './security';

const analyze = (products) => analyzeSecurity(buildModel({ version: 1, products }));
const summary = (findings) => findings.map((f) => `${f.severity} ${f.nodeId} ${f.title}`);

test('finds the problems planted in the example, most severe first', () => {
  expect(summary(analyzeSecurity(buildModel(sample)))).toEqual([
    'critical cp-api-labs Données sensibles exposées sans authentification',
    'high cp-k8s-labs Flux de données sensibles non chiffré',
    'high cp-rds Données sensibles stockées sans chiffrement',
    'medium cp-api Données sensibles partagées avec un tiers',
    'medium cp-auth Données sensibles partagées avec un tiers',
    'medium pf-contact Données sensibles partagées avec un tiers',
  ]);
});

test('a public block with sensitive data behind authentication is fine', () => {
  expect(analyze([{ id: 'api', name: 'API', kind: 'app', exposure: 'public', auth: 'JWT', data: ['pii'] }])).toEqual([]);
});

test('a database reachable from the internet is flagged even with auth', () => {
  const findings = analyze([
    { id: 'db', name: 'DB', kind: 'resource', exposure: 'public', auth: 'password', data: ['credentials'] },
  ]);
  expect(summary(findings)).toEqual(['high db Stockage de données exposé sur Internet']);
});

test('non-sensitive flows and data raise nothing', () => {
  const findings = analyze([
    {
      id: 'site',
      name: 'Site',
      kind: 'app',
      exposure: 'public',
      data: ['public'],
      encryptedAtRest: false,
      flows: [{ to: 'cdn', data: ['public'], encrypted: false }],
      children: [{ id: 'cdn', name: 'CDN', kind: 'external' }],
    },
  ]);
  expect(findings).toEqual([]);
});
