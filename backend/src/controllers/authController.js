import { User } from '../models/index.js';

const login = async (req, res) => {
    try {
        const { username, password } = req.body;
        
        const user = await User.findOne({ where: { username } });

        if (!user || !(await user.validatePassword(password))) {
            return res.status(401).json({ error: 'Ugyldig brukernavn eller passord' });
        }
        
        req.session.user = {
            id: user.id,
            username: user.username,
            role: user.role,
            loggedIn: true
        };

        await req.session.save();

        const currentTime = new Date();
        user.lastLogin = currentTime;
        await user.save();
        
        res.json({ message: 'Innlogging vellykket', user: req.session.user });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Serverfeil' });
    }
}

const logout = (req, res) => {
    req.session.destroy();
    res.json({ message: 'Utlogging vellykket' });
}

export {
    login,
    logout
}