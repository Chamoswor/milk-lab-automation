"""
s7_com.py
• Kommunikasjon med Siemens S7 PLC via Snap7-biblioteket.
• Lesing og skriving av variabler i PLC-en.
• Støtter ulike datatyper som REAL, INT, DINT, BOOL og STRING
• Bruker miljøvariabler for PLC IP-adresse, rack og slot.
• Feilhåndtering for ugyldige node_id-er.
• Eksempel på bruk:
    plc = PLC()
    plc.write_node("DB1,REAL0.0", 3.14)
    value = plc.read_node("DB1,REAL0.0")
    print(f"Read value: {value}")
"""

import os, json, time, re, snap7
import mysql.connector as mysql
from snap7.util import get_real, set_real
import snap7.util

PLC_IP   = os.getenv("PLC_IP",   "192.168.3.55")
RACK = 0
SLOT = 1

PAT  = re.compile(r"DB(\d+),(REAL|INT|DINT|BOOL|STRING)(\d+).(\d+)$")
SIZE = {"REAL":4, "DINT":4, "INT":2, "BOOL":1, "STRING":66}
class PLC(snap7.client.Client):
    def __init__(self, plc_ip=PLC_IP, rack=RACK, slot=SLOT):
        super().__init__()
        #self.connect(plc_ip, rack, slot)
        self.connect(plc_ip, rack, slot)



    def parse_node_id(self, s):
        m = PAT.fullmatch(s)
        if not m:
            raise ValueError(f"Invalid node_id: {s}")

        return int(m.group(1)), m.group(2), int(m.group(3)), int(m.group(4))


    def _read_or_write(self, client, db, typ, ofs, payload, rw):
        size = SIZE[typ]
        if rw == "read":
            data = self.read_area(snap7.type.Areas.DB, db, ofs, size)
            match typ:
                case "REAL":  return get_real(data, 0)
                case "INT":   return int.from_bytes(data, "big", signed=True)
                case "DINT":  return int.from_bytes(data, "big", signed=True)
                case "BOOL":  return data[0] & 1
                case "STRING":
                    return data[2:2+data[1]].decode("ascii")
        else:  # write
            buf = bytearray(size)
            match typ:
                case "REAL":  set_real(buf, 0, float(payload))
                case "INT":   buf[:] = int(payload).to_bytes(2, "big", signed=True)
                case "DINT":  buf[:] = int(payload).to_bytes(4, "big", signed=True)
                case "BOOL":  buf[0] = 1 if payload else 0
                case "STRING":
                    s = str(payload).encode("ascii")[:64]
                    buf[0], buf[1] = 64, len(s)
                    buf[2:2+len(s)] = s
            self.write_area(snap7.type.Areas.DB, db, ofs, buf)

    def _write_bool_bit(self, client, db, byte_idx, bit_idx, value: bool):
        data = self.read_area(snap7.type.Areas.DB, db, byte_idx, 1)
        snap7.util.set_bool(data, 0, bit_idx, value)
        self.write_area(snap7.type.Areas.DB, db, byte_idx, data)

    def _read_bool_bit(self, client, db, byte_idx, bit_idx):
        data = self.read_area(snap7.type.Areas.DB, db, byte_idx, 1)
        return snap7.util.get_bool(data, 0, bit_idx)

    def read_node(self, node):
        db, typ, ofs, bit = self.parse_node_id(node)
        if typ == "BOOL":
            return self._read_bool_bit(snap7.type.Areas.DB, db, ofs, bit)
        else:
            return self._read_or_write(snap7.type.Areas.DB, db, typ, ofs, None, "read")
        
    def write_node(self, node, payload):
        db, typ, ofs, bit = self.parse_node_id(node)
        if typ == "BOOL":
            self._write_bool_bit(snap7.type.Areas.DB, db, ofs, bit, payload)
        else:
            self._read_or_write(snap7.type.Areas.DB, db, typ, ofs, payload, "write")