import 'dotenv/config';
import { genererRapportHebdomadaire } from '../src/services/reportAgent.service.js';

const resultat = await genererRapportHebdomadaire();
console.log(resultat.rapport);
console.log('\n--- Chiffres bruts ---');
console.log(JSON.stringify(resultat.chiffres, null, 2));