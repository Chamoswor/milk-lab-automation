"""
Shared Data Store Module
Denne modulen håndterer delt tilstandsinformasjon mellom ulike komponenter i systemet.
Den bruker trådsikre metoder for å få tilgang til og oppdatere delt data.
Hovedfunksjoner:
- Håndtering av PLC, UR-robot og database status og jobber.
- Håndtering av sorteringsdata for UR-roboten.
- Håndtering av UR-logg.
- Håndtering av forespørsler til databasen for QR-data og skinneinnhold.
- Debug-funksjonalitet for testing av matriser og RFID-koder.
- Trådsikre metoder for tilgang til delt data.
"""


import threading
from typing import List, Dict, Any, Optional, cast
from middleware.db_com import DBSample

DEBUG_MATRIX_CODES = [
    "1001", "1002", "1003", "1004", "1005", "1006", "1007", "1008", "1009", "1010",
    "2001", "2002", "2003", "2004", "2005", "2006", "2007", "2008", "2009", "2010"
]

DEBUG_RFID_CODES = [
    "RFID-1001", "RFID-1002", "RFID-1003"
]

IDLE = 0000
RUNNING = 1000
ERROR = 2000

REQ_PLC_START_CONVEYOR = 2101 # Start en transportør i PLC-en
REQ_PLC_STOP_CONVEYOR = 2102 # Stopp en transportør i PLC-en

REQ_DB_GET_QR_DATA = 2201 # Hent QR-data fra databasen
REQ_DB_UPDATE_QR_DATA = 2202 # Oppdater QR-data i databasen

REQ_UR_START_SORTING = 2301 # Start sortering i UR-roboten
REQ_UR_STOP_SORTING = 2302 # Stopp sortering i UR-roboten


if __name__ == "__main__":
    IDLE = 0000
    RUNNING = 1000
    ERROR = 2000
    
    REQ_PLC_START_CONVEYOR = 2101
    REQ_PLC_STOP_CONVEYOR = 2102
    REQ_PLC_OPEN_CYLINDER = 2103

    REQ_DB_GET_QR_DATA = 2201
    REQ_DB_UPDATE_QR_DATA = 2202

    REQ_UR_START_SORTING = 2301
    REQ_UR_STOP_SORTING = 2302



class Data:
    """
    En enkel databeholder for delt tilstandsinformasjon.
    Denne klassen inneholder selve dataene. DataStore vil håndtere trådsikker tilgang.
    """
    def __init__(self):
        self.PLC_STATUS = IDLE
        self.PLC_JOB = 0

        self.UR_STATUS = IDLE
        self.UR_JOB = 0
        self.UR_log = []

        self.DB_STATUS = IDLE
        self.DB_JOB = 0
        
        self.DB_DATA_FROM_TABLE = []

        self.DB_REQUEST_QR_DATA = {

        }

        self.UR_SORTING_RAMP =  [0] * 10
        self.UR_SORTING_GUL =   [0] * 10
        self.UR_SORTING_GRONN = [0] * 10
        self.UR_SORTING_BEGGE = [0] * 10
        


