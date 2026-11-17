const { maxDepth, responseFormat, treeMessages } = require('./prompts');

function validateTree(result, limit) {
  if (!Array.isArray(result?.nodes) || result.nodes.length === 0) throw new Error('The AI returned an empty tree.');
  const nodes = [];
  function visit(items, parent, depth) {
    if (items.length && depth > maxDepth) throw new Error('The AI returned a tree deeper than five levels.');
    for (const item of items) {
      if (nodes.length >= limit) throw new Error('The AI returned too many nodes. Try a narrower topic.');
      if (!item || typeof item.label !== 'string' || !item.label.trim() || item.label.length > 120 ||
          !['simple', 'rich', 'symbol'].includes(item.type) || !Array.isArray(item.children)) {
        throw new Error('The AI returned an invalid tree.');
      }
      if (item.type === 'rich' && (typeof item.body !== 'string' || item.body.length > 500)) {
        throw new Error('The AI returned invalid note text.');
      }
      const index = nodes.length;
      nodes.push({ label: item.label.trim(), parent, type: item.type, body: item.body, symbol: item.symbol });
      visit(item.children, index, depth + 1);
    }
  }
  visit(result.nodes, null, 1);
  return nodes;
}

async function generateTree(key, topic, available) {
  if (typeof topic !== 'string' || !topic.trim() || topic.length > 500 ||
      !Number.isInteger(available) || available <= 0) throw new Error('Enter a topic and make sure the map has room for more nodes.');
  const limit = Math.min(available, 60);
  let response;
  try {
    response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        store: false,
        messages: treeMessages(topic.trim(), limit),
        response_format: responseFormat,
        max_completion_tokens: 6000
      }),
      signal: AbortSignal.timeout(90000)
    });
  } catch {
    throw new Error('Could not reach OpenAI or the request timed out. Try again.');
  }
  if (response.status === 401) throw new Error('OpenAI rejected the API key. Update it in Settings.');
  if (response.status === 429) throw new Error('OpenAI reported a rate or quota limit. Check your API account and try again.');
  if (!response.ok) throw new Error('OpenAI could not complete the request (HTTP ' + response.status + ').');
  const choice = (await response.json()).choices?.[0];
  if (choice?.finish_reason !== 'stop' || choice.message?.refusal || !choice.message?.content) {
    throw new Error('The AI did not return a complete tree. Try a narrower topic.');
  }
  return validateTree(JSON.parse(choice.message.content), limit);
}
module.exports = { generateTree, validateTree };
