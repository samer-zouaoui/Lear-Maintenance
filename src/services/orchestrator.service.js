import { Annotation, StateGraph, END } from "@langchain/langgraph";
import Groq from "groq-sdk";
import { rechercherCasSimilaires } from "./ragAgent.service.js";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SEUIL_PERTINENCE = 0.5;

// L'état partagé entre les nœuds du graphe : chaque nœud lit/écrit dedans.
const EtatDiagnostic = Annotation.Root({
    panne: Annotation(),
    casSimilaires: Annotation({ default: () => [] }),
    suggestionDisponible: Annotation({ default: () => false }),
    suggestion: Annotation({ default: () => null }),
    message: Annotation({ default: () => null }),
});

// --- Nœud 1 : Agent RAG ---
async function noeudRecherche(state) {
    const resultats = await rechercherCasSimilaires(state.panne, 3);
    const casPertinents = resultats.filter((c) => c.score > SEUIL_PERTINENCE);
    return { casSimilaires: casPertinents };
}

// --- Arête conditionnelle : décide du chemin selon la pertinence trouvée ---
function decidePassageDiagnostic(state) {
    return state.casSimilaires.length > 0 ? "diagnostic" : "sansSuggestion";
}

// --- Nœud 2a : Agent Diagnostic (si cas pertinents trouvés) ---
async function noeudDiagnostic(state) {
    const contexte = state.casSimilaires
        .map((c, i) => `Cas ${i + 1} (similarité ${(c.score * 100).toFixed(0)}%) — Machine ${c.machineCode} :
Diagnostic : ${c.diagnostic}
Cause racine : ${c.causeRacine}
Solution appliquée : ${c.solutionAppliquee}
Pièces utilisées : ${c.piecesUtilisee || "non précisé"}`)
        .join("\n\n");

    const prompt = `Tu es un assistant technique en maintenance industrielle dans une usine textile.
Une nouvelle panne vient d'être déclarée :
Titre : ${state.panne.titre}
Catégorie : ${state.panne.categorie}
Machine : ${state.panne.machineCode || "non précisée"}

Voici des cas similaires déjà résolus dans le passé :

${contexte}

En te basant UNIQUEMENT sur ces cas similaires, propose en français :
1. Une hypothèse de diagnostic probable (1-2 phrases)
2. Une cause racine probable (1 phrase)
3. Une solution suggérée (1-2 phrases)

Réponds au format JSON strict, sans texte autour :
{"diagnostic": "...", "causeRacine": "...", "solutionAppliquee": "..."}`;

    const completion = await groq.chat.completions.create({
        model: "openai/gpt-oss-120b",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        response_format: { type: "json_object" },
    });

    return {
        suggestionDisponible: true,
        suggestion: JSON.parse(completion.choices[0].message.content),
    };
}

// --- Nœud 2b : pas assez d'historique (chemin alternatif) ---
async function noeudSansSuggestion() {
    return {
        suggestionDisponible: false,
        message: "Pas assez d\u2019historique similaire pour proposer une suggestion fiable.",
    };
}

// --- Construction du graphe ---
const graphe = new StateGraph(EtatDiagnostic)
    .addNode("recherche", noeudRecherche)
    .addNode("diagnostic", noeudDiagnostic)
    .addNode("sansSuggestion", noeudSansSuggestion)
    .addEdge("__start__", "recherche")
    .addConditionalEdges("recherche", decidePassageDiagnostic, {
        diagnostic: "diagnostic",
        sansSuggestion: "sansSuggestion",
    })
    .addEdge("diagnostic", END)
    .addEdge("sansSuggestion", END);

const app = graphe.compile();

// Point d'entrée public : même signature/forme de retour que l'ancien suggererDiagnostic,
// donc aucun changement nécessaire côté contrôleur/frontend.
export async function orchestrerDiagnostic(panne) {
    const resultat = await app.invoke({ panne });
    return {
        suggestionDisponible: resultat.suggestionDisponible,
        suggestion: resultat.suggestion,
        message: resultat.message,
        casSimilaires: resultat.casSimilaires,
    };
}