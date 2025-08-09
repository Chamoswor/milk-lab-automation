import { dbClient } from '../config/dbConfig.js';
import Response from '../utils/response.js';

async function getAllTables(req, res, next) {
    try {
        const tables = await dbClient.getQueryInterface().showAllTables();
        return new Response(200, 'Tabeller hentet', tables).send(res);
    } catch (error) {
        console.error('Error in getAllTables:', error);
        return new Response(500, 'Feil ved henting av tabeller', error.message).sendError(next);
    }
}

async function getTableData(req, res, next) {
    try {
        const { tableName } = req.params;
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 10;
        
        console.log(`Fetching data for ${tableName}, page: ${page}, pageSize: ${pageSize}`);
        
        // Validate tableName to prevent SQL injection
        const validTableRegex = /^[a-zA-Z0-9_]+$/;
        if (!validTableRegex.test(tableName)) {
            return new Response(400, 'Ugyldig tabellnavn', null).send(res);
        }
        
        // Check if table exists
        const tables = await dbClient.getQueryInterface().showAllTables();
        if (!tables.includes(tableName)) {
            return new Response(404, `Tabell ${tableName} finnes ikke`, null).send(res);
        }
        
        // Calculate offset for pagination
        const offset = (page - 1) * pageSize;
        
        // Bruk en direkte query-streng istedenfor parameterisert spørring
        // siden tableName allerede er validert
        const [data] = await dbClient.query(
            `SELECT * FROM ${tableName} LIMIT ${parseInt(pageSize)} OFFSET ${parseInt(offset)}`
        );
        
        // Get total count for pagination
        const [countResult] = await dbClient.query(
            `SELECT COUNT(*) as total FROM ${tableName}`
        );
        const total = countResult[0].total;
        
        return new Response(200, `Data fra ${tableName} hentet`, {
            data: data,
            pagination: {
                total,
                page: page,
                pageSize: pageSize,
                pages: Math.ceil(total / pageSize)
            }
        }).send(res);
    } catch (error) {
        console.error('Error in getTableData:', error);
        return new Response(500, 'Feil ved henting av tabelldata', error.message).sendError(next);
    }
}

async function getTableColumns(req, res, next) {
    try {
        const { tableName } = req.params;
        
        // Validate tableName
        const validTableRegex = /^[a-zA-Z0-9_]+$/;
        if (!validTableRegex.test(tableName)) {
            return new Response(400, 'Ugyldig tabellnavn', null).send(res);
        }
        
        const columns = await dbClient.getQueryInterface().describeTable(tableName);
        return new Response(200, `Kolonner fra ${tableName} hentet`, columns).send(res);
    } catch (error) {
        console.error('Error in getTableColumns:', error);
        return new Response(500, 'Feil ved henting av kolonner', error.message).sendError(next);
    }
}

async function getTableIndexes(req, res, next) {
    try {
        const { tableName } = req.params;
        
        // Validate tableName
        const validTableRegex = /^[a-zA-Z0-9_]+$/;
        if (!validTableRegex.test(tableName)) {
            return new Response(400, 'Ugyldig tabellnavn', null).send(res);
        }
        
        // Query to get indexes using direct string since tableName is validated
        const query = `SHOW INDEX FROM ${tableName}`;
        const [result] = await dbClient.query(query);
        
        // Format to match the expected format in frontend
        const indexes = [];
        const indexMap = new Map();
        
        result.forEach(idx => {
            const name = idx.Key_name;
            if (!indexMap.has(name)) {
                indexMap.set(name, {
                    name,
                    columns: [],
                    unique: idx.Non_unique === 0,
                    type: idx.Index_type
                });
            }
            
            indexMap.get(name).columns.push(idx.Column_name);
        });
        
        return new Response(200, `Indekser fra ${tableName} hentet`, Array.from(indexMap.values())).send(res);
    } catch (error) {
        console.error('Error in getTableIndexes:', error);
        return new Response(500, 'Feil ved henting av indekser', error.message).sendError(next);
    }
}

