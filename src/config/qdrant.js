import 'dotenv/config';
import { QdrantClient } from '@qdrant/js-client-rest';

const qdrant = new QdrantClient({
    url: process.env.QDRANT_URL,
    apiKey: process.env.QDRANT_API_KEY,
    checkCompatibility: false,
});
export const COLLECTION_INTERVENTIONS = 'interventions_historique';

export async function assurerCollection() {
    const collections = await qdrant.getCollections();
    const existe = collections.collections.some((c) => c.name === COLLECTION_INTERVENTIONS);

    if (!existe) {
        await qdrant.createCollection(COLLECTION_INTERVENTIONS, {
            vectors: { size: 384, distance: 'Cosine' },
        });
        console.log(`Collection Qdrant "${COLLECTION_INTERVENTIONS}" créée.`);
    }
}

export default qdrant;