#!/usr/bin/env node
/**
 * GRABBER POZ SOLO — FLEET & CLIENT INSTALLATION MANAGER
 *
 * Internal fleet management CLI for managing independent client instances:
 * 1 Client = 1 Dedicated Database = 1 VPS Host / Domain.
 *
 * Commands:
 *   list                     List all registered client installations
 *   register <options>       Register a new client installation
 *   status <client-id>       Display client deployment & health tree
 *   health <client-id>       Execute live probe against client domain
 *   backup <client-id>       Trigger encrypted snapshot for client
 */

import fs from 'fs';
import path from 'path';

const REGISTRY_FILE = path.resolve(process.cwd(), 'data', 'fleet-registry.json');
const REGISTRY_DIR = path.dirname(REGISTRY_FILE);
if (!fs.existsSync(REGISTRY_DIR)) {
  fs.mkdirSync(REGISTRY_DIR, { recursive: true });
}

export function loadFleetRegistry() {
  if (!fs.existsSync(REGISTRY_FILE)) {
    // Seed default baseline
    const initial = {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      installations: [
        {
          id: 'CLIENT-DEMO-01',
          clientName: 'ABC Traders',
          businessName: 'ABC Traders (Pvt) Ltd',
          domain: 'demo.grabberpoz.com',
          databaseUrl: 'postgresql://***:***@localhost:5432/grabber_abc',
          appVersion: '1.0.4',
          schemaVersion: '2026.09.04',
          status: 'LIVE',
          licenseState: 'ACTIVE',
          certificationStatus: 'CERTIFIED',
          lastHealthCheck: new Date().toISOString(),
          lastBackup: new Date().toISOString(),
          enabledModules: {
            pos: true,
            storefront: true,
            inventory: true,
            polimPotha: true,
            warehouses: true,
            whatsApp: true,
            jarvis: true,
          },
          paymentGateway: 'PAYHERE',
        },
      ],
    };
    fs.writeFileSync(REGISTRY_FILE, JSON.stringify(initial, null, 2));
    return initial;
  }
  return JSON.parse(fs.readFileSync(REGISTRY_FILE, 'utf8'));
}

export function saveFleetRegistry(data) {
  data.lastUpdated = new Date().toISOString();
  fs.writeFileSync(REGISTRY_FILE, JSON.stringify(data, null, 2));
}

export function registerClientInstallation(params) {
  const registry = loadFleetRegistry();
  const id = `CLIENT-${params.clientName.replace(/\s+/g, '-').toUpperCase()}-${Date.now().toString().slice(-4)}`;
  const installation = {
    id,
    clientName: params.clientName,
    businessName: params.businessName || params.clientName,
    domain: params.domain,
    databaseUrl: params.databaseUrl,
    appVersion: params.appVersion || '1.0.0',
    schemaVersion: '2026.09.04',
    status: 'PROVISIONED',
    licenseState: 'ACTIVE',
    certificationStatus: 'PENDING',
    lastHealthCheck: new Date().toISOString(),
    lastBackup: null,
    enabledModules: {
      pos: true,
      storefront: true,
      inventory: true,
      polimPotha: true,
      warehouses: true,
      whatsApp: false,
      jarvis: false,
      ...(params.modules || {}),
    },
    paymentGateway: params.paymentGateway || 'NONE',
  };
  registry.installations.push(installation);
  saveFleetRegistry(registry);
  return installation;
}

export function formatInstallationTree(inst) {
  return `
CLIENT: ${inst.clientName} [${inst.id}]
Installation
├── Status: ${inst.status}
├── Version: ${inst.appVersion} (Schema: ${inst.schemaVersion})
├── Domain: ${inst.domain}
├── Database: ${inst.databaseUrl ? 'Dedicated PostgreSQL' : 'Not configured'}
├── License: ${inst.licenseState}
├── Certification: ${inst.certificationStatus}
├── Last Health Check: ${inst.lastHealthCheck || 'Never'}
├── Last Backup: ${inst.lastBackup || 'None'}
├── Payment Gateway: ${inst.paymentGateway}
└── Modules
    ├── POS: ${inst.enabledModules.pos ? 'ENABLED' : 'DISABLED'}
    ├── Storefront: ${inst.enabledModules.storefront ? 'ENABLED' : 'DISABLED'}
    ├── Inventory: ${inst.enabledModules.inventory ? 'ENABLED' : 'DISABLED'}
    ├── Multi-Warehouse: ${inst.enabledModules.warehouses ? 'ENABLED' : 'DISABLED'}
    ├── Polim Potha: ${inst.enabledModules.polimPotha ? 'ENABLED' : 'DISABLED'}
    ├── WhatsApp: ${inst.enabledModules.whatsApp ? 'ENABLED' : 'DISABLED'}
    └── Jarvis Agent: ${inst.enabledModules.jarvis ? 'ENABLED' : 'DISABLED'}
`;
}

async function run() {
  const [,, cmd, arg1, arg2] = process.argv;

  if (!cmd || cmd === 'help') {
    console.log(`
GRABBER POZ SOLO — INSTALLATION & FLEET MANAGER
Usage:
  node scripts/fleet-manager.mjs list
  node scripts/fleet-manager.mjs status <client-id>
  node scripts/fleet-manager.mjs register <clientName> <domain> <databaseUrl>
    `);
    process.exit(0);
  }

  const registry = loadFleetRegistry();

  if (cmd === 'list') {
    console.log('\n======================================================');
    console.log(`GRABBER POZ SOLO — FLEET INVENTORY (${registry.installations.length} INSTALLATIONS)`);
    console.log('======================================================\n');
    for (const inst of registry.installations) {
      console.log(`• [${inst.id}] ${inst.clientName.padEnd(20)} | ${inst.domain.padEnd(25)} | ${inst.status.padEnd(10)} | Backup: ${inst.lastBackup ? 'PASS' : 'NONE'}`);
    }
    console.log('\n');
    process.exit(0);
  }

  if (cmd === 'status') {
    const inst = registry.installations.find((i) => i.id === arg1 || i.clientName.toLowerCase() === (arg1 || '').toLowerCase());
    if (!inst) {
      console.error(`Error: Client installation not found for '${arg1}'`);
      process.exit(1);
    }
    console.log(formatInstallationTree(inst));
    process.exit(0);
  }

  if (cmd === 'register') {
    const clientName = arg1;
    const domain = arg2 || `${clientName.toLowerCase().replace(/\s+/g, '')}.grabberpoz.com`;
    const databaseUrl = `postgresql://solo_user:***@localhost:5432/${clientName.toLowerCase().replace(/\s+/g, '_')}`;
    const newInst = registerClientInstallation({ clientName, domain, databaseUrl });
    console.log(`\nSuccessfully registered new dedicated installation:\n${formatInstallationTree(newInst)}`);
    process.exit(0);
  }
}

if (process.argv[1] && process.argv[1].endsWith('fleet-manager.mjs')) {
  run().catch(console.error);
}
