import axios = require('axios');


const MCP_BASE = 'http://localhost:8080'; // MCP Server URL

export async function searchPlace(query: string) {
  try {
    const response = await axios.get(`${MCP_BASE}/search`, {
      params: { query },
    });
    return response.data;
  } catch (err) {
    console.error('MCP Search Error:', err);
    return null;
  }
}

export async function getRoute(from: string, to: string) {
  try {
    const response = await axios.get(`${MCP_BASE}/route`, {
      params: { from, to },
    });
    return response.data;
  } catch (err) {
    console.error('MCP Route Error:', err);
    return null;
  }
}

export async function getTraffic(area: string) {
  try {
    const response = await axios.get(`${MCP_BASE}/traffic`, {
      params: { area },
    });
    return response.data;
  } catch (err) {
    console.error('MCP Traffic Error:', err);
    return null;
  }
}
