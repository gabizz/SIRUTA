const fastify = require('fastify')({ logger: true });
const mercurius = require('mercurius');
const fs = require('fs');
const path = require('path');

// Încarcă datele SIRUTA procesate din fișierul JSON
const sirutaDataPath = path.join(__dirname, 'siruta-data.json');
if (!fs.existsSync(sirutaDataPath)) {
    console.error(`Error: The data file 'siruta-data.json' was not found.`);
    console.error(`Please run 'npm run convert-data' first to generate it.`);
    process.exit(1);
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
    """Obține o listă cu toate județele."""
    judete: [Judet!]

    """Obține un singur județ după ID."""
    judet(id: Int!): Judet

    """Obține un singur județ după nume."""
    judetByName(name: String!): Judet

    """Obține o listă cu toate localitățile."""
    localitati: [Localitate!]

    """Obține o singură localitate după codul SIRUTA."""
    localitate(siruta: Int!): Localitate

    """Caută localități după nume (insensibil la majuscule/minuscule și diacritice)."""
    searchLocalitati(name: String!): [Localitate!]
  }

  """Reprezintă un județ din România."""
  type Judet {
    id: Int!
    name: String!
    """O listă cu toate localitățile din acest județ."""
    localitati: [Localitate!]
  }

  """Reprezintă o localitate din România (ex: oraș, comună, sat)."""
  type Localitate {
    siruta: Int!
    name: String!
    """
    Tipul de UAT (Unitate Administrativ-Teritorială).
    11 = CJ = Consiliu Județean
    12 = M = Municipiu
    13 = O = Oraș
    14 = C = Comună
    15 = B = Primăria Municipiului București
    16 = S = Primărie de Sector, București
    """
    tip: Int
    parentId: Int!
    parent: String
    """Județul de care aparține această localitate."""
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
  graphiql: true, // Activează interfața GraphiQL la adresa /graphiql
});

// Endpoint REST pentru căutarea localităților
fastify.get('/api/searchLocalitati', async (request, reply) => {
  const { name } = request.query;

  if (!name) {
    // Trimite un răspuns de eroare dacă parametrul 'name' lipsește
    return reply.code(400).send({ error: 'Parametrul "name" este obligatoriu.' });
  }

  return searchLocalitatiLogic(name);
});

const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: '0.0.0.0' });
    fastify.log.info(`GraphiQL available at http://localhost:3000/graphiql`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();