import { pipeline } from '@xenova/transformers';

let embedder = null;

async function getEmbedder() {
    if (!embedder) {
        embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    }
    return embedder;
}

export async function genererEmbedding(texte) {
    const model = await getEmbedder();
    const resultat = await model(texte, { pooling: 'mean', normalize: true });
    return Array.from(resultat.data); 
}