async function editTableData(req, res, next) {
    let transaction;
    
    try {
        transaction = await dbClient.transaction();
        const { tableName } = req.params;
        const { data } = req.body;
        
        // Validate tableName
        const validTableRegex = /^[a-zA-Z0-9_]+$/;
        if (!validTableRegex.test(tableName)) {
            return new Response(400, 'Ugyldig tabellnavn', null).send(res);
        }
        
        if (!Array.isArray(data)) {
            return new Response(400, 'Data må være en array', null).send(res);
        }
        
        // Get table information including columns
        const tableInfo = await dbClient.getQueryInterface().describeTable(tableName);
        
        // Find the primary key column
        let primaryKey = null;
        for (const [colName, colInfo] of Object.entries(tableInfo)) {
            if (colInfo.primaryKey) {
                primaryKey = colName;
                break;
            }
        }
        
        // Hvis ingen primærnøkkel ble funnet, sett standardverdi til 'id' for
        // retrokompatibilitet med eksisterende kode som forventer primærnøkkel
        if (!primaryKey) {
            primaryKey = 'id';
        }
        
        // Create model attributes based on actual table structure
        const modelAttributes = {};
        for (const [colName, colInfo] of Object.entries(tableInfo)) {
            modelAttributes[colName] = {
                type: colInfo.type,
                primaryKey: colInfo.primaryKey || false,
                autoIncrement: colInfo.autoIncrement || false,
                allowNull: colInfo.allowNull || false
            };
        }
        
        // Define dynamic model for this table
        const Model = dbClient.define(tableName, modelAttributes, { 
            tableName, 
            timestamps: false,
            freezeTableName: true
        });
        
        const results = [];
        
        // Process each item
        for (const item of data) {
            try {
                if (item[primaryKey]) {
                    // UPDATE operation - Prepare data by filtering valid columns
                    const updateData = {};
                    for (const [key, value] of Object.entries(item)) {
                        if (key !== primaryKey && key in tableInfo) {
                            // Konverter datoformat for MySQL
                            if (value instanceof Date || (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value))) {
                                // Konverter til MySQL datetime format (YYYY-MM-DD HH:MM:SS)
                                const date = new Date(value);
                                if (!isNaN(date.getTime())) {
                                    updateData[key] = date.toISOString().slice(0, 19).replace('T', ' ');
                                } else {
                                    updateData[key] = value;
                                }
                            } else {
                                updateData[key] = value;
                            }
                        }
                    }
                    
                    if (Object.keys(updateData).length === 0) {
                        results.push({
                            id: item[primaryKey],
                            action: 'update',
                            success: true,
                            message: 'Ingen endringer å utføre'
                        });
                        continue;
                    }
                    
                    // Use Sequelize's queryInterface for direct bulk update
                    console.log(`Updating ${tableName} where ${primaryKey}=${item[primaryKey]} with:`, updateData);
                    
                    // Bruk bulkUpdate for å unngå problemer med parameterisering
                    const affected = await dbClient.getQueryInterface().bulkUpdate(
                        tableName,
                        updateData,
                        { [primaryKey]: item[primaryKey] },
                        { transaction }
                    );
                    
                    results.push({
                        id: item[primaryKey],
                        action: 'update',
                        success: affected > 0
                    });
                } else {
                    // INSERT operation - Prepare data by filtering valid columns
                    const insertData = {};
                    for (const [key, value] of Object.entries(item)) {
                        if (key in tableInfo) {
                            // Konverter datoformat for MySQL
                            if (value instanceof Date || (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value))) {
                                // Konverter til MySQL datetime format (YYYY-MM-DD HH:MM:SS)
                                const date = new Date(value);
                                if (!isNaN(date.getTime())) {
                                    insertData[key] = date.toISOString().slice(0, 19).replace('T', ' ');
                                } else {
                                    insertData[key] = value;
                                }
                            } else {
                                insertData[key] = value;
                            }
                        }
                    }
                    
                    if (Object.keys(insertData).length === 0) {
                        results.push({
                            action: 'insert',
                            success: false,
                            error: 'Ingen gyldige felter å sette inn'
                        });
                        continue;
                    }
                    
                    console.log(`Inserting into ${tableName}:`, insertData);

                    // Bygg en SQL INSERT-spørring med direkte verdier (unngå parameterisering)
                    const columns = Object.keys(insertData);
                    const valuesSql = [];
                    
                    for (const value of Object.values(insertData)) {
                        if (value === null) {
                            valuesSql.push('NULL');
                        } else if (typeof value === 'boolean') {
                            valuesSql.push(value ? '1' : '0');
                        } else if (typeof value === 'number') {
                            valuesSql.push(value.toString());
                        } else if (typeof value === 'string') {
                            // Escape strenger manuelt for MySQL
                            valuesSql.push(`'${value.replace(/'/g, "''")}'`);
                        } else if (value instanceof Date) {
                            valuesSql.push(`'${value.toISOString().slice(0, 19).replace('T', ' ')}'`);
                        } else {
                            valuesSql.push(`'${JSON.stringify(value).replace(/'/g, "''")}'`);
                        }
                    }
                    
                    const query = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${valuesSql.join(', ')})`;
                    console.log('Insert query:', query);
                    
                    // Kjør spørringen uten parametre
                    const [result] = await dbClient.query(query);
                    
                    // Use insertId if available, otherwise null
                    const insertId = result.insertId || null;
                    results.push({
                        id: insertId,
                        action: 'insert',
                        success: true
                    });
                }
            } catch (itemError) {
                console.error(`Error processing item for ${tableName}:`, itemError);
                results.push({
                    id: item[primaryKey],
                    action: item[primaryKey] ? 'update' : 'insert',
                    success: false,
                    error: itemError.message
                });
            }
        }
        
        // Commit transaction
        await transaction.commit();
        
        return new Response(200, `Data i ${tableName} oppdatert`, results).send(res);
    } catch (error) {
        // Rollback on error
        if (transaction) await transaction.rollback();
        console.error('Error in editTableData:', error);
        return new Response(500, 'Feil ved oppdatering av tabelldata', error.message).sendError(next);
    }
}

// Forbedre deleteTableData-funksjonen

async function deleteTableData(req, res, next) {
    try {
        const { tableName } = req.params;
        const { id, pkColumn = 'id' } = req.body;
        
        console.log('Delete request body:', req.body);
        console.log('Delete request for table:', tableName);
        
        // Validate tableName and pkColumn
        const validTableRegex = /^[a-zA-Z0-9_]+$/;
        if (!validTableRegex.test(tableName)) {
            return new Response(400, 'Ugyldig tabellnavn', null).send(res);
        }
        
        if (!validTableRegex.test(pkColumn)) {
            return new Response(400, 'Ugyldig primærnøkkelkolonne', null).send(res);
        }
        
        if (id === undefined || id === null) {
            return new Response(400, 'ID må angis for å slette rad', null).send(res);
        }
        
        // Bruk direkte strenger for å unngå problemer med parameterisering
        let sqlQuery;
        const idType = typeof id;
        
        if (idType === 'string') {
            sqlQuery = `DELETE FROM ${tableName} WHERE ${pkColumn} = '${id.replace(/'/g, "''")}'`;
        } else if (idType === 'number' || idType === 'boolean') {
            sqlQuery = `DELETE FROM ${tableName} WHERE ${pkColumn} = ${id}`;
        } else {
            return new Response(400, 'Ugyldig ID-type', null).send(res);
        }
        
        console.log('Delete SQL query:', sqlQuery);
        
        const [result] = await dbClient.query(sqlQuery);
        
        if (result.affectedRows === 0) {
            return new Response(404, 'Ingen rader funnet med gitt ID', null).send(res);
        }
        
        return new Response(200, `Rad i ${tableName} slettet`, { affectedRows: result.affectedRows }).send(res);
    } catch (error) {
        console.error('Error in deleteTableData:', error);
        return new Response(500, 'Feil ved sletting av tabelldata', error.message).sendError(next);
    }
}

