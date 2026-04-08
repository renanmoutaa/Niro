const APIFY_TOKEN = process.env.APIFY_TOKEN; // Usar variável de ambiente
const name = 'ABRAAO DE BRAGA CARVALHO';

async function test() {
  console.log(`Buscando dados para: ${name}`);
  
  const runResponse = await fetch('https://api.apify.com/v2/acts/apify~google-search-scraper/runs?token=' + APIFY_TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      queries: `${name} endereço completo bairro`,
      maxPagesPerQuery: 1,
      resultsPerPage: 10,
      type: 'SEARCH',
      languageCode: 'pt-BR',
      countryCode: 'br'
    })
  });

  const runData = await runResponse.json();
  const runId = runData.data.id;
  const defaultDatasetId = runData.data.defaultDatasetId;

  console.log(`Run ID: ${runId}. Aguardando 15s...`);
  await new Promise(r => setTimeout(r, 15000));

  const resultsResponse = await fetch(`https://api.apify.com/v2/datasets/${defaultDatasetId}/items?token=${APIFY_TOKEN}`);
  const items = await resultsResponse.json();

  const fs = require('fs');
  fs.writeFileSync('c:/Users/Usuário/Documents/Leads/niro/apps/api/debug_apify_results.json', JSON.stringify(items, null, 2));
  console.log(`Sucesso! ${items.length} itens salvos em debug_apify_results.json`);
}

test().catch(console.error);
