import sample from './architecture.json';
import { buildModel, parseArchitecture, validateArchitecture } from './model';

const minimal = {
  version: 1,
  products: [
    {
      id: 'shop',
      name: 'Shop',
      kind: 'app',
      children: [
        { id: 'web', name: 'Web', kind: 'layer', deployedOn: ['vercel'] },
        { id: 'infra', name: 'Infra', kind: 'infra', children: [{ id: 'vercel', name: 'Vercel', kind: 'resource' }] },
      ],
    },
  ],
};

test('the bundled example is valid', () => {
  expect(validateArchitecture(sample)).toEqual([]);
});

test('builds the index, paths and hosted-by links', () => {
  const model = buildModel(minimal);
  expect(model.pathTo('vercel').map((n) => n.name)).toEqual(['Mes produits', 'Shop', 'Infra', 'Vercel']);
  expect(model.hostedBy.vercel.map((n) => n.id)).toEqual(['web']);
});

test('reports invalid JSON', () => {
  expect(parseArchitecture('{ nope').errors[0]).toMatch(/JSON invalide/);
});

test('reports missing fields, unknown kinds, duplicate ids and broken links', () => {
  const errors = validateArchitecture({
    version: 1,
    products: [
      {
        id: 'a',
        name: 'A',
        kind: 'app',
        children: [
          { id: 'a', name: 'Doublon', kind: 'layer' },
          { name: 'Sans id', kind: 'database' },
          { id: 'b', name: 'B', kind: 'layer', deployedOn: ['ghost'] },
        ],
      },
    ],
  });
  expect(errors).toEqual([
    'products[0].children[0] (Doublon) : l\'id "a" est déjà utilisé par products[0] (A).',
    'products[0].children[1] (Sans id) : "id" manquant.',
    'products[0].children[1] (Sans id) : "kind" doit être l\'un de app, layer, infra, component, resource, module, external (reçu : "database").',
    'products[0].children[2] (B) : "deployedOn" cite l\'id "ghost" qui n\'existe pas.',
  ]);
});

test('requires version 1 and at least one product', () => {
  expect(validateArchitecture({ products: [] })).toEqual([
    '"version" doit valoir 1.',
    '"products" doit être une liste contenant au moins un produit.',
  ]);
});

test('validates security fields and flow targets', () => {
  const errors = validateArchitecture({
    version: 1,
    products: [
      {
        id: 'a',
        name: 'A',
        kind: 'app',
        exposure: 'everywhere',
        data: ['secrets'],
        encryptedAtRest: 'yes',
        flows: [{ to: 'nowhere', encrypted: 'no' }, {}],
      },
    ],
  });
  expect(errors).toEqual([
    'products[0] (A) : "exposure" doit être l\'un de public, internal, private.',
    'products[0] (A) : "encryptedAtRest" doit valoir true ou false.',
    'products[0] (A) : type de donnée inconnu "secrets" dans "data" (attendu : pii, credentials, payment, health, public).',
    'products[0] (A) : "flows[0]".encrypted doit valoir true ou false.',
    'products[0] (A) : "flows[1]" doit avoir un "to".',
    'products[0] (A) : "flows[0]" cite l\'id "nowhere" qui n\'existe pas.',
  ]);
});

test('indexes incoming flows', () => {
  const model = buildModel(sample);
  expect(model.flowsIn['cp-rds'].map(({ from }) => from.id)).toEqual(['cp-api', 'cp-auth', 'cp-k8s-labs']);
});
