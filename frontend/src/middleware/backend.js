import axios from 'axios';
import Response from '@/utils/responseHandler';

export const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

const Path = {
    GET_BASIC_USER_DATA: "/users/data",
    GET_ROLE: "/users/role",
    LOGOUT: "/auth/logout",
    LOGIN: "/auth/login",

    ADMIN: {
        ADD_USER: "/admin/user/add",
        DELETE_USER: "/admin/user/delete",
        GET_USERS: "/admin/user/getAll",
        GET_USER: "/admin/user/get",
        UPDATE_USER: "/admin/user/update",

        GET_DB_TABLES: "/admin/db/tables",

        CREATE_SAMPLE_TABLE: "/admin/sample/create",
        UPDATE_SAMPLE_TABLE: "/admin/sample/update",
        RECREATE_SAMPLE_TABLE: "/admin/sample/recreate",

    }
}

async function GetBasicUserData() {
    try {
        const response = await api.get(
            Path.GET_BASIC_USER_DATA
        )
        return response.data?.user ?? null;
    } catch (error) {
        console.error("Feil ved henting av brukerdata:", error);
        return null;
    }
}


async function GetRole() {
    try {
        const response = await api.get(
            Path.GET_ROLE
        )
        return response.data?.role ?? null;
    } catch (error) {
        console.error("Feil ved henting av rolle:", error);
        return null;
    }
}

async function LogOut() {
    try {
        await api.get(
            Path.LOGOUT
        )
    } catch (error) {
        console.error(error)
    }
}

async function LogIn(username, password) {
    try {
        return await api.post(
            Path.LOGIN,
            {
                username,
                password
            },
            { withCredentials: true }
            )
    } catch (error) {
        console.error(error)
    }
}


// Admin
async function admin_addUser(data) {
    if (!data) {
        return null;
    }
    return await new Response().post(Path.ADMIN.ADD_USER, data);
}

async function admin_deleteUser(id) {
    if (!id) {
        return null;
    }
    return await new Response().delete(Path.ADMIN.DELETE_USER, id);
}



async function admin_getUsers(params) {
    if (!params) {
        return null;
    }
    return await new Response().get(Path.ADMIN.GET_USERS, params);
}

async function admin_getUser(id) {
    if (!id) {
        return null;
    }
    return await new Response().get(Path.ADMIN.GET_USER, id);
}

async function admin_updateUser(userData) {
    try {
      const response = await api.put(Path.ADMIN.UPDATE_USER, userData, {
        withCredentials: true
      });
      
      return response.data;
    } catch (error) {
      
      if (error.response && error.response.data) {
        return error.response.data;
      }
      
      return {
        success: false,
        message: error.message || 'Tilkoblingsfeil til server'
      };
    }
  }

async function admin_createSampleTable() {
    try {
        const response = await api.get(Path.ADMIN.CREATE_SAMPLE_TABLE);
        return response.data ?? null;
    }
    catch (error) {
        console.error("Feil ved oppretting av sample table:", error);
        return null;
    }
}

async function admin_updateSampleTable() {
    try {
        const response = await api.get(Path.ADMIN.UPDATE_SAMPLE_TABLE);
        return response.data ?? null;
    }
    catch (error) {
        console.error("Feil ved oppdatering av sample table:", error);
        return null;
    }
}

async function admin_recreateSampleTable() {
    try {
        const response = await api.get(Path.ADMIN.RECREATE_SAMPLE_TABLE);
        return response.data ?? null;
    }
    catch (error) {
        console.error("Feil ved gjenoppretting av sample table:", error);
        return null;
    }
}

export {
    GetBasicUserData,
    GetRole,
    LogOut,
    LogIn,

    admin_addUser,
    admin_deleteUser,
    admin_getUsers,
    admin_getUser,
    admin_updateUser,
    admin_createSampleTable,
    admin_updateSampleTable,
    admin_recreateSampleTable
}