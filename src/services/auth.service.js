import prisma from '../config/db.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';


export async function registerUser(userData) {
    const hashedPassword = await bcrypt.hash(userData.motDePasse, 10);
    const nouvelUser = {
        ...userData,
        motDePasse: hashedPassword ,
        role:'DEMANDEUR'
    };

    const user = await prisma.user.create({
        data: nouvelUser
    });

    const { motDePasse, ...userSansMotDePasse } = user;
    return userSansMotDePasse;
}
export async function getUserByEmail(email) {
    return await prisma.user.findUnique({
        where: { email: email }
    });
}

export async function getUserById(id) {
    const user = await prisma.user.findUnique({
        where: { idUser: id }
    });
    if (!user) return null;
    const { motDePasse, ...userSansMotDePasse } = user;
    return userSansMotDePasse;
}   

export async function updateUser(id, userData) {
    return await prisma.user.update({
        where: { idUser: id },
        data: userData
    });
}   

// "Supprimer" un compte ne le supprime jamais réellement en base : on le désactive.
// Ça évite de perdre l'historique (interventions, maintenances préventives réalisées)
// et ça évite tout crash de contrainte de clé étrangère.
export async function deactivateUser(id) {
    const user = await prisma.user.findUnique({ where: { idUser: id } });
    if (!user) {
        throw new Error('Utilisateur introuvable');
    }

    const { motDePasse, ...userMisAJour } = await prisma.user.update({
        where: { idUser: id },
        data: { actif: false },
    });
    return userMisAJour;
}

export async function reactivateUser(id) {
    const user = await prisma.user.findUnique({ where: { idUser: id } });
    if (!user) {
        throw new Error('Utilisateur introuvable');
    }

    const { motDePasse, ...userMisAJour } = await prisma.user.update({
        where: { idUser: id },
        data: { actif: true },
    });
    return userMisAJour;
}

// filtre : 'actifs' (défaut, comptes utilisables au quotidien) | 'inactifs' (désactivés) | 'tous'
export async function getAllUsers(filtre = 'actifs') {
    const where = filtre === 'inactifs' ? { actif: false } : filtre === 'tous' ? {} : { actif: true };

    const users = await prisma.user.findMany({ where, orderBy: { idUser: 'asc' } });
    return users.map(({ motDePasse, ...u }) => u);
}


export async function loginUser(email, password) {
    const user = await getUserByEmail(email);
    if (!user) {
        throw new Error('Utilisateur non trouvé');
    }
    if (!user.actif) {
        throw new Error('Ce compte a été désactivé. Contactez un administrateur.');
    }
    const isMatch = await bcrypt.compare(password, user.motDePasse);
    if (!isMatch) {
        throw new Error('Mot de passe incorrect');
    }

    const token = jwt.sign(
        { idUser: user.idUser, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
    );

    const { motDePasse, ...userSansMotDePasse } = user;
    return { user: userSansMotDePasse, token };
}