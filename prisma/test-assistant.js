import 'dotenv/config';
import { demanderAssistant } from '../src/services/assistantAgent.service.js';

const reponse = await demanderAssistant('Combien de machines sont actuellement en panne ?');
console.log(reponse);