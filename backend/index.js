const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const app = express();
const cors = require('cors');
const axios = require('axios');



// Funksjon for å hente tillatte scripts
function getAllowedScripts() {
  axios.get('http://python:5000/allowed-scripts')
    .then(response => {
      return response.data;
    })
    .catch(error => {
      console.error('Feil ved henting av tillatte scripts:', error.response ? error.response.data : error.message);
    });
}

function runScript(script, args) {
  const allowed_scripts = getAllowedScripts();
  
  if (!allowed_scripts || allowed_scripts.length === 0) {
    console.error('Kan ikke kjøre script før tillatte scripts er hentet');
    return Promise.reject(new Error('Tillatte scripts ikke lastet'));
  }

  if (!allowed_scripts.includes(script)) {
    console.error('Script ' + script + ' eksisterer ikke');
    return Promise.reject(new Error('Script ikke tillatt'));
  }
  
  return axios.post('http://python:5000/run-script', {
      script: script,
      args: args
    })
    .then(response => {
      console.log('Script output:', response.data);
      return response.data;
    })
    .catch(error => {
      console.error('Feil ved kjøring av script:', error.response ? error.response.data : error.message);
      throw error;
    });
}

function isValidRole(req, role) {
  return req.session.user && req.session.user.role === role;
}


(function logFilter(error) {
  if (error.response && error.response.status !== 401) {
    console.error('Request failed:', error.response.data);
  }
})(app);

// Moved to Middleware folder as corsMiddleware.js
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:8080',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
// End of CORS middleware

const { Sequelize, QueryTypes } = require('sequelize');
const SequelizeStore = require('connect-session-sequelize')(session.Store);
const sequelize = new Sequelize(
  process.env.DB_NAME || 'mydb',
  process.env.DB_USER || 'kim',
  process.env.DB_PASSWORD || 'SECRET',
  {
    host: process.env.DB_HOST || 'mysql',
    port: 3306,
    dialect: 'mysql',
    logging: false,
    dialectOptions: {
      connectTimeout: 60000
    }
  }
);

app.set('trust proxy', 1);

// Moved to Middleware folder as sessionMiddleware.js
const sessionStore = new SequelizeStore({
  db: sequelize,
  tableName: 'sessions',       
  checkExpirationInterval: 15 * 60 * 1000, 
  expiration: 24 * 60 * 60 * 1000         
});

app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret',
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  proxy: true,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // Set to true in production
    maxAge: 24 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax' // Adjust for cross-site if needed
  }
}));

sessionStore.sync().then(() => {
  console.log("Session table created or already exists");
}).catch(error => {
  logFilter(error);
});

// End of session middleware



app.use(express.json());

app.get('/api/', (req, res) => {
  res.json({ message: 'Backend API is running' });
});

const securedRouter = express.Router();
function isAuthenticated(req, res, next) {
  if (req.session.user && req.session.user.loggedIn) {
    return next();
  }
  res.status(401).json({ error: 'Ikke innlogget' });
}
securedRouter.use(isAuthenticated);

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const [user] = await sequelize.query(
      'SELECT * FROM users WHERE username = :username LIMIT 1',
      {
        replacements: { username },
        type: QueryTypes.SELECT
      }
    );

    if (!user) {
      return res.status(401).json({ error: 'Ugyldig brukernavn eller passord' });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Ugyldig brukernavn eller passord' });
    }

    req.session.user = {
      id: user.id,
      username: user.username,
      role: user.role,
      loggedIn: true
    };

    await req.session.save();
    res.json({ message: 'Innlogging vellykket', user: req.session.user });

  } catch (error) {
    logFilter(error);
    res.status(500).json({ error: 'Serverfeil' });
  }
});

app.get('/api/no-session/user-status', (req, res) => {
  if (req.session.user && req.session.user.loggedIn) {
    res.json({ user: req.session.user });
  } else {
    res.json({ user: null });
  }
});

app.get('/api/no-session/user-role', (req, res) => {
  if (req.session.user) {
    res.json({ role: req.session.user.role });
  } else {
    res.json({ role: null });
  }
});

securedRouter.get('/user', (req, res) => {
  try {
    res.json({ user: req.session.user });
  } catch (error) {
    res.status(500).json({ error: 'Serverfeil' });
    logFilter(error);
  }
});

securedRouter.post('/add-user', async (req, res) => {
  try {
    if (!isValidRole(req, 'admin')) return res.status(403).json({ error: 'Ikke autorisert' });
    
    const { username, password, role } = req.body;
    
    // Validering
    if (!username || !password || !role) {
      return res.status(400).json({ error: 'Alle feltene må fylles ut' });
    }
    
    // Sett opp argumentene slik at Python-scriptet kan lese dem (f.eks. med argparse i add.py)
    const args = [username, '--role', role, '--password', password];

    // Kjør Python-scriptet via runScript-funksjonen
    const result = await runScript('add', args);
    
    // Svar til klienten med resultatet fra scriptet
    res.json({ message: 'Bruker lagt til', details: result });
    
  } catch (error) {
    res.status(500).json({ error: 'Serverfeil', details: error.message });
    logFilter(error);
  }
});



app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ message: 'Utlogging vellykket' });
});

// 6) Koble til DB
(async function connectWithRetry() {
  try {
    await sequelize.authenticate();
    console.log('Tilkoblet til database!');
  } catch (err) {
    console.error('Database tilkoblingsfeil, prøver igjen om 5 sekunder:', err);
    setTimeout(connectWithRetry, 5000);
  }
})();

// 7) Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server kjører på port ${PORT}`);
});

app.use('/api', securedRouter);
