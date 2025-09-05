# API SIRUTA România

O aplicație API rapidă, construită cu **Fastify**, ce servește clasificarea SIRUTA a localităților din România. Proiectul oferă atât un endpoint GraphQL, cât și un endpoint REST pentru interogarea datelor.

## Caracteristici

- **Performanță:** Datele sunt pre-procesate dintr-un fișier `.xls` într-un format JSON static pentru acces ultra-rapid la citire.
- **GraphQL API:** Un endpoint `/graphql` flexibil, cu interfață GraphiQL pentru explorare și testare interactivă a interogărilor.
- **REST API:** Un endpoint simplu `GET /api/searchLocalitati` pentru integrări rapide.
- **Căutare Inteligentă:** Funcționalitatea de căutare este insensibilă la diacritice și majuscule/minuscule (ex: `siria` va găsi `Șiria`).

---

## Setup și Instalare

### Cerințe
- Node.js (versiunea 16 sau mai recentă)
- Fișierul `siruta.xls` (poate fi descărcat de pe portalul guvernamental)

### Pași de instalare

1.  **Clonați repository-ul:**
    ```bash
    git clone <URL-ul-repository-ului>
    cd siruta-api
    ```

2.  **Adăugați fișierul de date:**
    Plasați fișierul `siruta.xls` în directorul rădăcină al proiectului.

3.  **Instalați dependențele:**
    ```bash
    npm install
    ```

---

## Utilizare

### 1. Conversia Datelor

Înainte de a porni serverul, trebuie să convertiți datele din fișierul `.xls` în formatul JSON optimizat. Rulați următoarea comandă o singură dată (sau de fiecare dată când actualizați fișierul `siruta.xls`):

```bash
npm run convert-data
```

Această comandă va genera fișierul `siruta-data.json`, care este utilizat de server.

### 2. Pornirea Serverului

Pentru a porni serverul API, rulați:

```bash
npm start
```

Serverul va fi disponibil la adresa `http://localhost:3000`.

---

## Endpoint-uri API

### GraphQL

Interfața interactivă GraphiQL este disponibilă la `http://localhost:3000/graphiql`.

**Exemplu 1: Căutare județ după nume**
```graphql
query GetJudetCluj {
  judetByName(name: "cluj") {
    id
    name
    localitati {
      siruta
      name
      tip
    }
  }
}
```

**Exemplu 2: Căutare localități (insensibil la diacritice)**
```graphql
query CautareLocalitate {
  searchLocalitati(name: "siria") {
    siruta
    name
    tip
    judet {
      name
    }
  }
}
```

### REST

Endpoint-ul REST este util pentru integrări simple, unde un API GraphQL ar fi prea complex.

**Căutare localități**

- **URL:** `/api/searchLocalitati`
- **Metodă:** `GET`
- **Parametru Query:** `name` (obligatoriu)

**Exemplu de utilizare cu `curl`:**
```bash
curl "http://localhost:3000/api/searchLocalitati?name=siria"
```

**Exemplu de accesare din browser:**
`http://localhost:3000/api/searchLocalitati?name=siria`