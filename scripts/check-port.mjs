import net from 'net';
import { execSync } from 'child_process';

const port = parseInt(process.argv[2], 10);
const serviceName = process.argv[3] || 'Service';

if (!port) {
  console.error("Usage: node check-port.js <port> <service_name>");
  process.exit(1);
}

function checkPortAvailability(port) {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(false);
      } else {
        // Some other error, maybe permission denied?
        console.error(`Error checking port: ${err.message}`);
        resolve(false);
      }
    });

    server.once('listening', () => {
      server.close();
      resolve(true);
    });

    server.listen(port);
  });
}

function findOccupyingProcess(port) {
  try {
    const output = execSync(`lsof -i :${port} -t`).toString().trim();
    if (output) {
      const pids = output.split('\n');
      const processDetails = pids.map(pid => {
        try {
          return execSync(`ps -p ${pid} -o comm=`).toString().trim() + ` (PID: ${pid})`;
        } catch {
          return `PID: ${pid}`;
        }
      }).join(', ');
      return processDetails;
    }
  } catch (error) {
    // lsof might fail or not be available
  }
  return 'Unknown Process';
}

async function run() {
  const isAvailable = await checkPortAvailability(port);
  if (!isAvailable) {
    const processInfo = findOccupyingProcess(port);
    console.error(`\n======================================================`);
    console.error(`❌ PORT CONFLICT ERROR`);
    console.error(`======================================================`);
    console.error(`IEC Integration Rule Violation:`);
    console.error(`Port ${port} is CONTRACTUALLY REQUIRED by ${serviceName}.`);
    console.error(`It is currently occupied by: ${processInfo}`);
    console.error(`\nDo NOT silently switch ports. Please kill the process`);
    console.error(`occupying port ${port} before starting this service.`);
    console.error(`======================================================\n`);
    process.exit(1);
  }
}

run();
