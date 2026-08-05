// Middleware générique : n'autorise que les rôles listés à accéder à la route.
// À utiliser après authenticateToken (req.user doit déjà être rempli).
export function requireRole(...rolesAutorises) {
    return function (req, res, next) {
        if (!req.user || !rolesAutorises.includes(req.user.role)) {
            return res.status(403).json({ error: 'Action réservée aux techniciens' });
        }
        next();
    };
}