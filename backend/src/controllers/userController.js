const getUserData = async (req, res) => {
    try {
        if (req.session.user && req.session.user.loggedIn) {
        res.json({ user: req.session.user });
        } else {
        res.json({ user: null });
        }
    } catch (error) {
        console.error('Feil under henting av innloggingsstatus:', error);
        res.status(500).json({ error: 'Serverfeil' });
    }
};

const getRole = async (req, res) => {
    try {
        if (req.session.user) {
            res.json({ role: req.session.user.role });
        } else {
            res.json({ role: null });
        }
    } catch (error) {
        console.error('Feil under henting av brukerrolle:', error);
        res.status(500).json({ error: 'Serverfeil' });
    }
}

export {
    getUserData,
    getRole
};