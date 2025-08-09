import { DataTypes } from 'sequelize';
import { dbClient } from '../config/dbConfig.js';

const INDMelding = dbClient.define(
  'industri_melding',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },

    // tidsstempel DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    tidsstempel: {
      type: DataTypes.DATE(3),
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'tidsstempel',
    },

    // node_id VARCHAR(255) NOT NULL
    nodeId: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'node_id',
    },

    // retning ENUM('REQUEST','COMMAND','PROCESS','RESPONSE') NOT NULL
    retning: {
      type: DataTypes.ENUM('REQUEST', 'COMMAND', 'PROCESS', 'RESPONSE'),
      allowNull: false,
    },

    // payload JSON NOT NULL
    payload: {
      type: DataTypes.JSON,
      allowNull: false,
    },

    // status_code INT NULL
    statusCode: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'status_code',
    },

    // behandlet BOOLEAN NOT NULL DEFAULT FALSE
    behandlet: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

    // behandlet_tid DATETIME(3) NULL
    behandletTid: {
      type: DataTypes.DATE(3),
      allowNull: true,
      field: 'behandlet_tid',
    },

    // retry_count TINYINT NOT NULL DEFAULT 0
    retryCount: {
      type: DataTypes.TINYINT.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
      field: 'retry_count',
    },

    // prioritet TINYINT NOT NULL DEFAULT 5
    prioritet: {
      type: DataTypes.TINYINT.UNSIGNED,
      allowNull: false,
      defaultValue: 5,
    },
  },
  {
    tableName: 'industri_melding',
    timestamps: false,          // vi bruker våre egne tidsfelt
    underscored: false,         // holder JS-attributtnavn som camelCase
    indexes: [
      // INDEX idx_behandlet (behandlet, prioritet)
      {
        name: 'idx_behandlet_prioritet',
        fields: ['behandlet', 'prioritet'],
      },
      // INDEX idx_node_time (node_id, tidsstempel)
      {
        name: 'idx_node_time',
        fields: ['node_id', 'tidsstempel'],
      },
    ],
  }
);

export default INDMelding;
