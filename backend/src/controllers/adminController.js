import { User, Sample, INDMelding } from '../models/index.js';
import Response from '../utils/response.js';
import pkg from 'bcryptjs';

const { genSalt, hash, compare } = pkg;
import { Op } from 'sequelize';

const ValidRoles = ['user', 'admin', 'lab'];

const REG_ERROR = {
    USERNAME_INVALID: 'Brukernavnet må være minst 4 tegn langt og kan kun inneholde bokstaver og tall',
    USERNAME_TAKEN: 'Brukernavnet er allerede i bruk',
    PASSWORD_INVALID: 'Passordet må være minst 4 tegn langt',
    PASSWORD_NOT_MATCH: 'Passordene er ikke like',
    ROLE_INVALID: 'Rollen må være enten "user" eller "admin"',
    UNIT_INVALID: 'Enheten må være minst 1 tegn langt og kan kun inneholde bokstaver og tall'
};

async function validateRegInput(username, password, password_repeat, role, unit) {
    if (!/^[a-zA-Z0-9]{4,}$/.test(username)) {
        return REG_ERROR.USERNAME_INVALID;
    }
    if (password.length < 4) {
        return REG_ERROR.PASSWORD_INVALID;
    }
    if (password !== password_repeat) {
        return REG_ERROR.PASSWORD_NOT_MATCH;
    }
    if (!ValidRoles.includes(role)) {
        return REG_ERROR.ROLE_INVALID;
    }
    if (unit && !/^[a-zA-Z0-9]{1,}$/.test(unit)) {
        return REG_ERROR.UNIT_INVALID;
    }
    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
        return REG_ERROR.USERNAME_TAKEN;
    }
    return null;
}

async function createUser(username, password, role, unit) {
    const data = { username, password_hash: password, role };
    if (unit) {
        data.unit = unit;
    }
    return await User.create(data);
}

const addUser = async (req, res, next) => {
    try {
        const { username, password, password_repeat, role, unit } = req.body;

        // Valider input
        const validationError = await validateRegInput(username, password, password_repeat, role, unit);
        if (validationError) {
            return new Response(400, validationError).sendError(next);
        }
        
        // Opprett bruker
        const user = await createUser(username, password, role, unit);
        
        const response = new Response(201, 'Bruker lagt til', {
            id: user.id,
            username: user.username,
            role: user.role,
            unit: user.unit
        });
        return response.send(res);
    } catch (error) {
        console.error('Feil i addUser:', error);
        // Legg til status dersom den ikke er satt
        error.status = error.status || 500;
        return next(error);
    }
};

const getUsers = async (req, res, next) => {
    try {
        // Hent parametre fra query
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 10;
        
        // Beregn offset for paginering
        const offset = (page - 1) * pageSize;
        
        // Hent brukere fra databasen med paginering
        const { count, rows } = await User.findAndCountAll({
            limit: pageSize,
            offset: offset,
            attributes: ['id', 'username', 'role', 'unit', 'createdAt', 'updatedAt', 'lastLogin', 'active'],
            order: [['createdAt', 'DESC']]
        });
        
        // Beregn totalt antall sider
        const totalPages = Math.ceil(count / pageSize);
        
        // Send respons
        const response = new Response(200, 'Brukere hentet', {
            users: rows,
            pagination: {
                total: count,
                totalPages,
                currentPage: page,
                pageSize
            }
        });
        
        return response.send(res);
    } catch (error) {
        console.error('Feil i getUsers:', error);
        error.status = error.status || 500;
        return next(error);
    }
};

