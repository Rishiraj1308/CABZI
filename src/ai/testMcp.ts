import { searchPlace, getRoute } from './mcpClient';

async function runExample() {
  const places = await searchPlace('restaurant near me');
  console.log('Search results:', places);

  const route = await getRoute('Times Square, NY', 'Central Park, NY');
  console.log('Route:', route);
}

runExample();
