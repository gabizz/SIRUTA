const fs = require('fs');
const path = require('path');
const fastify = require('fastify');
const mercurius = require('mercurius');

// Load data. Vercel's build process makes the project root the current working directory.
const sirutaDataPath = path.resolve(process.cwd(), 'siruta-data.json');
if (!fs.existsSync(sirutaDataPath)) {
  const errorMessage = `Error: The data file 'siruta-data.json' was not found at ${sirutaDataPath}. Make sure it is tracked by Git.`;
  console.error(errorMessage);
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

const app = fastify({
  logger: true,
});

app.register(mercurius, { 
  schema,
  resolvers,
  graphiql: true,
});

app.get('/api/searchLocalitati', async (req, reply) => {
  const { name } = req.query;
  if (!name) {
    return reply.code(400).send({ error: 'Parametrul "name" este obligatoriu.' });
  }
  return searchLocalitatiLogic(name);
});


// Export the Fastify instance for Vercel's runtime
module.exports = async (req, res) => {
  await app.ready();
  app.server.emit('request', req, res);
};