const updateUser = async (req, res, next) => {
    try {
        const { id, username, password, role, unit, active } = req.body;
        
        // Verifiser at ID er gitt
        if (!id) {
            return new Response(400, 'Bruker-ID må angis').sendError(next);
        }
        
        // Finn brukeren som skal oppdateres
        const user = await User.findByPk(id);
        if (!user) {
            return new Response(404, 'Bruker ikke funnet').sendError(next);
        }
        
        // Valider brukernavn hvis det er gitt
        if (username) {
            if (!/^[a-zA-Z0-9]{4,}$/.test(username)) {
                return new Response(400, REG_ERROR.USERNAME_INVALID).sendError(next);
            }
            
            // Sjekk om brukernavnet er tatt av en annen bruker
            const existingUser = await User.findOne({ 
                where: { 
                    username,
                    id: { [Op.ne]: id } // Ikke inkluder aktuell bruker i sjekken
                } 
            });
            
            if (existingUser) {
                return new Response(400, REG_ERROR.USERNAME_TAKEN).sendError(next);
            }
            
            user.username = username;
        }
        
        // Oppdater passord hvis det er gitt
        // Passordet må være minst 4 tegn langt
        if (password) {
            if (password.length < 4) {
                return new Response(400, REG_ERROR.PASSWORD_INVALID).sendError(next);
            }
            
            user.password_hash = password;
        }
        
        // Oppdater rolle hvis den er gitt
        if (role) {
            if (!ValidRoles.includes(role)) {
                return new Response(400, REG_ERROR.ROLE_INVALID).sendError(next);
            }
            user.role = role;
        }
        
        // Oppdater enhet hvis den er gitt
        if (unit !== undefined) {
            if (unit && !/^[a-zA-Z0-9]{1,}$/.test(unit)) {
                return new Response(400, REG_ERROR.UNIT_INVALID).sendError(next);
            }
            user.unit = unit;
        }
        
        // Oppdater aktiv-status hvis den er gitt
        if (active !== undefined) {
            user.active = Boolean(active);
        }
        
        // Lagre endringene
        await user.save();
        
        // Send respons
        const response = new Response(200, 'Bruker oppdatert', {
            id: user.id,
            username: user.username,
            role: user.role,
            unit: user.unit,
            active: user.active,
            updatedAt: user.updatedAt
        });
        
        return response.send(res);
    } catch (error) {
        console.error('Feil i updateUser:', error);
        error.status = error.status || 500;
        return next(error);
    }
};

const updateSampleTable = async (req, res, next) => {
    try {
        await Sample.sync({ alter: true });

        console.log('Sample table updated successfully');
        return new Response(200, 'Sample table updated successfully').send(res);
    } catch (error) {
        console.error('Error updating Sample table:', error);
        error.status = error.status || 500; 
        return new Response(error.status, 'Error updating Sample table', error.message).sendError(next);
    }
}

const createSampleTable = async (req, res, next) => {
    try {
        await Sample.sync({ force: true });
        console.log('Sample table created successfully');
        return new Response(200, 'Sample table created successfully').send(res);
    } catch (error) {
        console.error('Error creating Sample table:', error);
        error.status = error.status || 500;
        return new Response(error.status, 'Error creating Sample table', error.message).sendError(next);
    }
}

const createIndTable = async (req, res, next) => {
    try {
        await INDMelding.sync({ force: true });
        console.log('Sample table created successfully');
        return new Response(200, 'Sample table created successfully').send(res);
    } catch (error) {
        console.error('Error creating Sample table:', error);
        error.status = error.status || 500;
        return new Response(error.status, 'Error creating Sample table', error.message).sendError(next);
    }
}

const recreateSampleTable = async (req, res, next) => {
    try {
        await Sample.drop();
        await Sample.sync({ force: true });
        console.log('Sample table recreated successfully');
        return new Response(200, 'Sample table recreated successfully').send(res);
    } catch (error) {
        console.error('Error recreating Sample table:', error);
        error.status = error.status || 500;
        return new Response(error.status, 'Error recreating Sample table', error.message).sendError(next);
    }
}


export { addUser, getUsers, updateUser, updateSampleTable, createSampleTable, recreateSampleTable, createIndTable };