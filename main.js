const bedrock = require('bedrock-protocol');
const { faker } = require('@faker-js/faker');

const cfg = {
  host: 'mc.turulabs.com',
  port: 19132,
  session: {
    min: 300000,
    max: 600000
  },
  delay: {
    min: 30000,
    max: 150000
  }
};

let clients = [];
const maxClients = 76;

// Fungsi untuk memulai koneksi klien dengan batas maksimum
async function start() {
  const clientPromises = Array.from({ length: maxClients }).map(() => createClientWithDelay());
  await Promise.all(clientPromises);
}

// Fungsi untuk membuat klien dengan penundaan acak
async function createClientWithDelay() {
  const delay = getRandomNumber(cfg.delay.min, cfg.delay.max);
  await new Promise(resolve => setTimeout(resolve, delay));
  await createClient();
}

// Fungsi untuk membuat klien
async function createClient() {
  try {
    const client = bedrock.createClient({
      host: cfg.host,
      port: cfg.port,
      username: generateRandomUsername(),
      offline: true
    });

    clients.push(client);

    client.on('join', () => {
      console.log(`${client.options.username} has joined the server`);
      const sessionDuration = getRandomNumber(cfg.session.min, cfg.session.max);

      setTimeout(() => {
        client.disconnect('Session ended');
        console.log(`${client.options.username} has been logged out after ${sessionDuration / 1000} seconds`);
        clients = clients.filter(c => c !== client);
        manageClients();
      }, sessionDuration);
    });

    client.on('disconnect', (reason) => {
      console.log(`${client.options.username} disconnected:`, reason);
    });

    // Penanganan event error khusus pada klien
    client.on('error', (err) => {
      console.log(`Error on client ${client.options.username}:`, err.message || err);
      clients = clients.filter(c => c !== client); // Hapus klien dari daftar saat error
    });

    // Penanganan ping ke server
    try {
      const res = await bedrock.ping({
        host: cfg.host,
        port: cfg.port
      });
      console.log("Players Online:", res.playersOnline);
    } catch (err) {
      console.log("Ping error:", err.message || err);
    }
  } catch (error) {
    console.log("Error while creating client:", error.message || error);
  }
}

// Fungsi untuk mengelola klien aktif dengan batas maksimum
async function manageClients() {
  while (clients.length < maxClients) {
    await createClientWithDelay();
  }
}

// Fungsi untuk mengakhiri semua klien secara otomatis
function logoutAllClients() {
  clients.forEach(client => {
    client.disconnect('Client shutting down');
    console.log(`${client.options.username} has been logged out`);
  });
}

// Tangani event keluar (exit)
process.on('exit', () => {
  console.log("Program exiting, logging out clients...");
  logoutAllClients();
});

process.on('SIGINT', () => {
  console.log("SIGINT received, logging out clients...");
  logoutAllClients();
  process.exit();
});

process.on('SIGTERM', () => {
  console.log("SIGTERM received, logging out clients...");
  logoutAllClients();
  process.exit();
});

function generateRandomUsername() {
  const fullName = faker.person.fullName();
  const randomNumber = faker.number.int({ min: 20, max: 99 });
  return `${fullName}${randomNumber}`;
}

function getRandomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Mulai proses
start();
