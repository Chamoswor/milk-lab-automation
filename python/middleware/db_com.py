"""
db_com.py
• Kommunikasjon med MySQL-database via mysql-connector-python.
• Støtter CRUD-operasjoner for ulike tabeller.
• Bruker miljøvariabler for database-tilkobling.
• Feilhåndtering for databaseoperasjoner.
• Eksempel på bruk:
    db = DBSample()
    db.insert_sample({"supplier": "Leverandør A", "matrix": "1001"})
    samples = db.get_samples()
    print(f"Samples: {samples}")
"""

import os
import mysql.connector
from mysql.connector.cursor import MySQLCursorDict
from typing import Any, Dict, List, Optional, cast

DEBUG_MATRIX_CODES = [
    "1001, 1002, 1003, 1004, 1005, 1006, 1007, 1008, 1009, 1010",
    "2001, 2002, 2003, 2004, 2005, 2006, 2007, 2008, 2009, 2010",
]

DEBUG_LEVRANDOR_CODES = [
    "Leverandør A", "Leverandør B", "Leverandør C", "Leverandør D", "Leverandør E",
]

DEBUG_RFID_CODES = [
    "RFID-1001", "RFID-1002", "RFID-1003", "RFID-1004", "RFID-1005",
]

# --------------------------------------------------
# Miljø-variabler
# --------------------------------------------------
DB_HOST  = os.getenv("DB_HOST",  "mysql")        
DB_USER  = os.getenv("DB_USER",  "user")
DB_PASS  = os.getenv("DB_PASSWORD", "")
DB_NAME  = os.getenv("DB_NAME",  "mydb")
POLL_MS  = int(os.getenv("POLL_MS", "200"))

# --------------------------------------------------
# Tabellnavn
# --------------------------------------------------
TABLE_SAMPLE_TYPE = "sample_type"
TABLE_SAMPLE      = "sample"
TABLE_RACK        = "rack"
TABLE_RACK_SLOT   = "rack_slot"

# --------------------------------------------------
# DDL-maler
# --------------------------------------------------
TEMPLATE_SAMPLE_TYPE = {
    "name": TABLE_SAMPLE_TYPE,
    "columns": {
        "id":   "INT PRIMARY KEY",            # 1 = gul, 2 = grønn, 3 = GG(begge)
        "name": "VARCHAR(50) NOT NULL"
    }
}

TEMPLATE_SAMPLE = {
    "name": TABLE_SAMPLE,
    "columns": {
        "id":                 "INT AUTO_INCREMENT PRIMARY KEY",
        "supplier":           "VARCHAR(255) NOT NULL",
        "sample_taken_time":  "DATETIME(6) NOT NULL",
        "matrix":             "VARCHAR(255) NOT NULL",
        "sample_type":        "INT NOT NULL",
        "batch_id":           "VARCHAR(255) DEFAULT NULL",
        "storage_temp":       "FLOAT DEFAULT NULL",
        "comment":            "VARCHAR(255) DEFAULT NULL",
        "created_at":         "DATETIME DEFAULT CURRENT_TIMESTAMP",
    }
}

TEMPLATE_RACK = {
    "name": TABLE_RACK,
    "columns": {
        "id":          "INT AUTO_INCREMENT PRIMARY KEY",
        "rfid":        "CHAR(24) NOT NULL UNIQUE",
        "sample_type": "INT NOT NULL",  # hvilken test-type skinnen er satt opp for
        "created_at":  "DATETIME DEFAULT CURRENT_TIMESTAMP"
    }
}

TEMPLATE_RACK_SLOT = {
    "name": TABLE_RACK_SLOT,
    "columns": {
        "id":        "INT AUTO_INCREMENT PRIMARY KEY",
        "rack_id":   "INT NOT NULL", # ID til skinne (fremmednøkkel)
        "position":  "TINYINT NOT NULL",      # 1–10
        "sample_id": "INT NOT NULL", # ID til sample (fremmednøkkel)
        "placed_at": "DATETIME DEFAULT CURRENT_TIMESTAMP",
    }
}

# --------------------------------------------------
# Sample-type-konstanter (match tabellen)
# --------------------------------------------------
SAMPLE_TYPE_YELLOW = 1
SAMPLE_TYPE_GREEN  = 2
SAMPLE_TYPE_GG     = 3