async function createTable(req, res, next) {
    try {
        const { tableName, columns } = req.body;
        
        // Validate tableName
        const validTableRegex = /^[a-zA-Z0-9_]+$/;
        if (!validTableRegex.test(tableName)) {
            return new Response(400, 'Ugyldig tabellnavn', null).send(res);
        }
        
        if (!Array.isArray(columns) || columns.length === 0) {
            return new Response(400, 'Kolonner må angis for å opprette tabell', null).send(res);
        }
        
        // Format columns to the format expected by Sequelize
        const columnDefinitions = {};
        
        columns.forEach(column => {
            columnDefinitions[column.name] = {
                type: column.type,
                allowNull: !column.notNull,
                primaryKey: column.primaryKey || false,
                autoIncrement: column.autoIncrement || false
            };
        });
        
        await dbClient.getQueryInterface().createTable(tableName, columnDefinitions);
        
        return new Response(201, `Tabell ${tableName} opprettet`, null).send(res);
    } catch (error) {
        console.error('Error in createTable:', error);
        return new Response(500, 'Feil ved oppretting av tabell', error.message).sendError(next);
    }
}

async function deleteTable(req, res, next) {
    try {
        const { tableName } = req.params;
        
        // Validate tableName
        const validTableRegex = /^[a-zA-Z0-9_]+$/;
        if (!validTableRegex.test(tableName)) {
            return new Response(400, 'Ugyldig tabellnavn', null).send(res);
        }
        
        await dbClient.getQueryInterface().dropTable(tableName);
        
        return new Response(200, `Tabell ${tableName} slettet`, null).send(res);
    } catch (error) {
        console.error('Error in deleteTable:', error);
        return new Response(500, 'Feil ved sletting av tabell', error.message).sendError(next);
    }
}

