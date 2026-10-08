import { z } from 'zod';
import { tool } from '@langchain/core/tools';
import prisma from '../config/db.js';
import { getMTTR, getMTBF, getTauxDisponibilite, getMachinesEnArret, getTopMachines, getTopCauses } from './dashboard.service.js';

export const outilStatistiques = tool(
  async ({ jours }) => {
    const [mttr, mtbf, disponibilite, machinesEnArret, topMachines, topCauses] = await Promise.all([
      getMTTR(jours),
      getMTBF(jours),
      getTauxDisponibilite(),
      getMachinesEnArret(),
      getTopMachines(jours),
      getTopCauses(jours),
    ]);
    return JSON.stringify({
      mttr: mttr.toFixed(1),
      mtbf: mtbf.toFixed(1),
      disponibilite: disponibilite.toFixed(1),
      machinesEnArret,
      topMachines: topMachines.slice(0, 5),
      topCauses: topCauses.slice(0, 5),
    });
  },
  {
    name: 'statistiques_maintenance',
    description: 'Donne les indicateurs de maintenance (MTTR, MTBF, disponibilité, top machines/causes) sur une période récente.',
    schema: z.object({
      jours: z.number().describe('Nombre de jours en arrière à analyser, ex: 7 ou 30'),
    }),
  }
);

export const outilRechercherPannes = tool(
  async ({ statut, machineCode }) => {
    const pannes = await prisma.panne.findMany({
      where: {
        ...(statut ? { statutPanne: statut } : {}),
        ...(machineCode ? { machine: { codeMachine: { contains: machineCode, mode: 'insensitive' } } } : {}),
      },
      include: { machine: true, technicien: true },
      orderBy: { dateCreation: 'desc' },
      take: 15,
    });
    return JSON.stringify(
      pannes.map((p) => ({
        id: p.idPanne,
        titre: p.titre,
        statut: p.statutPanne,
        priorite: p.priorite,
        machine: p.machine.codeMachine,
        technicien: p.technicien?.nomUser || 'non affecté',
        date: p.dateCreation,
      }))
    );
  },
  {
    name: 'rechercher_pannes',
    description: 'Recherche des pannes par statut et/ou code machine. Retourne les 15 plus récentes correspondantes.',
    schema: z.object({
      statut: z
        .enum(['NOUVEAU', 'AFFECTE', 'EN_COURS', 'RESOLU'])
        .nullable()
        .optional()
        .describe('Filtre par statut, omettre ou null pour tous'),
      machineCode: z
        .string()
        .nullable()
        .optional()
        .describe('Filtre par code machine (recherche partielle), ex: "C001"'),
    }),
  }
);

export const outilRechercherMachines = tool(
  async ({ statut, projetCode }) => {
    const machines = await prisma.machine.findMany({
      where: {
        archivee: false,
        ...(statut ? { statutMachine: statut } : {}),
        ...(projetCode ? { ligne: { projet: { code: { contains: projetCode, mode: 'insensitive' } } } } : {}),
      },
      include: { ligne: { include: { projet: true } } },
      take: 20,
    });
    return JSON.stringify(
      machines.map((m) => ({
        code: m.codeMachine,
        nom: m.nomMachine,
        statut: m.statutMachine,
        projet: m.ligne.projet.code,
        ligne: m.ligne.code,
        criticite: m.criticite,
      }))
    );
  },
  {
    name: 'rechercher_machines',
    description: 'Recherche des machines par statut et/ou projet. Retourne jusqu’à 20 résultats.',
    schema: z.object({
      statut: z.enum(['ACTIF', 'EN_PANNE', 'MAINTENANCE']).nullable().optional(),
      projetCode: z.string().nullable().optional().describe('ex: "MBEAM", "NCAR"'),
    }),
  }
);

export const outilCompterEntites = tool(
    async () => {
        const [totalMachines, machinesActives, machinesEnPanne, machinesMaintenance, totalPannes, pannesEnCours, totalInterventions, totalProjets] = await Promise.all([
            prisma.machine.count({ where: { archivee: false } }),
            prisma.machine.count({ where: { archivee: false, statutMachine: 'ACTIF' } }),
            prisma.machine.count({ where: { archivee: false, statutMachine: 'EN_PANNE' } }),
            prisma.machine.count({ where: { archivee: false, statutMachine: 'MAINTENANCE' } }),
            prisma.panne.count(),
            prisma.panne.count({ where: { statutPanne: { not: 'RESOLU' } } }),
            prisma.intervention.count(),
            prisma.projet.count({ where: { actif: true } }),
        ]);
        return JSON.stringify({
            totalMachines, machinesActives, machinesEnPanne, machinesMaintenance,
            totalPannes, pannesEnCours, totalInterventions, totalProjets,
        });
    },
    {
        name: 'compter_entites',
        description: 'Donne les COMPTAGES EXACTS et complets (pas limités) : nombre total de machines, machines par statut, nombre total de pannes, pannes en cours, nombre total d\u2019interventions, nombre de projets actifs. À utiliser en priorité pour toute question de type "combien de..." plutôt que rechercher_pannes/rechercher_machines qui sont limités à quelques résultats.',
        schema: z.object({}),
    }
);

export const outilsDisponibles = [outilStatistiques, outilRechercherPannes, outilRechercherMachines, outilCompterEntites];

