import * as machineService from "../services/machines.service.js";

export async function getAllMachine(req , res){
    try{
    const machines = await machineService.getMachines();
    res.json(machines) }
    catch(error) {
        res.status(500).json({error: error.message})
    }

}

export async function createMachine(req, res) {
    try{
    const machine= await machineService.addMachine(req.body);
    res.status(201).json(machine)
    } catch (error) {
        res.status(500).json({error: error.message})
    }
}

export async function getMachineById(req, res){
    try{
        const id = parseInt(req.params.id);
        const machine = await machineService.getMachineById(id);
        if(machine){
            res.json(machine);
        } else {
            res.status(404).json({error: "Machine not found"});
        }   
    }
    catch(error){
        res.status(500).json({error: error.message})
    }   
}

export async function updateMachine(req, res){
    try{
        const id=parseInt(req.params.id);
        const machine = await machineService.updateMachine(id, req.body);
        res.json(machine);
    } catch (error) {
        res.status(500).json({error: error.message})
    }
}

export async function deleteMachine(req, res){
    try{
        const id=parseInt(req.params.id);
        await machineService.deleteMachine(id);
        res.status(204).end();
    } catch (error) {
        res.status(500).json({error: error.message})
    }   
}
    