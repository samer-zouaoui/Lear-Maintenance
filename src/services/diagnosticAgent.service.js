import Groq from 'groq-sdk';
import { rechercherCasSimilaires } from './ragAgent.service.js';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function suggererDiagnostic(panne) {
    const casSimilaires = await rechercherCasSimilaires(panne, 3);

    // Si aucun cas historique pertinent (score trop faible), on ne force pas une suggestion inventée.
    const casPertinents = casSimilaires.filter((c) => c.score > 0.5);
    if (casPertinents.length === 0) {
        return {
            suggestionDisponible: false,
            message: 'Pas assez d\u2019historique similaire pour proposer une suggestion fiable.',
            casSimilaires: [],
        };
    }

    const contexte = casPertinents
        .map((c, i) => `Cas ${i + 1} (similarité ${(c.score * 100).toFixed(0)}%) — Machine ${c.machineCode} :
Diagnostic : ${c.diagnostic}
Cause racine : ${c.causeRacine}
Solution appliquée : ${c.solutionAppliquee}
Pièces utilisées : ${c.piecesUtilisee || 'non précisé'}`)
        .join('\n\n');

    const prompt = `Tu es un assistant technique en maintenance industrielle dans une usine textile.
Une nouvelle panne vient d'être déclarée :
Titre : ${panne.titre}
Catégorie : ${panne.categorie}
Machine : ${panne.machineCode || 'non précisée'}

Voici des cas similaires déjà résolus dans le passé :

${contexte}

En te basant UNIQUEMENT sur ces cas similaires, propose en français :
1. Une hypothèse de diagnostic probable (1-2 phrases)
2. Une cause racine probable (1 phrase)
3. Une solution suggérée (1-2 phrases)

Réponds au format JSON strict, sans texte autour :
{"diagnostic": "...", "causeRacine": "...", "solutionAppliquee": "..."}`;

    const completion = await groq.chat.completions.create({
        model: 'openai/gpt-oss-120b',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        response_format: { type: 'json_object' },
    });

    const suggestion = JSON.parse(completion.choices[0].message.content);

    return {
        suggestionDisponible: true,
        suggestion,
        casSimilaires: casPertinents,
    };
}