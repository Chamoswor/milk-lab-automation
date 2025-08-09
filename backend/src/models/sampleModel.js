import { DataTypes } from 'sequelize';
import { dbClient } from '../config/dbConfig.js';
import SampleType from './sampleTypeModel.js';

const Sample = dbClient.define('Sample', {
  id:                { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  supplier:          { type: DataTypes.STRING(255), allowNull: false },
  sample_taken_time: { type: DataTypes.DATE(6),     allowNull: false },
  matrix:            { type: DataTypes.STRING(255), allowNull: false },
  sample_type:       { type: DataTypes.INTEGER,     allowNull: false },
  batch_id:          { type: DataTypes.STRING(255),  allowNull: true },
  storage_temp:      { type: DataTypes.FLOAT, allowNull: true },
  comment:           { type: DataTypes.STRING(255), allowNull: true },
}, {
  tableName: 'sample',
  createdAt: 'created_at',
  updatedAt: false,
});

// FK - relasjon
Sample.belongsTo(SampleType, {
  foreignKey: 'sample_type',
  as: 'type',
});


export default Sample;