# --------------------------------------------------
# DB-klasse
# --------------------------------------------------
class DBSample:
    def __init__(self) -> None:
        self.conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASS,
            database=DB_NAME,
        )
        raw_cursor = self.conn.cursor(dictionary=True) # type: ignore
        self.cursor: MySQLCursorDict = cast(MySQLCursorDict, raw_cursor)
        self._create_schema()
        self.clear_sorting_data()

    # ---------- Generelt ----------
    def close(self) -> None:
        self.conn.close()

    # ---------- Skjemabygging ----------
    def _ddl(self, template: Dict[str, Any]) -> str:
        cols = ", ".join(f"{col} {dtype}" for col, dtype in template["columns"].items())
        return f"CREATE TABLE IF NOT EXISTS {template['name']} ({cols})"

    def _create_schema(self) -> None:
        """Opprett alle tabeller + FK/indekser hvis de ikke finnes."""
        # 1) Selve tabellene
        for tmpl in (
            TEMPLATE_SAMPLE_TYPE,
            TEMPLATE_SAMPLE,
            TEMPLATE_RACK,
            TEMPLATE_RACK_SLOT,
        ):
            self.cursor.execute(self._ddl(tmpl))

        # 2) Fremmednøkler og unike begrensninger
        fk_statements = [
            # sample → sample_type
            f"""ALTER TABLE {TABLE_SAMPLE}
                ADD CONSTRAINT fk_sample_type
                FOREIGN KEY (sample_type) REFERENCES {TABLE_SAMPLE_TYPE}(id)""",

            # rack → sample_type
            f"""ALTER TABLE {TABLE_RACK}
                ADD CONSTRAINT fk_rack_type
                FOREIGN KEY (sample_type) REFERENCES {TABLE_SAMPLE_TYPE}(id)""",

            # rack_slot → rack
            f"""ALTER TABLE {TABLE_RACK_SLOT}
                ADD CONSTRAINT fk_rs_rack
                FOREIGN KEY (rack_id) REFERENCES {TABLE_RACK}(id)
                ON DELETE CASCADE""",

            # rack_slot → sample
            f"""ALTER TABLE {TABLE_RACK_SLOT}
                ADD CONSTRAINT fk_rs_sample
                FOREIGN KEY (sample_id) REFERENCES {TABLE_SAMPLE}(id)
                ON DELETE CASCADE""",

            # unike begrensninger
            f"""ALTER TABLE {TABLE_RACK_SLOT}
                ADD CONSTRAINT uq_rack_pos
                UNIQUE (rack_id, position)""",
            f"""ALTER TABLE {TABLE_RACK_SLOT}
                ADD CONSTRAINT uq_sample_once
                UNIQUE (sample_id)""",
        ]

        for stmt in fk_statements:
            try:
                self.cursor.execute(stmt)
            except mysql.connector.errors.DatabaseError as err:
                # Error code 1826: Duplicate foreign key constraint name
                # Error code 1061: Duplicate key name (for unique constraints)
                if err.errno == 1826 or err.errno == 1061:
                    print(f"Constraint in statement already exists, skipping: {stmt[:50]}...") # Log or pass
                else:
                    raise # Re-raise other database errors
        self.conn.commit()

    # ---------- Hjelpe-metoder ----------
    def _fetchdict(self, query: str, params: tuple = ()) -> Optional[Dict[str, Any]]:
        self.cursor.execute(query, params)
        res = self.cursor.fetchone()
        return cast(Optional[Dict[str, Any]], res)

    # ---------- API-metoder ----------
    # 1) Finn sample_type til en gitt matrix-kode
    def get_sample_type_by_matrix(self, matrix: str) -> int:
        _matrix = matrix.strip()
        row = self._fetchdict(
            f"SELECT sample_type FROM {TABLE_SAMPLE} WHERE matrix = %s LIMIT 1",
            (_matrix,),
        )
        type = int(row["sample_type"]) if row else -1
        return type

    # 2) Legg et beger i første ledige posisjon i en skinne
    def place_sample_in_rack(
            self,
            rack_rfid: str,
            matrix: str,
    ) -> int:

        # 1) Finn rack_id
        rack = self._fetchdict(
            f"SELECT id FROM {TABLE_RACK} WHERE rfid = %s",
            (rack_rfid,),
        )
        if not rack:
            raise ValueError(f"Ukjent rack-RFID: {rack_rfid}")
        rack_id: int = rack["id"]

        # 2) Finn sample_id fra matrise­kode
        sample = self._fetchdict(
            f"SELECT id FROM {TABLE_SAMPLE} WHERE matrix = %s LIMIT 1",
            (matrix,),
        )
        if not sample:
            raise ValueError(f"Fant ingen prøve med matrisekode {matrix!r}")
        sample_id: int = sample["id"]

        # 3) Finn hvilke posisjoner som allerede er opptatt
        self.cursor.execute(
            f"SELECT position FROM {TABLE_RACK_SLOT} WHERE rack_id = %s",
            (rack_id,),
        )
        occupied = {int(r["position"]) for r in self.cursor.fetchall()} # type: ignore

        # 4) Første ledige posisjon – her forutsetter vi maks 10
        for pos in range(1, 11):
            if pos not in occupied:
                break
        else:
            raise ValueError(f"Rack {rack_rfid} er fullt")

        # 5) Sett inn posten
        self.cursor.execute(
            f"""INSERT INTO {TABLE_RACK_SLOT} (rack_id, position, sample_id)
                VALUES (%s, %s, %s)""",
            (rack_id, pos, sample_id),
        )
        self.conn.commit()
        return pos
    


    # 3) Hent alt innhold i en skinne via RFID
    def get_rack_contents(self, rack_rfid: str) -> List[Dict[str, Any]]:
        self.cursor.execute(
            f"""
            SELECT
                rs.position,
                s.id   AS sample_id,
                s.matrix,
                st.name AS sample_test_type,
                s.sample_taken_time
            FROM {TABLE_RACK}   r
            LEFT JOIN {TABLE_RACK_SLOT} rs ON r.id = rs.rack_id
            LEFT JOIN {TABLE_SAMPLE}     s ON rs.sample_id = s.id
            LEFT JOIN {TABLE_SAMPLE_TYPE} st ON s.sample_type = st.id
            WHERE r.rfid = %s
            ORDER BY rs.position
            """,
            (rack_rfid,),
        )
        return cast(List[Dict[str, Any]], self.cursor.fetchall())
    
    def get_rfid_by_sample_type(self, sample_type: int) -> Optional[str]:
        """Henter RFID for en gitt sample_type."""
        self.cursor.execute(
            f"SELECT rfid FROM {TABLE_RACK} WHERE sample_type = %s LIMIT 1",
            (sample_type,),
        )
        row = self.cursor.fetchone()
        return cast(Dict[str, Any], row)["rfid"] if row else None
    
    def clear_sorting_data(self) -> None:
        try:
            self.cursor.execute(f"DELETE FROM {TABLE_RACK_SLOT}")
            self.conn.commit()
        except mysql.connector.errors.ProgrammingError as err:
            if err.errno == 1146:
                pass
            else:
                raise

    def create_debug_data(self) -> None:
        # --- slett eksisterende data ---
        for tbl in (TABLE_RACK_SLOT, TABLE_SAMPLE, TABLE_RACK, TABLE_SAMPLE_TYPE):
            self.cursor.execute(f"DELETE FROM {tbl}")
        self.conn.commit()

        # --- opprett sample_type ---
        sample_types = [
            (SAMPLE_TYPE_YELLOW, "Gul"),
            (SAMPLE_TYPE_GREEN,  "Grønn"),
            (SAMPLE_TYPE_GG,     "GG"),
        ]
        self.cursor.executemany(
            f"INSERT INTO {TABLE_SAMPLE_TYPE} (id, name) VALUES (%s, %s)",
            sample_types,
        )

        # --- leverandør → sample_type-mapping ---
        SUPPLIER_TYPE = {
            "Leverandør A": SAMPLE_TYPE_YELLOW,
            "Leverandør B": SAMPLE_TYPE_GREEN,
            "Leverandør C": SAMPLE_TYPE_GG,
        }

        # --- opprett samples ---
        samples = []
        sample_id = 1
        for matrix_list, supplier in zip(DEBUG_MATRIX_CODES, DEBUG_LEVRANDOR_CODES):
            sample_type = SUPPLIER_TYPE[supplier]

            # splitte «1001, 1002, …» til enkeltkoder
            for code in (c.strip() for c in matrix_list.split(',')):
                samples.append(
                    (sample_id, supplier, "2023-10-01 12:00:00", code, sample_type)
                )
                sample_id += 1

        self.cursor.executemany(
            f"""INSERT INTO {TABLE_SAMPLE}
                (id, supplier, sample_taken_time, matrix, sample_type)
                VALUES (%s, %s, %s, %s, %s)""",
            samples,
        )

        # --- opprett racks (én per type) ---
        racks = [
            (DEBUG_RFID_CODES[0], SAMPLE_TYPE_YELLOW),
            (DEBUG_RFID_CODES[1], SAMPLE_TYPE_GREEN),
            (DEBUG_RFID_CODES[2], SAMPLE_TYPE_GG),
        ]
        self.cursor.executemany(
            f"INSERT INTO {TABLE_RACK} (rfid, sample_type) VALUES (%s, %s)",
            racks,
        )

        self.conn.commit()