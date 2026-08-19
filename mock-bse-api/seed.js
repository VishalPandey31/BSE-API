const fs = require('fs');
const path = require('path');

// Deterministic seeded random for reproducibility
let _seed = 42;
function seededRandom() {
  _seed = (_seed * 16807) % 2147483647;
  return (_seed - 1) / 2147483646;
}

function randomInt(min, max) {
  return Math.floor(seededRandom() * (max - min + 1)) + min;
}

function randomElement(arr) {
  return arr[Math.floor(seededRandom() * arr.length)];
}

function randomDate(start, end) {
  const startTime = start.getTime();
  const endTime = end.getTime();
  const randomTime = startTime + seededRandom() * (endTime - startTime);
  return new Date(randomTime);
}

function generatePAN() {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let pan = '';
  for (let i = 0; i < 5; i++) pan += letters[Math.floor(seededRandom() * 26)];
  for (let i = 0; i < 4; i++) pan += Math.floor(seededRandom() * 10);
  pan += letters[Math.floor(seededRandom() * 26)];
  return pan;
}

const firstNames = [
  'Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Ayaan',
  'Krishna', 'Ishaan', 'Ananya', 'Diya', 'Aditi', 'Myra', 'Sara', 'Aadhya',
  'Ira', 'Aanya', 'Navya', 'Prisha', 'Rohan', 'Kabir', 'Shaurya', 'Atharv',
  'Advait', 'Dhruv', 'Ritvik', 'Harsh', 'Neel', 'Parth', 'Kavya', 'Riya',
  'Meera', 'Tara', 'Simran', 'Pooja', 'Neha', 'Anjali', 'Sneha', 'Nikita',
  'Rajesh', 'Suresh', 'Mahesh', 'Ramesh', 'Dinesh', 'Ganesh', 'Mukesh', 'Rakesh',
  'Deepak', 'Amit', 'Sumit', 'Rohit', 'Mohit', 'Vikas', 'Nikhil', 'Rahul'
];

const lastNames = [
  'Sharma', 'Verma', 'Gupta', 'Singh', 'Kumar', 'Jain', 'Agarwal', 'Mehta',
  'Patel', 'Shah', 'Desai', 'Reddy', 'Nair', 'Pillai', 'Iyer', 'Menon',
  'Rao', 'Naidu', 'Choudhary', 'Malhotra', 'Kapoor', 'Bhatia', 'Chopra', 'Kohli',
  'Bansal', 'Goel', 'Mittal', 'Saxena', 'Mishra', 'Pandey', 'Tiwari', 'Dubey'
];

const cities = [
  'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune',
  'Ahmedabad', 'Jaipur', 'Lucknow', 'Surat', 'Indore', 'Nagpur', 'Vadodara'
];

const stockSymbols = [
  'RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK', 'HINDUNILVR', 'SBIN',
  'BHARTIARTL', 'KOTAKBANK', 'ITC', 'LT', 'AXISBANK', 'ASIANPAINT', 'MARUTI',
  'TITAN', 'SUNPHARMA', 'BAJFINANCE', 'WIPRO', 'HCLTECH', 'ULTRACEMCO',
  'NESTLEIND', 'TATAMOTORS', 'TATASTEEL', 'POWERGRID', 'NTPC', 'TECHM',
  'ONGC', 'COALINDIA', 'JSWSTEEL', 'ADANIENT', 'ADANIPORTS', 'CIPLA',
  'DRREDDY', 'EICHERMOT', 'GRASIM', 'HEROMOTOCO', 'HINDALCO', 'DIVISLAB',
  'BAJAJFINSV', 'BPCL', 'BRITANNIA', 'IOC', 'M&M', 'SBILIFE', 'TATACONSUM',
  'APOLLOHOSP', 'UPL', 'VEDL', 'ZEEL', 'PIDILITIND'
];

const exchanges = ['BSE', 'NSE'];
const tradeTypes = ['BUY', 'SELL'];
const segments = ['EQUITY', 'F&O', 'COMMODITY', 'CURRENCY'];

const designations = [
  'Relationship Manager', 'Senior Relationship Manager',
  'Associate VP', 'Vice President', 'Assistant Manager'
];

const departments = ['Wealth Management', 'Retail Broking', 'Institutional Sales', 'HNI Desk'];

