import { DataTypes } from 'sequelize';
import { dbClient } from '../config/dbConfig.js';

const SampleType = dbClient.define('SampleType', {
  id:   { type: DataTypes.INTEGER, primaryKey: true },
  name: { type: DataTypes.STRING(50), allowNull: false },
}, {
  tableName: 'sample_type',
  timestamps: false,
});

export default SampleType;
