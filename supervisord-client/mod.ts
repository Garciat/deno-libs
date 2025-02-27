import { methodCall } from "../xml-rpc-client/json.ts";
import { XmlRpcClient } from "../xml-rpc-client/mod.ts";
import {
  array,
  boolean,
  booleanTrue,
  i4,
  oneOf,
  string,
  struct,
  tuple,
} from "../xml-rpc-client/schema.ts";

/**
 * @see https://supervisord.org/api.html
 */
export function bind(client: XmlRpcClient) {
  return {
    // Status and Control
    getAPIVersion: client.bind(
      () => methodCall("supervisor.getAPIVersion"),
      string(),
    ),
    getSupervisorVersion: client.bind(
      () => methodCall("supervisor.getSupervisorVersion"),
      string(),
    ),
    getIdentification: client.bind(
      () => methodCall("supervisor.getIdentification"),
      string(),
    ),
    getState: client.bind(
      () => methodCall("supervisor.getState"),
      struct({ statecode: i4(), statename: string() }),
    ),
    getPID: client.bind(
      () => methodCall("supervisor.getPID"),
      i4(),
    ),
    readLog: client.bind(
      (offset: bigint, length: bigint) =>
        methodCall("supervisor.readLog", offset, length),
      string(),
    ),
    clearLog: client.bind(
      () => methodCall("supervisor.clearLog"),
      booleanTrue(),
    ),
    shutdown: client.bind(
      () => methodCall("supervisor.shutdown"),
      booleanTrue(),
    ),
    restart: client.bind(
      () => methodCall("supervisor.restart"),
      booleanTrue(),
    ),
    // Process Control
    getProcessInfo: client.bind(
      (name: string) => methodCall("supervisor.getProcessInfo", name),
      ProcessInfoSchema,
    ),
    getAllProcessInfo: client.bind(
      () => methodCall("supervisor.getAllProcessInfo"),
      array(ProcessInfoSchema),
    ),
    getAllConfigInfo: client.bind(
      () => methodCall("supervisor.getAllConfigInfo"),
      array(ConfigInfoSchema),
    ),
    startProcess: client.bind(
      (name: string, wait?: boolean) =>
        methodCall("supervisor.startProcess", name, wait),
      booleanTrue(),
    ),
    stopProcess: client.bind(
      (name: string, wait?: boolean) =>
        methodCall("supervisor.stopProcess", name, wait),
      booleanTrue(),
    ),
    signalProcess: client.bind(
      (name: string, signal: string | bigint) =>
        methodCall("supervisor.signalProcess", name, signal),
      booleanTrue(),
    ),
    sendProcessStdin: client.bind(
      (name: string, chars: string) =>
        methodCall("supervisor.sendProcessStdin", name, chars),
      booleanTrue(),
    ),
    startProcessGroup: client.bind(
      (name: string, wait?: boolean) =>
        methodCall("supervisor.startProcessGroup", name, wait),
      array(ProcessInfoSchema),
    ),
    stopProcessGroup: client.bind(
      (name: string, wait?: boolean) =>
        methodCall("supervisor.stopProcessGroup", name, wait),
      array(ProcessInfoSchema),
    ),
    signalProcessGroup: client.bind(
      (name: string, signal: string | bigint) =>
        methodCall("supervisor.signalProcessGroup", name, signal),
      array(ProcessInfoSchema),
    ),
    addProcessGroup: client.bind(
      (name: string) => methodCall("supervisor.addProcessGroup", name),
      booleanTrue(),
    ),
    removeProcessGroup: client.bind(
      (name: string) => methodCall("supervisor.removeProcessGroup", name),
      booleanTrue(),
    ),
    startAllProcesses: client.bind(
      (wait?: boolean) => methodCall("supervisor.startAllProcesses", wait),
      array(ProcessInfoSchema),
    ),
    stopAllProcesses: client.bind(
      (wait?: boolean) => methodCall("supervisor.stopAllProcesses", wait),
      array(ProcessInfoSchema),
    ),
    signalAllProcesses: client.bind(
      (signal: string | bigint) =>
        methodCall("supervisor.signalAllProcesses", signal),
      array(ProcessInfoSchema),
    ),
    sendRemoteCommEvent: client.bind(
      (type: string, data: string) =>
        methodCall("supervisor.sendRemoteCommEvent", type, data),
      booleanTrue(),
    ),
    reloadConfig: client.bind(
      () => methodCall("supervisor.reloadConfig"),
      // for whatever reason the tuple is nested in a 1-ple
      tuple(tuple(array(string()), array(string()), array(string()))),
    ),
    // Process Logging
    readProcessStdoutLog: client.bind(
      (name: string, offset: bigint, length: bigint) =>
        methodCall("supervisor.readProcessStdoutLog", name, offset, length),
      string(),
    ),
    readProcessStderrLog: client.bind(
      (name: string, offset: bigint, length: bigint) =>
        methodCall("supervisor.readProcessStderrLog", name, offset, length),
      string(),
    ),
    tailProcessStdoutLog: client.bind(
      (name: string, offset: bigint, length: bigint) =>
        methodCall("supervisor.tailProcessStdoutLog", name, offset, length),
      string(),
    ),
    tailProcessStderrLog: client.bind(
      (name: string, offset: bigint, length: bigint) =>
        methodCall("supervisor.tailProcessStderrLog", name, offset, length),
      string(),
    ),
    clearProcessLogs: client.bind(
      (name: string) => methodCall("supervisor.clearProcessLogs", name),
      booleanTrue(),
    ),
    clearAllProcessLogs: client.bind(
      (name: string) => methodCall("supervisor.clearAllProcessLogs", name),
      array(ProcessInfoSchema),
    ),
  } as const;
}

