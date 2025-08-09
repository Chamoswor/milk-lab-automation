
class Response {
    constructor(status, message, data = null) {
        this.status = status;
        this.message = message;
        this.data = data;
    }

    send(res) {
        return res.status(this.status).json({
            success: true,
            message: this.message || null,
            content: this.data || null
        });
    }
    
    sendError(next) {
        const err = new Error(this.message);
        err.status = this.status;
        return next(err);
    }
    
}

export default Response;