// Generate clients
function generateClients(count) {
  const clients = [];
  const usedPANs = new Set();

  for (let i = 1; i <= count; i++) {
    let pan;
    do {
      pan = generatePAN();
    } while (usedPANs.has(pan));
    usedPANs.add(pan);

    const firstName = randomElement(firstNames);
    const lastName = randomElement(lastNames);
    const joinDate = randomDate(new Date('2018-01-01'), new Date('2025-12-31'));

    clients.push({
      clientId: `BSE${String(i).padStart(6, '0')}`,
      name: `${firstName} ${lastName}`,
      pan: pan,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${randomInt(1, 99)}@email.com`,
      phone: `+91${randomInt(7000000000, 9999999999)}`,
      city: randomElement(cities),
      segment: randomElement(segments),
      status: seededRandom() > 0.1 ? 'ACTIVE' : 'INACTIVE',
      joinDate: joinDate.toISOString().split('T')[0],
      dematAccountNo: `IN${randomInt(100000000000, 999999999999)}`
    });
  }
  return clients;
}

// Generate trades
function generateTrades(clients, count) {
  const trades = [];
  const activeClients = clients.filter(c => c.status === 'ACTIVE');

  for (let i = 1; i <= count; i++) {
    const client = randomElement(activeClients);
    const tradeDate = randomDate(new Date('2024-01-01'), new Date('2026-07-14'));
    const symbol = randomElement(stockSymbols);
    const qty = randomInt(1, 500) * randomElement([1, 5, 10]);
    const price = parseFloat((randomInt(50, 5000) + seededRandom()).toFixed(2));
    const brokerage = parseFloat((price * qty * (randomInt(1, 5) / 10000)).toFixed(2));

    trades.push({
      tradeId: `TRD${String(i).padStart(8, '0')}`,
      clientId: client.clientId,
      symbol: symbol,
      exchange: randomElement(exchanges),
      segment: client.segment,
      tradeType: randomElement(tradeTypes),
      quantity: qty,
      price: price,
      totalValue: parseFloat((price * qty).toFixed(2)),
      brokerage: brokerage,
      tradeDate: tradeDate.toISOString().split('T')[0],
      tradeTime: `${String(randomInt(9, 15)).padStart(2, '0')}:${String(randomInt(0, 59)).padStart(2, '0')}:${String(randomInt(0, 59)).padStart(2, '0')}`,
      settlementDate: new Date(tradeDate.getTime() + 2 * 86400000).toISOString().split('T')[0],
      status: seededRandom() > 0.02 ? 'EXECUTED' : 'CANCELLED'
    });
  }

  // Sort by date descending
  trades.sort((a, b) => b.tradeDate.localeCompare(a.tradeDate));
  return trades;
}

// Generate employees
function generateEmployees(count) {
  const employees = [];
  const usedNames = new Set();

  for (let i = 1; i <= count; i++) {
    let firstName, lastName, fullName;
    do {
      firstName = randomElement(firstNames);
      lastName = randomElement(lastNames);
      fullName = `${firstName} ${lastName}`;
    } while (usedNames.has(fullName));
    usedNames.add(fullName);

    const isManager = i <= 3; // First 3 are management

    employees.push({
      employeeId: `EMP${String(i).padStart(4, '0')}`,
      name: fullName,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@arhamfintech.com`,
      designation: isManager ? randomElement(['VP', 'Director', 'Head of Sales']) : randomElement(designations),
      department: randomElement(departments),
      role: isManager ? 'MANAGEMENT' : 'EMPLOYEE',
      joiningDate: randomDate(new Date('2019-01-01'), new Date('2025-06-01')).toISOString().split('T')[0],
      status: 'ACTIVE'
    });
  }
  return employees;
}

// Generate employee-client mappings
function generateMappings(employees, clients) {
  const mappings = [];
  const nonMgmtEmployees = employees.filter(e => e.role === 'EMPLOYEE');

  clients.forEach((client, idx) => {
    // Distribute clients roughly evenly among non-management employees
    const employee = nonMgmtEmployees[idx % nonMgmtEmployees.length];
    mappings.push({
      mappingId: `MAP${String(idx + 1).padStart(6, '0')}`,
      employeeId: employee.employeeId,
      clientId: client.clientId,
      assignedDate: client.joinDate
    });
  });

  return mappings;
}

// Main seed function
function seed() {
  const dataDir = path.join(__dirname, 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  console.log('Generating 250 clients...');
  const clients = generateClients(250);

  console.log('Generating 5000 trades...');
  const trades = generateTrades(clients, 5000);

  console.log('Generating 20 employees...');
  const employees = generateEmployees(20);

  console.log('Generating employee-client mappings...');
  const mappings = generateMappings(employees, clients);

  // Write to files
  fs.writeFileSync(path.join(dataDir, 'clients.json'), JSON.stringify(clients, null, 2));
  fs.writeFileSync(path.join(dataDir, 'trades.json'), JSON.stringify(trades, null, 2));
  fs.writeFileSync(path.join(dataDir, 'employees.json'), JSON.stringify(employees, null, 2));
  fs.writeFileSync(path.join(dataDir, 'mappings.json'), JSON.stringify(mappings, null, 2));

  console.log(`\nSeed complete:`);
  console.log(`  Clients:  ${clients.length}`);
  console.log(`  Trades:   ${trades.length}`);
  console.log(`  Employees: ${employees.length}`);
  console.log(`  Mappings: ${mappings.length}`);
  console.log(`\nData written to ${dataDir}`);
}

seed();