const ProcessStates = {
  "STOPPED": 0n,
  "STARTING": 10n,
  "RUNNING": 20n,
  "BACKOFF": 30n,
  "STOPPING": 40n,
  "EXITED": 100n,
  "FATAL": 200n,
  "UNKNOWN": 1000n,
} as const;

const ProcessInfoSchema = struct({
  "name": string(),
  "group": string(),
  "description": string(),
  "start": i4(),
  "stop": i4(),
  "now": i4(),
  "state": oneOf(i4(), Object.values(ProcessStates)),
  "statename": oneOf(string(), typedObjectKeys(ProcessStates)),
  "spawnerr": string(),
  "exitstatus": i4(),
  "logfile": string(),
  "stdout_logfile": string(),
  "stderr_logfile": string(),
  "pid": i4(),
});

const ConfigInfoSchema = struct({
  "autostart": boolean(),
  "directory": string(),
  "uid": string(),
  "command": string(),
  "exitcodes": array(i4()),
  "group": string(),
  "group_prio": i4(),
  "inuse": boolean(),
  "killasgroup": boolean(),
  "name": string(),
  "process_prio": i4(),
  "redirect_stderr": boolean(),
  "startretries": i4(),
  "startsecs": i4(),
  "stdout_capture_maxbytes": i4(),
  "stdout_events_enabled": boolean(),
  "stdout_logfile": string(),
  "stdout_logfile_backups": i4(),
  "stdout_logfile_maxbytes": i4(),
  "stdout_syslog": boolean(),
  "stopsignal": i4(),
  "stopwaitsecs": i4(),
  "stderr_capture_maxbytes": i4(),
  "stderr_events_enabled": boolean(),
  "stderr_logfile": string(),
  "stderr_logfile_backups": i4(),
  "stderr_logfile_maxbytes": i4(),
  "stderr_syslog": boolean(),
  "serverurl": string(),
});

function typedObjectKeys<T extends Record<string, unknown>>(
  obj: T,
): Array<keyof T> {
  return Object.keys(obj) as Array<keyof T>;
}
