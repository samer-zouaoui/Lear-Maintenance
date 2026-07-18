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

export async function deleteUser(id) {
    return await prisma.user.delete({
        where: { idUser: id }
    });
}

export async function getAllUsers() {
    return await prisma.user.findMany();
}


export async function loginUser(email, password) {
    const user = await getUserByEmail(email);
    if (!user) {
        throw new Error('Utilisateur non trouvé');
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