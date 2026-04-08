import { v4 as uuidv4 } from 'uuid';

/**
 * Serviço de Enriquecimento de Leads via Apify
 * Utiliza o Google Search Scraper para encontrar dados geográficos públicos.
 */
export async function enrichLead(data: { name: string; email: string; phone?: string }, token: string) {
  if (!token) throw new Error('APIFY_TOKEN is required for enrichment');

  const searchQuery = data.email || data.phone || data.name;
  console.log(`[Enrichment] Iniciando busca via ID Digital: ${searchQuery}`);

  try {
    // 1. Disparar o Actor (apify/google-search-scraper)
    const runResponse = await fetch('https://api.apify.com/v2/acts/apify~google-search-scraper/runs?token=' + token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        queries: `${searchQuery} endereço completo bairro`,
        maxPagesPerQuery: 1,
        resultsPerPage: 10,
        type: 'SEARCH',
        languageCode: 'pt-BR',
        countryCode: 'br'
      })
    });

    const runData = await runResponse.json();

    if (!runResponse.ok) {
      console.error('[Enrichment API Error]', runData);
      throw new Error(`Apify Run failed: ${runData.error?.message || runResponse.statusText}`);
    }

    if (!runData.data || !runData.data.id) {
      throw new Error('Apify Response missing data.id');
    }

    const runId = runData.data.id;
    const defaultDatasetId = runData.data.defaultDatasetId;

    console.log(`[Enrichment] Run ID: ${runId}. Aguardando resultados...`);

    // 2. Polling para aguardar a conclusão (Máximo 30 segundos para teste)
    let finished = false;
    let attempts = 0;
    while (!finished && attempts < 10) {
      await new Promise(r => setTimeout(r, 3000));
      const statusResponse = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${token}`);
      const statusData = await statusResponse.json();
      
      if (!statusResponse.ok || !statusData.data) {
        console.error('[Enrichment Status Error]', statusData);
        throw new Error('Failed to check actor-run status');
      }

      const status = statusData.data.status;
      console.log(`[Enrichment] Status: ${status} (tentativa ${attempts + 1}/10)`);

      if (status === 'SUCCEEDED') {
        finished = true;
      } else if (status === 'FAILED' || status === 'ABORTED' || status === 'TIMED-OUT') {
        throw new Error(`Apify Actor Run ended with status: ${status}`);
      }
      attempts++;
    }

    if (!finished) throw new Error('Timeout aguardando conclusão do Scraper (30s)');

    // 3. Coletar Resultados do Dataset
    console.log(`[Enrichment] Coletando resultados do Dataset: ${defaultDatasetId}`);
    const resultsResponse = await fetch(`https://api.apify.com/v2/datasets/${defaultDatasetId}/items?token=${token}`);
    
    if (!resultsResponse.ok) {
      throw new Error('Failed to fetch dataset items');
    }

    const items = await resultsResponse.json();
    
    // O Google Search Scraper do Apify retorna uma lista de páginas.
    // Os resultados reais do Google estão em items[0].organicResults
    let searchResults = [];
    if (Array.isArray(items) && items[0]?.organicResults) {
      searchResults = items[0].organicResults;
    } else if (Array.isArray(items)) {
      searchResults = items;
    }

    console.log(`[Enrichment] Resultados Orgânicos encontrados: ${searchResults.length}`);
    
    // 4. Heurística de Precisão para extrair Bairro/Cidade dos snippets
    let enrichedData = {
      neighborhood: '',
      city: '',
      state: ''
    };

    for (const item of searchResults) {
      const text = (item.description || item.title || item.snippet || '').toLowerCase();
      
      // 1. Padrão Narrativo (ex: "na cidade Manaus no estado Amazonas")
      const narrativeMatch = text.match(/na cidade\s+([a-z\sãéíóúâêîôûç]{3,})\s+no estado\s+([a-z\sãéíóúâêîôûç]{3,})/i);
      if (narrativeMatch && !enrichedData.city) {
        enrichedData.city = narrativeMatch[1].trim().toUpperCase();
        const stateName = narrativeMatch[2].trim().toUpperCase();
        const stateMap: any = { 'AMAZONAS': 'AM', 'SÃO PAULO': 'SP', 'MINAS GERAIS': 'MG', 'BAHIA': 'BA' };
        if (stateMap[stateName]) enrichedData.state = stateMap[stateName];
        console.log(`[Enrichment] Extraído via Narrativa: ${enrichedData.city}/${enrichedData.state}`);
      }

      // 2. Padrão Estruturado (ex: Serasa/Econodata: "Bairro. Nome · Município. Nome · UF. AM")
      const structuredBairro = text.match(/bairro\s*[:\.]\s*([^·\n,-]+)/i);
      const structuredCity = text.match(/município\s*[:\.]\s*([^·\n,-]+)/i);
      const structuredState = text.match(/uf\s*[:\.]\s*([a-z]{2})\b/i);

      if (structuredBairro && !enrichedData.neighborhood) {
        enrichedData.neighborhood = structuredBairro[1].trim().replace(/\.$/, '').toUpperCase();
        console.log(`[Enrichment] Extraído Bairro: ${enrichedData.neighborhood}`);
      }
      if (structuredCity && !enrichedData.city) {
        enrichedData.city = structuredCity[1].trim().replace(/\.$/, '').toUpperCase();
        console.log(`[Enrichment] Extraído Cidade: ${enrichedData.city}`);
      }
      if (structuredState && !enrichedData.state) {
        enrichedData.state = structuredState[1].trim().toUpperCase();
        console.log(`[Enrichment] Extraído Estado: ${enrichedData.state}`);
      }

      // 3. Padrões de Cidade/UF (Ex: "Manaus/AM", "Manaus - AM", "Manaus, AM")
      const cityStateMatch = text.match(/([a-z\sãéíóúâêîôûç]{3,})\s*[-\/,]\s*([a-z]{2})\b/i);
      if (cityStateMatch && (!enrichedData.city || !enrichedData.state)) {
        const ufs = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];
        const cityCandidate = cityStateMatch[1].trim().toUpperCase();
        const stateCandidate = cityStateMatch[2].trim().toUpperCase();
        if (ufs.includes(stateCandidate)) {
          enrichedData.city = cityCandidate;
          enrichedData.state = stateCandidate;
          console.log(`[Enrichment] Extraído via Cidade/UF: ${enrichedData.city}/${enrichedData.state}`);
        }
      }

      // 4. Localização via Sniper (ex: "Manaus, Amazonas")
      if (text.includes('amazonas') || text.includes('manaus')) {
         if (!enrichedData.city) enrichedData.city = 'MANAUS';
         if (!enrichedData.state) enrichedData.state = 'AM';
      }
    }

    // Limpeza final de ruído
    if (enrichedData.neighborhood?.length < 3) enrichedData.neighborhood = '';
    
    console.log('[Enrichment Results]', enrichedData);
    return enrichedData;
  } catch (error) {
    console.error('[Enrichment Error]', error);
    throw error;
  }
}
