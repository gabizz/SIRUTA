const fastify = require('fastify')({ logger: true });
const mercurius = require('mercurius');
const fs = require('fs');
const path = require('path');
const awsLambdaFastify = require('@fastify/aws-lambda');

// Load data (copy siruta-data.json into netlify/functions or bundle it)
const sirutaDataPath = path.join(__dirname, 'siruta-data.json');
if (!fs.existsSync(sirutaDataPath)) {
  console.error(`Error: siruta-data.json not found at ${sirutaDataPath}`);
  throw new Error('Missing data file.');
}
const sirutaData = JSON.parse(fs.readFileSync(sirutaDataPath, 'utf-8'));

// Utility: diacritic-insensitive search
const searchLocalitatiLogic = (name) => {
  const normalizedSearchName = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  return sirutaData.localitati.filter((l) => {
    if (!l.name || typeof l.name !== 'string') return false;
    const normalizedLocalityName = l.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    return normalizedLocalityName.includes(normalizedSearchName);
  });
};

// GraphQL schema + resolvers
const schema = `
  type Query {
    judete: [Judet!]
    judet(id: Int!): Judet
    judetByName(name: String!): Judet
    localitati: [Localitate!]
    localitate(siruta: Int!): Localitate
    searchLocalitati(name: String!): [Localitate!]
  }
  type Judet {
    id: Int!
    name: String!
    localitati: [Localitate!]
  }
  type Localitate {
    siruta: Int!
    name: String!
    tip: Int
    parentId: Int!
    parent: String
    judet: Judet
  }
`;

const resolvers = {
  Query: {
    judete: () => sirutaData.judete,
    judet: (_, { id }) => sirutaData.judete.find((j) => j.id === id),
    judetByName: (_, { name }) => {
      const norm = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return sirutaData.judete.find((j) => {
        if (!j.name) return false;
        const jn = j.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return jn === norm;
      });
    },
    localitati: () => sirutaData.localitati,
    localitate: (_, { siruta }) =>
      sirutaData.localitati.find((l) => l.siruta === siruta),
    searchLocalitati: (_, { name }) => searchLocalitatiLogic(name),
  },
  Judet: {
    localitati: (judet) => judet.localitati || [],
  },
  Localitate: {
    judet: (localitate) =>
      sirutaData.judete.find((j) => j.id === localitate.parentId),
  },
};

fastify.register(mercurius, {
  schema,
  resolvers,
  graphiql: true,
});

// REST endpoint (⚠️ no `/api/` prefix here, Netlify adds it)
fastify.get('/searchLocalitati', async (req, reply) => {
  const { name } = req.query;
  if (!name) return reply.code(400).send({ error: 'Parametrul "name" este obligatoriu.' });
  return searchLocalitatiLogic(name);
});

// Wrap in Netlify handler
const proxy = awsLambdaFastify(fastify);
exports.handler = proxy;