async function addColumn(req, res, next) {
    try {
        const { tableName } = req.params;
        const { name, type, notNull, primaryKey, autoIncrement, defaultValue } = req.body;
        
        // Validate tableName and column name
        const validNameRegex = /^[a-zA-Z0-9_]+$/;
        if (!validNameRegex.test(tableName) || !validNameRegex.test(name)) {
            return new Response(400, 'Ugyldig tabellnavn eller kolonnenavn', null).send(res);
        }
        
        const columnDefinition = {
            type,
            allowNull: !notNull,
            primaryKey: primaryKey || false,
            autoIncrement: autoIncrement || false
        };
        
        if (defaultValue !== undefined && defaultValue !== '') {
            columnDefinition.defaultValue = defaultValue;
        }
        
        await dbClient.getQueryInterface().addColumn(tableName, name, columnDefinition);
        
        return new Response(200, `Kolonne ${name} lagt til i ${tableName}`, null).send(res);
    } catch (error) {
        console.error('Error in addColumn:', error);
        return new Response(500, 'Feil ved tillegg av kolonne', error.message).sendError(next);
    }
}

async function deleteColumn(req, res, next) {
    try {
        const { tableName, columnName } = req.params;
        
        // Validate tableName and column name
        const validNameRegex = /^[a-zA-Z0-9_]+$/;
        if (!validNameRegex.test(tableName) || !validNameRegex.test(columnName)) {
            return new Response(400, 'Ugyldig tabellnavn eller kolonnenavn', null).send(res);
        }
        
        await dbClient.getQueryInterface().removeColumn(tableName, columnName);
        
        return new Response(200, `Kolonne ${columnName} slettet fra ${tableName}`, null).send(res);
    } catch (error) {
        console.error('Error in deleteColumn:', error);
        return new Response(500, 'Feil ved sletting av kolonne', error.message).sendError(next);
    }
}

async function addIndex(req, res, next) {
    try {
        const { tableName } = req.params;
        const { name, columns, unique, type } = req.body;
        
        // Validate tableName and index name
        const validNameRegex = /^[a-zA-Z0-9_]+$/;
        if (!validNameRegex.test(tableName) || !validNameRegex.test(name)) {
            return new Response(400, 'Ugyldig tabellnavn eller indeksnavn', null).send(res);
        }
        
        if (!Array.isArray(columns) || columns.length === 0) {
            return new Response(400, 'Kolonner må angis for å opprette indeks', null).send(res);
        }
        
        const indexOptions = {
            name,
            fields: columns,
            unique: unique || false,
            type: type || 'BTREE'
        };
        
        await dbClient.getQueryInterface().addIndex(tableName, indexOptions);
        
        return new Response(200, `Indeks ${name} lagt til i ${tableName}`, null).send(res);
    } catch (error) {
        console.error('Error in addIndex:', error);
        return new Response(500, 'Feil ved tillegg av indeks', error.message).sendError(next);
    }
}

async function deleteIndex(req, res, next) {
    try {
        const { tableName, indexName } = req.params;
        
        // Validate tableName and index name
        const validNameRegex = /^[a-zA-Z0-9_]+$/;
        if (!validNameRegex.test(tableName) || !validNameRegex.test(indexName)) {
            return new Response(400, 'Ugyldig tabellnavn eller indeksnavn', null).send(res);
        }
        
        await dbClient.getQueryInterface().removeIndex(tableName, indexName);
        
        return new Response(200, `Indeks ${indexName} slettet fra ${tableName}`, null).send(res);
    } catch (error) {
        console.error('Error in deleteIndex:', error);
        return new Response(500, 'Feil ved sletting av indeks', error.message).sendError(next);
    }
}

export {
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
};