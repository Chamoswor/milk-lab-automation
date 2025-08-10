import { Router } from 'express';
import { isValidRole } from '../middlewares/authMiddleware.js';
import { addUser, getUsers, updateUser, 
    updateSampleTable, createSampleTable, recreateSampleTable, createIndTable } from '../controllers/adminController.js';
import { 
    getAllTables, 
    getTableData, 
    getTableColumns,
    getTableIndexes, 
    editTableData, 
    deleteTableData, 
    createTable, 
    deleteTable, 
    addColumn,
    deleteColumn,
    addIndex,
    deleteIndex 
} from '../controllers/dbController.js';

const adminRoutes = Router();

adminRoutes.use(isValidRole('admin'));

// User routes
adminRoutes.post('/user/add', addUser);
adminRoutes.get('/user/getAll', getUsers);
adminRoutes.put('/user/update', updateUser);

// Database routes
adminRoutes.get('/db/tables', getAllTables);
adminRoutes.get('/db/tables/:tableName', getTableData);
adminRoutes.get('/db/tables/:tableName/columns', getTableColumns);
adminRoutes.get('/db/tables/:tableName/indexes', getTableIndexes);
adminRoutes.post('/db/tables/:tableName/edit', editTableData);
adminRoutes.delete('/db/tables/:tableName/delete', deleteTableData);
adminRoutes.post('/db/tables/create', createTable);
adminRoutes.delete('/db/tables/:tableName', deleteTable);
adminRoutes.post('/db/tables/:tableName/columns/add', addColumn);
adminRoutes.delete('/db/tables/:tableName/columns/:columnName', deleteColumn);
adminRoutes.post('/db/tables/:tableName/indexes/add', addIndex);
adminRoutes.delete('/db/tables/:tableName/indexes/:indexName', deleteIndex);

// Sample table routes
adminRoutes.get('/sample/update', updateSampleTable);
adminRoutes.get('/sample/create', createSampleTable);
adminRoutes.get('/sample/recreate', recreateSampleTable);
adminRoutes.get('/ind/create', createIndTable)
export default adminRoutes;