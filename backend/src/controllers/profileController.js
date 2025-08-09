import { User } from '../models/index.js';
import Response from '../utils/response.js';
const getProfile = async (req, res) => {
  try {
    const userId = req.session.user.id;

    // Finn brukeren basert på id, ekskluder gjerne sensitive felter som passord
    const user = await User.findByPk(userId, {
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      return res.status(404).json({ error: 'Bruker ikke funnet' });
    }
    new Response(200, 'Brukerprofil funnet', user).send(res);
  } catch (error) {
    console.error('Feil under henting av brukerprofil:', error);
    new Response(500, 'Serverfeil').sendError(next);
  }
};

const getRole = async (req, res, next) => {
  try {
    const userId = req.session.user.id;

    const user = await User.findByPk(userId, {
      attributes: ['role']
    });

    if (!user) {
      //return res.status(404).json({ error: 'Bruker ikke funnet' });
      return new Response(404, 'Bruker ikke funnet').sendError(next);
    }

    new Response(200, 'Rolle funnet', user.role).send(res);
  } catch (error) {
    console.error('Feil under henting av brukerrolle:', error);
    new Response(500, 'Serverfeil').sendError(next);
  }
};

export { 
    getProfile,
    getRole
};