class DataStore:

    def __init__(self):
        self._data = Data()

        self._lock = threading.Lock()
        self._lock_logs = threading.Lock()
        self._lock_ur_sorting = threading.Lock()
        self._lock_ur = threading.Lock()
        self._lock_plc = threading.Lock()
        self._lock_db = threading.Lock()

        self.db_handler = DBSample()
        #self.db_handler.clear_sorting_data() # Tømmer sorteringsdata i databasen ved oppstart
        #self.db_handler.create_debug_data() # Opprett testdata i databasen for debugging

        self.debug_current_matrix = 0
        self.debug_current_rfid = 0
        self.debug_matrix_codes = DEBUG_MATRIX_CODES
        self.debug_rfid_codes = DEBUG_RFID_CODES

    # --- PLC Metoder ---
    def get_plc_status(self):
        with self._lock_plc:
            return self._data.PLC_STATUS
        
    def get_free_ramp_index(self) -> int:
        with self._lock_db:
            for i, value in enumerate(self._data.UR_SORTING_RAMP):
                if value == 0:
                    return i
            return -1  # Ingen ledig indeks funnet

    def set_plc_status(self, status) -> bool:
        with self._lock_plc:
            self._data.PLC_STATUS = status
        return True

    def get_plc_job(self):
        with self._lock_plc:
            return self._data.PLC_JOB

    def set_plc_job(self, job) -> bool:
        with self._lock_plc:
            self._data.PLC_JOB = job
        return True

    # --- UR Metoder ---
    def get_ur_status(self):
        with self._lock_ur:
            return self._data.UR_STATUS

    def set_ur_status(self, status) -> bool:
        with self._lock_ur:
            self._data.UR_STATUS = status
        return True

    def get_ur_job(self) -> int:
        with self._lock_ur:
            return self._data.UR_JOB

    def set_ur_job(self, job) -> bool:
        with self._lock_ur:
            self._data.UR_JOB = job
        return True

    # --- DB Metoder ---
    def get_db_status(self):
        with self._lock_db:
            return self._data.DB_STATUS

    def set_db_status(self, status) -> bool:
        with self._lock_db:
            self._data.DB_STATUS = status
        return True

    def get_db_job(self):
        with self._lock_db:
            return self._data.DB_JOB

    def set_db_job(self, job) -> bool:
        with self._lock_db:
            self._data.DB_JOB = job
        return True

    def get_db_data_from_table(self):
        with self._lock_db:
            return list(self._data.DB_DATA_FROM_TABLE)

    def set_db_data_from_table(self, data) -> bool:
        with self._lock_db:
            self._data.DB_DATA_FROM_TABLE = data
        return True

    def get_ur_sorting_ramp(self) -> list:
        with self._lock_ur_sorting:
            return list(self._data.UR_SORTING_RAMP) 
    
    def get_ur_sorting_gul(self) -> list:
        with self._lock_ur_sorting:
            return list(self._data.UR_SORTING_GUL)
    
    def get_ur_sorting_gronn(self) -> list:
        with self._lock_ur_sorting:
            return list(self._data.UR_SORTING_GRONN)
    
    def get_ur_sorting_begge(self) -> list:
        with self._lock_ur_sorting:
            return list(self._data.UR_SORTING_BEGGE)
    
    def clear_ur_sorting_ramp(self) -> bool:
        with self._lock_ur_sorting:
            self._data.UR_SORTING_RAMP = [0] * len(self._data.UR_SORTING_RAMP)
        return True

    def set_ur_sorting_ramp_item(self, index: int, value: int) -> bool:
        if 0 <= index < len(self._data.UR_SORTING_RAMP):
            self._data.UR_SORTING_RAMP[index] = value
            return True
        return False

    def set_ur_sorting_ramp_full(self, new_list: list) -> bool:
        if isinstance(new_list, list) and len(new_list) == len(self._data.UR_SORTING_RAMP):
            self._data.UR_SORTING_RAMP = new_list
            return True
        return False
        
    def set_ur_sorting_gul_item(self, index: int, value: int) -> bool:
        if 0 <= index < len(self._data.UR_SORTING_GUL):
            self._data.UR_SORTING_GUL[index] = value
            return True
        return False
    
    def set_ur_sorting_gul_full(self, new_list: list) -> bool:
        with self._lock_ur_sorting:
            if isinstance(new_list, list) and len(new_list) == len(self._data.UR_SORTING_GUL):
                self._data.UR_SORTING_GUL = new_list
                return True
            return False
    
    def set_ur_sorting_gronn_item(self, index: int, value: int) -> bool:
        with self._lock_ur_sorting:
            if 0 <= index < len(self._data.UR_SORTING_GRONN):
                self._data.UR_SORTING_GRONN[index] = value
                return True
            return False
    
    def set_ur_sorting_gronn_full(self, new_list: list) -> bool:
        with self._lock_ur_sorting:
            if isinstance(new_list, list) and len(new_list) == len(self._data.UR_SORTING_GRONN):
                self._data.UR_SORTING_GRONN = new_list
                return True
            return False
    
    def set_ur_sorting_begge_item(self, index: int, value: int) -> bool:
        with self._lock_ur_sorting:
            if 0 <= index < len(self._data.UR_SORTING_BEGGE):
                self._data.UR_SORTING_BEGGE[index] = value
                return True
            return False
    
    def set_ur_sorting_begge_full(self, new_list: list) -> bool:
        with self._lock_ur_sorting:
            if isinstance(new_list, list) and len(new_list) == len(self._data.UR_SORTING_BEGGE):
                self._data.UR_SORTING_BEGGE = new_list
                return True
            return False
    
        
    def clear_plc_job(self) -> bool:
        with self._lock:
            self._data.PLC_JOB = 0
        return True
    
    def clear_ur_job(self) -> bool:
        with self._lock:
            self._data.UR_JOB = 0  # type: ignore
        return True
    
    def clear_db_job(self) -> bool:
        with self._lock:
            self._data.DB_JOB = 0
        return True
    
    def clear_all_jobs(self) -> bool:
        with self._lock:
            self._data.PLC_JOB = 0
            self._data.UR_JOB = 0 # type: ignore
            self._data.DB_JOB = 0
        return True
    
    def clear_all_data(self) -> bool:
        with self._lock:
            self._data = Data()
        return True
    
    def get_sample_type(self, matrix: str) -> int:
        sample_type = self.db_handler.get_sample_type_by_matrix(matrix)
        if sample_type != -1:
            return sample_type
        else:
            raise ValueError(f"Ugyldig sample_type for matrix '{matrix}'")
        
    def place_sample_in_rack(self, rack_rfid: str, sample_matrix: str) -> int:
        """Returnerer hvilken posisjon (1-N) begeret ble plassert i."""
        try:
            position = self.db_handler.place_sample_in_rack(rack_rfid, sample_matrix)
            return position
        except ValueError as e:
            raise ValueError(f"Feil ved plassering av sample i skinne: {e}")
        except Exception as e:
            raise RuntimeError(f"Uventet feil ved plassering av sample: {e}")
    
    # Funksjon for å hente RFID som passern en type test (1 2 eller 3), 1 = Gul, 2 = Grønn, 3 = Begge
    def get_rfid_for_test_type(self, test_type: int) -> Optional[str]:
        """
        Henter RFID for en gitt testtype.
        Testtype 1 = Gul, 2 = Grønn, 3 = Begge.
        Returnerer None hvis ingen RFID finnes for den gitte testtypen.
        """
        try:
            rfid = self.db_handler.get_rfid_by_sample_type(test_type)
            return rfid if rfid else None
        except ValueError as e:
            raise ValueError(f"Feil ved henting av RFID for testtype {test_type}: {e}")
        except Exception as e:
            raise RuntimeError(f"Uventet feil ved henting av RFID: {e}")
    
        
    def get_rack_contents(self, rack_rfid: str) -> List[Dict[str, Any]]:
        try:
            contents = self.db_handler.get_rack_contents(rack_rfid)
            return contents
        except ValueError as e:
            raise ValueError(f"Feil ved henting av skinneinnhold: {e}")
        except Exception as e:
            raise RuntimeError(f"Uventet feil ved henting av skinneinnhold: {e}")
        
    def db_clear_sorting_data(self) -> bool:
        """Tømmer sorteringsdata i databasen."""
        try:
            self.db_handler.clear_sorting_data()
            self.clear_all_data()  # Tømmer også DataStore for sorteringsdata
            return True
        except Exception as e:
            raise RuntimeError(f"Uventet feil ved tømming av sorteringsdata: {e}")
        
    def debug_scan_next_matrix(self) -> str:
        if self.debug_current_matrix < len(self.debug_matrix_codes):
            matrix_code = self.debug_matrix_codes[self.debug_current_matrix]
            self.debug_current_matrix += 1
            return matrix_code
        else:
            raise IndexError("Ingen flere matriser å skanne i debug-modus.")

    def append_ur_log(self, message: str) -> bool:
        with self._lock_logs:
            if isinstance(message, str) and message:
                self._data.UR_log.append(message)
                return True
            return False
    
    def get_ur_log(self, index: int = -1) -> list:
        with self._lock_logs:
            if index == -1:
                return list(self._data.UR_log)
            elif 0 <= index < len(self._data.UR_log):
                return self._data.UR_log[index]
            else:
                return []
    
    def clear_ur_logs(self) -> bool:
        with self._lock_logs:
            self._data.UR_log.clear()
            return True    
    
    def clear_sorting_data(self) -> bool:
        with self._lock_ur_sorting:
            self.db_handler.clear_sorting_data()
        return True
    