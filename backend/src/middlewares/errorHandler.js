// middlewares/errorHandler.js

function errorHandler(err, req, res, next) {
    console.error('Error caught by errorHandler:', err);
    // Hvis headers allerede er sendt, la Express håndtere feilen videre
    if (res.headersSent) {
        return next(err);
    }
    res.status(err.status || 500).json({
        success: false,
        error: err.message || 'Serverfeil',
        details: err.details || ''
    });
}

export default errorHandler;