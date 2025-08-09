"""
PLC Handler Module
Denne modulen håndterer kommunikasjon med en PLC for å lese og skrive data relatert til sortering av objekter.
Den bruker Snap7-biblioteket for å kommunisere med Siemens S7 PLC-er.

Hovedfunksjoner:
- Kommunikasjon med PLC for å lese og skrive sorteringsdata.
- Håndtering av skinner (rampe, gul, grønn, begge) ved å lese og skrive til spesifikke DINT-adresser.
- Håndtering av jobber og signaler fra PLC for å starte og stoppe sortering.
- Periodisk oppdatering av DataStore med PLC-data.

"""

import time
from middleware.s7_com import PLC
import store.SharedDataStore as C
from store.SharedDataStore import DataStore
import traceback

PLC_DB_AREA = "DB400"
DB_WRITE_AREA = "DB500"

PLC_PICKUP_READY_ADDRESS = f"{DB_WRITE_AREA},BOOL0.0"
PLC_JOB_COMMAND_ADDRESS = f"{PLC_DB_AREA},INT0.0"

# Offsets for skinne data i PLC
RAMPE_SKINNE_OFFSET = 4
GUL_SKINNE_OFFSET = 6
GRO_SKINNE_OFFSET = 8
GG_SKINNE_OFFSET = 10
SKINNE_LENGTH = 10 # Antall elementer i en skinne-liste


def bool_to_int(value) -> int:
    """Konverterer en bool til int (0 eller 1)."""
    return 1 if value else 0

def _iter_skinne_dint_addresses(base_offset: int, count: int = SKINNE_LENGTH):
    """
    Hjelpefunksjon for å iterere over de spesifikke (x, y) DINT-adressene for skinner.
    Yields: (byte_offset, bit_offset_within_byte)
    """
    x = base_offset
    y = 0
    for _ in range(count):
        yield x, y
        y += 1
        if y >= 8: # Etter at 8 bit-offsets (0-7) er brukt for en byte_offset (x)
            x += 1
            y = 0

def _read_skinne_data_from_plc(plc: PLC, base_offset: int) -> list[int]:
    """Leser en komplett skinne-liste fra PLC."""
    data = []
    for x, y in _iter_skinne_dint_addresses(base_offset):
        address_str = f"{PLC_DB_AREA},BOOL{x}.{y}"
        
        data.append(bool_to_int(plc.read_node(address_str)))
    return data

def _write_skinne_data_to_plc(plc: PLC, base_offset: int, data_to_write: list[int]) -> None:
    """Skriver en komplett skinne-liste til PLC."""
    for i, (x, y) in enumerate(_iter_skinne_dint_addresses(base_offset, count=len(data_to_write))):
        address_str = f"{PLC_DB_AREA},BOOL{x}.{y}"
        plc.write_node(address_str, data_to_write[i])

