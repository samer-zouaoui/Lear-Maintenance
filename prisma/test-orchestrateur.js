import 'dotenv/config';
import { orchestrerDiagnostic } from '../src/services/orchestrator.service.js';

const panneTest = { titre: 'Panne moteur', categorie: 'Mécanique', machineCode: 'C005' };
const resultat = await orchestrerDiagnostic(panneTest);
console.log(JSON.stringify(resultat, null, 2));

// Test du chemin alternatif : une panne sans aucun historique similaire
const panneInconnue = { titre: 'Autre', categorie: 'Pneumatique', machineCode: 'X999' };
const resultat2 = await orchestrerDiagnostic(panneInconnue);
console.log('\n--- Cas sans historique ---');
console.log(JSON.stringify(resultat2, null, 2));