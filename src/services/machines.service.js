import prisma from '../config/db.js';

export async function addMachine(machineData) {
    const nouvelleMachine = await prisma.machine.create({
        data: machineData
    });
    return nouvelleMachine;
}

export async function getMachines() {
    return await prisma.machine.findMany();
}

export async function getMachineById(id) {
    return await prisma.machine.findUnique({
        where: { idMachine: id }
    });
}

export async function updateMachine(id, machineData) {
    return await prisma.machine.update({
        where: { idMachine: id },
        data: machineData
    });
}

export async function deleteMachine(id) {
    return await prisma.machine.delete({
        where: { idMachine: id }
    });
}