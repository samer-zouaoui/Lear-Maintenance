import prisma from './src/config/db.js';

const machines = await prisma.machine.findMany();
console.log(machines);