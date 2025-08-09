const isAuthenticated = (req, res, next) => {
    if (req.session.user && req.session.user.loggedIn) {
      return next();
    }
    res.status(401).json({ error: 'Ikke innlogget' });
  };

function isValidRole(role) {
    return (req, res, next) => {
        if (req.session.user && req.session.user.role === role) {
            return next();
        } else {
            return res.status(403).json({ error: 'Ikke autorisert' });
        }
    };
}
  

export {
    isAuthenticated,
    isValidRole
}
