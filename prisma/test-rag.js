import 'dotenv/config';
import { rechercherCasSimilaires } from '../src/services/ragAgent.service.js';

const panneTest = { titre: 'Panne moteur', categorie: 'Mécanique' };

const resultats = await rechercherCasSimilaires(panneTest);
console.log(JSON.stringify(resultats, null, 2));