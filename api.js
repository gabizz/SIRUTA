const fastify = require('fastify')({ logger: true });
const mercurius = require('mercurius');
const fs = require('fs');
const path = require('path');
const awsLambdaFastify = require('@fastify/aws-lambda');

// Încarcă datele SIRUTA procesate din fișierul JSON
// Calea este relativă la rădăcina proiectului în mediul de build Netlify
const sirutaDataPath = path.resolve(__dirname, '../../siruta-data.json');
if (!fs.existsSync(sirutaDataPath)) {
    // Această eroare va apărea în log-urile funcției dacă fișierul lipsește
    console.error(`Error: The data file 'siruta-data.json' was not found at ${sirutaDataPath}.`);
    // Într-un mediu serverless, aruncarea unei erori la inițializare va preveni pornirea funcției
    throw new Error("Missing data file.");
}
const sirutaData = JSON.parse(fs.readFileSync(sirutaDataPath, 'utf-8'));

/**
 * Funcție reutilizabilă pentru căutarea diacritic-insensitive a localităților.
 * @param {string} name - Termenul de căutare.
 * @returns {Array} - O listă de localități care corespund căutării.
 */
const searchLocalitatiLogic = (name) => {
    const normalizedSearchName = name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

    return sirutaData.localitati.filter(l => {
        if (!l.name || typeof l.name !== 'string') return false;
        
        const normalizedLocalityName = l.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        return normalizedLocalityName.includes(normalizedSearchName);
    });
};

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
    judet: (_, { id }) => sirutaData.judete.find(j => j.id === id),
    judetByName: (_, { name }) => {
        const normalizedSearchName = name
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");

        return sirutaData.judete.find(j => {
            if (!j.name || typeof j.name !== 'string') return false;
            
            const normalizedJudetName = j.name
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "");
            return normalizedJudetName === normalizedSearchName;
        });
    },
    localitati: () => sirutaData.localitati,
    localitate: (_, { siruta }) => sirutaData.localitati.find(l => l.siruta === siruta),
    searchLocalitati: (_, { name }) => searchLocalitatiLogic(name)
  },
  Judet: {
    localitati: (judet) => judet.localitati || [],
  },
  Localitate: {
    judet: (localitate) => sirutaData.judete.find(j => j.id === localitate.parentId),
  }
};

fastify.register(mercurius, {
  schema,
  resolvers,
  graphiql: true,
});

// Înregistrează rutele REST cu un prefix pentru a funcționa corect în mediul serverless Netlify.
// Netlify va redirecționa /api/searchLocalitati către funcție, iar prefixul asigură potrivirea.
fastify.register(async function (fastifyInstance) {
  // Endpoint REST pentru căutarea localităților
  fastifyInstance.get('/api/searchLocalitati', async (request, reply) => {
    const { name } = request.query;
  
    if (!name) {
      return reply.code(400).send({ error: 'Parametrul "name" este obligatoriu.' });
    }
  
    return searchLocalitatiLogic(name); 
  });
}, { prefix: '/api' });

// Creăm un proxy handler pentru a fi folosit de Netlify
const proxy = awsLambdaFastify(fastify);

// Exportăm handler-ul pe care Netlify îl va invoca
exports.handler = proxy;