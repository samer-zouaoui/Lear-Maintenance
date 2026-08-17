import Groq from 'groq-sdk';
import {
    getMTTR,
    getMTBF,
    getTauxDisponibilite,
    getMachinesEnArret,
    getDowntimeTotal,
    getTopMachines,
    getTopCauses,
} from './dashboard.service.js';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function genererRapportHebdomadaire() {
    const [mttr, mtbf, disponibilite, machinesEnArret, downtimeTotal, topMachines, topCauses] = await Promise.all([
        getMTTR(7),
        getMTBF(7),
        getTauxDisponibilite(),
        getMachinesEnArret(),
        getDowntimeTotal(7),
        getTopMachines(7),
        getTopCauses(7),
    ]);

    const chiffres = {
        mttr: Number(mttr.toFixed(1)),
        mtbf: Number(mtbf.toFixed(1)),
        disponibilite: Number(disponibilite.toFixed(1)),
        machinesEnArret,
        downtimeTotal: Number(downtimeTotal.toFixed(1)),
        topMachines: topMachines.slice(0, 5),
        topCauses: topCauses.slice(0, 5),
    };

    const aucuneActivite =
        chiffres.topMachines.length === 0 &&
        chiffres.topCauses.length === 0 &&
        chiffres.machinesEnArret === 0 &&
        chiffres.downtimeTotal === 0;

    if (aucuneActivite) {
        return {
            chiffres,
            rapport: 'Aucune panne enregistrée cette semaine. L\u2019atelier a fonctionné sans incident notable.',
        };
    }

    const prompt = `Tu es un assistant qui rédige des rapports de maintenance industrielle pour des responsables d'usine textile.
Voici les indicateurs de la semaine écoulée (7 derniers jours) :

- MTTR (temps moyen de réparation) : ${chiffres.mttr} heures
- MTBF (temps moyen entre pannes) : ${chiffres.mtbf} heures
- Taux de disponibilité global du parc : ${chiffres.disponibilite}%
- Machines actuellement à l'arrêt : ${chiffres.machinesEnArret}
- Temps d'arrêt total cumulé cette semaine : ${chiffres.downtimeTotal} heures
- Machines les plus touchées : ${chiffres.topMachines.map((m) => `${m.codeMachine} (${m.nombrePannes} pannes)`).join(', ') || 'aucune'}
- Causes les plus fréquentes : ${chiffres.topCauses.map((c) => `${c.categorie} (${c.nombrePannes})`).join(', ') || 'aucune'}

Rédige un résumé en français, clair et professionnel, destiné à un responsable maintenance. Structure-le en 3 courts paragraphes :
1. Vue d'ensemble de la semaine (disponibilité, tendance générale)
2. Points d'attention (machines/causes récurrentes à surveiller)
3. Une recommandation concrète et actionnable

Reste factuel, base-toi uniquement sur les chiffres donnés, pas de chiffres inventés. Pas de titre, pas de liste à puces, juste les 3 paragraphes.`;

    const completion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.4,
    });

    return {
        chiffres,
        rapport: completion.choices[0].message.content,
    };
}