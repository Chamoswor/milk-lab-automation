// rpcClient.js
import xmlrpc from 'xmlrpc';

export const REQ_UR_START_SORTING   = 2301;
export const REQ_UR_STOP_SORTING    = 2302;
export const REQ_PLC_START_CONVEYOR = 2101;
export const REQ_PLC_STOP_CONVEYOR  = 2102;

// Bruk riktig port og host for XML-RPC-serveren:
const client = xmlrpc.createClient({
  host: '172.18.0.60',
  port: 4840,
  path: '/RPC2'
});

function clientCall(method, params = []) {
  return new Promise((resolve, reject) => {
    client.methodCall(method, params, (err, response) => {
      if (err) {
        console.error(`Feil ved RPC-kall til ${method}:`, err);
        return reject(err);
      }
      console.log(`Svar fra ${method}:`, response);
      resolve(response);
    });
  });
}

export async function startSorting() {
  try {
    // Her sendes riktig ID for "start sorting"-jobben
    const response = await clientCall('set_plc_job', [REQ_PLC_START_CONVEYOR]);
    return response;
  } catch (error) {
    console.error('Feil ved startSorting:', error);
    throw error;
  }
}

export async function stopSorting() {
  try {
    const response_plc = await clientCall('set_ur_job', [REQ_PLC_STOP_CONVEYOR]);
    const response_ur  = await clientCall('set_ur_job', [REQ_UR_STOP_SORTING]);
    return { plcResponse: response_plc, urResponse: response_ur };
  } catch (error) {
    console.error('Feil ved stopSorting:', error);
    throw error;
  }
}

export async function resetDemo() {
  try {
    const response_ur    = await clientCall('set_ur_job', [REQ_UR_STOP_SORTING]);
    const responsePlc   = await clientCall('set_ur_job', [REQ_PLC_STOP_CONVEYOR]);
    const response_data = await clientCall('clear_sorting_data', []);
    const response_ramp = await clientCall('clear_ur_sorting_ramp', []);
    return {
      urResponse:    response_ur,
      plcResponse:   responsePlc,
      dataResponse:  response_data,
      rampResponse:  response_ramp
    };
  } catch (error) {
    console.error('Feil ved resetDemo:', error);
    throw error;
  }
}
