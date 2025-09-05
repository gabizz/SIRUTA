const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

// Calea către fișierul .xls descărcat și redenumit siruta.xls 
// http://www.dpfbl.mdrap.ro/cod_siruta_uat-uri.html

const excelFilePath = path.join(__dirname, 'siruta.xls');
const jsonFilePath = path.join(__dirname, 'siruta-data.json');

console.log(`Deschid fișierul Excel din fișierul: ${excelFilePath}`);

if (!fs.existsSync(excelFilePath)) {
    console.error(`Eroare: Fișierul 'siruta.xls' nu a fost găsit în directorul curent.`);
    process.exit(1);
}

const workbook = xlsx.readFile(excelFilePath);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

// Convertește foaia de calcul în JSON (presupunând că primul rând conține antetele coloanelor)
const rawData = xlsx.utils.sheet_to_json(worksheet);
console.log(`Am găsit ${rawData.length} înregistrări în fișierul Excel`);

const judete = {};
const localitati = [];

// Procesează datele brute
rawData.forEach(row => {

    const parentId = row['Cod judet'];
    const parent = row['Denumire judet'] 
    const siruta = row['Codul SIRUTA al UNITATILOR ADMINISTRATIV-TERITORIALE'];
    const name = row['DENUMIREA UNITĂŢILOR\nADMINISTRATIV-TERITORIALE'] 
    const tip = row['Tipul UAT\n11 = CJ = Consiliu judetean\n12 = M = Municipiu\n13 = O  =  Oras\n14 = C  = Comuna\n15 = B  =  Primaria M. Buc.\n16 = S  =  Primaria de sector al M. Buc.']; 

    if (!parentId || !parent || !siruta) {
        return; // Elimină rândurile fără informații esențiale
    }

    // Agregă județele pentru a evita duplicatele
    if (!judete[parentId]) {
        judete[parentId] = {
            id: parentId,
            name: parent,
            localitati: [],
        };
    }

    // Creează înregistrările pentru localități
    const localitate = { siruta, name, tip, parentId, parent };
    localitati.push(localitate);
});

// Corelează localitățile cu județele lor
localitati.forEach(localitate => {
    if (judete[localitate.parentId]) {
        judete[localitate.parentId].localitati.push(localitate);
    }
});

let finalData = {
    judete: Object.values(judete),
    localitati: localitati
};

console.log(`Am convertit ${finalData.judete.length} de județe șu ${finalData.localitati.length} de localități.`);

// Elimină județul și localitatea invalidă care provin din antetul tabelului
const invalidJudIndex = finalData.judete.findIndex(el => typeof el.id !== 'number');
if (invalidJudIndex > -1) {
    finalData.judete.splice(invalidJudIndex, 1);
}
finalData.localitati = finalData.localitati.filter(l => typeof l.siruta === 'number');

console.log(finalData)
fs.writeFileSync(jsonFilePath, JSON.stringify(finalData, null, 2));

console.log(`Datele au fost convertite cu succes în JSON. Calea spre fișier este: ${jsonFilePath}`);