def plc_job(data_store: DataStore):
    """Hovedfunksjon for PLC-kommunikasjonstråden."""
    s7_plc = PLC()
    current_time = time.strftime("%H:%M:%S", time.localtime())
    print(f"[{current_time}][PLC_JOB] Starter PLC-jobb ...")
    data_store.set_plc_status(C.RUNNING) # Status for initialisering

    local_plc_pickup_ready = s7_plc.read_node(PLC_PICKUP_READY_ADDRESS)

    local_plc_rampe_state = _read_skinne_data_from_plc(s7_plc, RAMPE_SKINNE_OFFSET)
    local_plc_gul_state = _read_skinne_data_from_plc(s7_plc, GUL_SKINNE_OFFSET)
    local_plc_gro_state = _read_skinne_data_from_plc(s7_plc, GRO_SKINNE_OFFSET)
    local_plc_gg_state = _read_skinne_data_from_plc(s7_plc, GG_SKINNE_OFFSET)

    # --- Synkroniser DataStore med initiell PLC-tilstand ---
    data_store.set_ur_sorting_ramp_full(list(local_plc_rampe_state)) # Send kopi
    data_store.set_ur_sorting_gul_full(list(local_plc_gul_state))
    data_store.set_ur_sorting_gronn_full(list(local_plc_gro_state))
    data_store.set_ur_sorting_begge_full(list(local_plc_gg_state))

    print(f"[{current_time}][PLC_JOB] Initial Rampe state: {local_plc_rampe_state}")

    # --- Hovedløkke hjelpefunksjoner (definert her for å ha tilgang til s7_plc, data_store, og lokal cache) ---
    def _update_one_skinne_on_plc_if_changed(
            ds_getter_method,
            local_plc_cache_list: list,
            plc_offset: int,
            skinne_navn: str
    ):
        """Sammenligner DataStore-verdi med lokal PLC-cache og skriver til PLC ved endring."""
        current_ds_state = ds_getter_method()
        if current_ds_state != local_plc_cache_list:
            current_time = time.strftime("%H:%M:%S", time.localtime())
            print(f"[{current_time}][PLC_JOB] Oppdaget endring i '{skinne_navn}' skinne-data.")
            _write_skinne_data_to_plc(s7_plc, plc_offset, current_ds_state)
            local_plc_cache_list[:] = current_ds_state # Oppdater lokal cache in-place

    def _handle_periodic_skinne_updates():
        """Håndterer oppdatering av alle skinner fra DataStore til PLC."""
        _update_one_skinne_on_plc_if_changed(data_store.get_ur_sorting_ramp, local_plc_rampe_state, RAMPE_SKINNE_OFFSET, "Rampe")
        #_update_one_skinne_on_plc_if_changed(data_store.get_ur_sorting_gul, local_plc_gul_state, GUL_SKINNE_OFFSET, "Gul")
        #_update_one_skinne_on_plc_if_changed(data_store.get_ur_sorting_gronn, local_plc_gro_state, GRO_SKINNE_OFFSET, "Grønn")
        #_update_one_skinne_on_plc_if_changed(data_store.get_ur_sorting_begge, local_plc_gg_state, GG_SKINNE_OFFSET, "Begge")

    def _handle_periodic_job_and_signal_updates():
        """Håndterer PLC-jobber fra DataStore og pickup_ready signalet fra PLC."""
        nonlocal local_plc_pickup_ready

        current_pickup_signal_from_plc = s7_plc.read_node(PLC_PICKUP_READY_ADDRESS)


        if current_pickup_signal_from_plc != local_plc_pickup_ready:
            current_time = time.strftime("%H:%M:%S", time.localtime())
            local_plc_pickup_ready = current_pickup_signal_from_plc
            ur_job_request = C.REQ_UR_START_SORTING if local_plc_pickup_ready else C.REQ_UR_STOP_SORTING
            data_store.set_ur_job(ur_job_request)
            print(f"[{current_time}][PLC_JOB] Pickup signal endret til {local_plc_pickup_ready}. UR Job satt til: {ur_job_request}")

        # 2. Hent jobb fra DataStore og skriv til PLC hvis den finnes
        job_for_plc = data_store.get_plc_job()
        if job_for_plc != 0:
            current_time = time.strftime("%H:%M:%S", time.localtime())
            print(f"[{current_time}][PLC_JOB] Skriver jobb {job_for_plc} til PLC på adresse {PLC_JOB_COMMAND_ADDRESS}")
            s7_plc.write_node(PLC_JOB_COMMAND_ADDRESS, job_for_plc)
            data_store.clear_plc_job()

    # --- Hovedløkke ---
    data_store.set_plc_status(C.IDLE) # Klar til å kjøre hovedløkken
    try:
        while True:
            data_store.set_plc_status(C.RUNNING) # Viser at tråden aktivt jobber

            _handle_periodic_job_and_signal_updates()
            _handle_periodic_skinne_updates()

            data_store.set_plc_status(C.IDLE) # Ferdig med syklus, venter
            time.sleep(1)
    except Exception as e:
        print(f"[PLC_JOB] Kritisk feil i hovedløkken: {e}")
        data_store.set_plc_status(C.ERROR)
        traceback.print_exc()
    finally:
        print("[PLC_JOB] Stopper PLC-jobb...")
        s7_plc.disconnect()
        # Rydd opp og sett sluttstatus
        data_store.set_plc_status(C.IDLE)