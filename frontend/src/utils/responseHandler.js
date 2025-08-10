import { api } from '@/middleware/backend';

class Response {
    constructor() {
        this.success = false;
        this.message = null;
        this.data = null;
    }

    async post(url, data) {
        try {
            const response = await api.post(url, data);
            this.message = response.data.message || null;
            this.data = response.data.content || null;

            if (this.message || this.data) {
                this.success = true;
            }
        } catch (error) {
            this.success = false;
            this.message = error.response?.data?.error || error.message || "Ukjent feil oppstod.";
            this.data = error.response?.data?.details || null;
        }
        return this;
    }

    async get(url, params = null) {
        try {
            const response = await api.get(url, { params });
            this.message = response.data.message || null;
            this.data = response.data.content || null;

            if (this.message || this.data) {
                this.success = true;
            }
        } catch (error) {
            this.success = false;
            this.message = error.response?.data?.error || error.message || "Ukjent feil oppstod.";
            this.data = error.response?.data?.details || null;
        }
        return this;
    }

    async put(url, id, data) {
        try {
            const response = await api.put(`${url}/${id}`, data);
            this.message = response.data.message || null;
            this.data = response.data.content || null;

            if (this.message || this.data) {
                this.success = true;
            }
        } catch (error) {
            this.success = false;
            this.message = error.response?.data?.error || error.message || "Ukjent feil oppstod.";
            this.data = error.response?.data?.details || null;
        }
        return this;
    }

    async delete(url, id) {
        try {
            const response = await api.delete(`${url}/${id}`);
            this.message = response.data.message || null;
            this.data = response.data.content || null;

            if (this.message || this.data) {
                this.success = true;
            }
        } catch (error) {
            this.success = false;
            this.message = error.response?.data?.error || error.message || "Ukjent feil oppstod.";
            this.data = error.response?.data?.details || null;
        }
        return this;
    }
}

export default Response;
