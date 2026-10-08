import qdrant, { COLLECTION_INTERVENTIONS } from '../config/qdrant.js';
import { genererEmbedding } from './embeddings.service.js';

export async function rechercherCasSimilaires(panne, limite = 4) {
    const texteRequete = [
        `Titre: ${panne.titre}`,
        `Catégorie: ${panne.categorie}`,
    ].join('\n');

    const vecteur = await genererEmbedding(texteRequete);

    const resultat = await qdrant.query(COLLECTION_INTERVENTIONS, {
        query: vecteur,
        limit: limite,
        with_payload: true,
    });

    return resultat.points.map((r) => ({
        score: r.score,
        ...r.payload,
    }));
}