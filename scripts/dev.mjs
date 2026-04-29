import { spawn } from 'node:child_process';

const shell = process.platform === 'win32' ? 'cmd.exe' : 'sh';
const shellFlag = process.platform === 'win32' ? ['/d', '/s', '/c'] : ['-c'];
const serverCommand = process.platform === 'win32'
  ? 'npm run dev --prefix server'
  : 'npm run dev --prefix server';
const clientCommand = process.platform === 'win32'
  ? 'npm run dev --prefix client'
  : 'npm run dev --prefix client';

const processes = [
  spawn(shell, [...shellFlag, serverCommand], {
    stdio: 'inherit',
  }),
  spawn(shell, [...shellFlag, clientCommand], {
    stdio: 'inherit',
  }),
];

const stopProcesses = (signal) => {
  for (const process of processes) {
    if (!process.killed) {
      process.kill(signal);
    }
  }
};

process.on('SIGINT', () => stopProcesses('SIGINT'));
process.on('SIGTERM', () => stopProcesses('SIGTERM'));
process.on('exit', () => stopProcesses());

for (const process of processes) {
  process.on('exit', (code) => {
    if (code && code !== 0) {
      stopProcesses();
      process.exitCode = code;
    }
  });
}