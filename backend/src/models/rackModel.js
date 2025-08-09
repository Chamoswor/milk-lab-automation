import { DataTypes } from 'sequelize';
import { dbClient } from '../config/dbConfig.js';
import SampleType from './sampleTypeModel.js';

const Rack = dbClient.define('Rack', {
  id:          { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  rfid:        { type: DataTypes.CHAR(24), allowNull: false, unique: true },
  sample_type: { type: DataTypes.INTEGER, allowNull: false },
}, {
  tableName: 'rack',
  createdAt: 'created_at',
  updatedAt: false,
});

Rack.belongsTo(SampleType, {
  foreignKey: 'sample_type',
  as: 'type',
});

export default Rack;
