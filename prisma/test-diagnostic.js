import 'dotenv/config';
import { suggererDiagnostic } from '../src/services/diagnosticAgent.service.js';

const panneTest = { titre: 'Panne moteur', categorie: 'Mécanique', machineCode: 'C005' };

const resultat = await suggererDiagnostic(panneTest);
console.log(JSON.stringify(resultat, null, 2));