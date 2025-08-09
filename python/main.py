#!/usr/bin/env python3
"""
Dette er hovedprogrammet for styring av PLC og UR5-robot.
Det håndterer opprettelse av en XML-RPC-server for delt datalager, starter tråder for PLC-kommunikasjon og logger UR5-robotens hendelser.
Det bruker threading for å kjøre serveren og PLC-jobben parallelt, og logger hendelser til en delt datalager.
Det er designet for å kjøre i en container, og kan enkelt deaktiveres for testing uten tilkoblet PLC eller UR5-robot.
"""

import signal
import threading
import time
from socketserver import ThreadingMixIn
from xmlrpc.server import SimpleXMLRPCServer
from store.SharedDataStore import DataStore
from handlers.plc_handler import plc_job
import logging

DISABLED_CONTAINER = True # Deaktiver hvis PLC eller UR5-robot ikke er i bruk

# ---------------------------------------------------------------------------
# 1. Logger-konfigurasjon
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] %(levelname)s %(name)s: %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
# Opprett logger for dette modulen
logger = logging.getLogger(__name__)
# ---------------------------------------------------------------------------
# 2. Threaded XML-RPC-server
# ---------------------------------------------------------------------------
class ThreadedXMLRPCServer(ThreadingMixIn, SimpleXMLRPCServer):
    """Hver klientforbindelse kjøres i egen tråd."""
    daemon_threads = True        # Avslutt klienttråder på shutdown
    allow_reuse_address = True   # Gjenbruk port raskt etter restart


def create_server(dataStore: DataStore,
                  host: str = "0.0.0.0",
                  port: int = 4840) -> ThreadedXMLRPCServer:
    """Oppretter, registrerer DataStore og returnerer serverobjektet."""
    server = ThreadedXMLRPCServer((host, port),
                                  logRequests=False,
                                  allow_none=True)
    server.register_instance(dataStore, allow_dotted_names=True)
    logger.info("XML-RPC-server lytter på %s:%d", host, port)
    return server

def logger_thread(ds: DataStore):
    current_log_list = ds.get_ur_log()
    end_of_index = len(current_log_list) - 1
    while True:
        current_log_list = ds.get_ur_log()
        if end_of_index < len(current_log_list) - 1:
            end_of_index += 1
            current_time = time.strftime("%H:%M:%S", time.localtime())
            log_entry = f"[{current_time}][UR5] {current_log_list[end_of_index]}"
            logger.info(log_entry)

        if end_of_index > 10:
            ds.clear_ur_logs()
            end_of_index = 0
        time.sleep(1)
        
        

# ---------------------------------------------------------------------------
# 3. Hovedprogram med tråd-start og nedstengning
# ---------------------------------------------------------------------------
def main() -> None:
    
    if DISABLED_CONTAINER:
        logger.warning("Denne containere er deaktivert for testing uten PLC eller UR5-robot. Deaktiver DISABLED_CONTAINER for å bruke den.")
        logger.warning("Containeren går nå i dvale.")
        while True:
            time.sleep(5)
    
    data = DataStore()  # Opprett delt datalager
    server = create_server(port=4840, dataStore=data) # Port 4840 er standard for XML-RPC

    # Start logger-tråd for UR-logg
    logger_thread_instance = threading.Thread(
        target=logger_thread,
        args=(data,),
        name="UR-Logger-Thread",
        daemon=True
    )
    logger_thread_instance.start()

    plc_thread = threading.Thread(
        target=plc_job,
        args=(data,),
        name="PLC-Job-Thread",
        daemon=True
    )
    plc_thread.start()

    server_thread = threading.Thread(
        target=server.serve_forever,
        name="XMLRPC-Server-Thread",
        daemon=False
    )
    server_thread.start()


    def shutdown_handler(sig, frame):
        logger.info("\n[MAIN] SIGINT mottatt - stenger serveren …")
        server.shutdown()
        server.server_close()

    signal.signal(signal.SIGINT, shutdown_handler) # Håndter Ctrl-C for å stoppe serveren

    try:
        logger.info("Trykk Ctrl-C for å avslutte.")
        server_thread.join()


    except KeyboardInterrupt:
        shutdown_handler(None, None)

    finally:
        logger.info("[MAIN] Venter på servertråden …")
        server_thread.join()
        logger.info("[MAIN] Ferdig. Prosessen avsluttes.")


if __name__ == "__main__":
    main()
