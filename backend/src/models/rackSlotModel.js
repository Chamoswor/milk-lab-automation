import { DataTypes } from 'sequelize';
import { dbClient } from '../config/dbConfig.js';
import Rack from './rackModel.js';
import Sample from './sampleModel.js';

const RackSlot = dbClient.define('RackSlot', {
  id:        { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  rack_id:   { type: DataTypes.INTEGER, allowNull: false },
  position:  { type: DataTypes.TINYINT, allowNull: false },   // 1–10
  sample_id: { type: DataTypes.INTEGER, allowNull: true },    // kan være NULL inntil sample er satt inn
}, {
  tableName: 'rack_slot',
  createdAt: 'placed_at',
  updatedAt: false,
});


RackSlot.belongsTo(Sample, { as: 'sample', foreignKey: 'sample_id' });
RackSlot.belongsTo(Rack,   { as: 'Rack',   foreignKey: 'rack_id' });  // alias må samsvare

// motsatt vei, om du vil:
Rack.hasMany(RackSlot, { as: 'slots', foreignKey: 'rack_id' });
Sample.hasOne(RackSlot, { as: 'slot', foreignKey: 'sample_id' });

export default RackSlot;