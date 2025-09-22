import fetch from 'node-fetch';

const WARM_URL = 'http://localhost:3000/api/warm';
const INTERVAL = 1.2 * 60 * 1000;

async function pingWarmEndpoint() {
  try {
    const response = await fetch(WARM_URL);
    const data = await response.json();
    console.log(new Date().toISOString(), '- Warm status:', data.status);
  } catch (error) {
    console.error(new Date().toISOString(), '- Failed to warm:', error.message);
  }
}

pingWarmEndpoint();

setInterval(pingWarmEndpoint, INTERVAL);

console.log(`Started warm-up service. Pinging ${WARM_URL} every ${INTERVAL/1000} seconds.`); 