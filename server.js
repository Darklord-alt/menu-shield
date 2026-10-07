'use strict';

var fs = require('fs');
var http = require('http');
var path = require('path');

var PORT = Number(process.env.PORT || 3000);
var ROOT = __dirname;
var PUBLIC_DIR = path.join(ROOT, 'public');
var MAX_BODY_BYTES = 12 * 1024 * 1024;
var MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp'
};

function loadLocalEnv() {
  var envPath = path.join(ROOT, '.env');
  if (!fs.existsSync(envPath)) return;
  fs.readFileSync(envPath, 'utf8').split(/\r?\n/).forEach(function (line) {
    var match = line.match(/^\s*(?:export\s+)?([A-Z][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match || process.env[match[1]] !== undefined) return;
    var value = match[2].replace(/^(['"])(.*)\1$/, '$2');
    process.env[match[1]] = value;
  });
}

loadLocalEnv();

function send(response, status, body, contentType) {
  response.writeHead(status, {
    'Content-Type': contentType || 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'same-origin'
  });
  response.end(typeof body === 'string' ? body : JSON.stringify(body));
}

function json(response, status, payload) {
  send(response, status, payload);
}

function readJson(request) {
  return new Promise(function (resolve, reject) {
    var received = 0;
    var parts = [];
    request.on('data', function (part) {
      received += part.length;
      if (received > MAX_BODY_BYTES) {
        reject(new Error('The image is too large. Choose a menu image smaller than 8 MB.'));
        request.destroy();
        return;
      }
      parts.push(part);
    });
    request.on('end', function () {
      try {
        resolve(JSON.parse(Buffer.concat(parts).toString('utf8')));
      } catch (error) {
        reject(new Error('The request could not be read. Please try again.'));
      }
    });
    request.on('error', reject);
  });
}

function cleanAllergens(values) {
  if (!Array.isArray(values)) return [];
  return values.map(function (value) {
    return String(value || '').trim().toLowerCase();
  }).filter(function (value, index, list) {
    return value && value.length <= 80 && list.indexOf(value) === index;
  }).slice(0, 20);
}

function validDataUrl(value) {
  return typeof value === 'string' && /^data:image\/(png|jpe?g|webp);base64,/i.test(value);
}

function schema() {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['menu_title', 'dishes', 'limitations'],
    properties: {
      menu_title: { type: 'string' },
      limitations: { type: 'string' },
      dishes: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['name', 'description', 'matches', 'uncertainty'],
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            uncertainty: { type: 'string', enum: ['low', 'medium', 'high'] },
            matches: {
              type: 'array',
              items: {
                type: 'object',
                additionalProperties: false,
                required: ['allergen', 'evidence', 'risk'],
                properties: {
                  allergen: { type: 'string' },
                  evidence: { type: 'string' },
                  risk: { type: 'string', enum: ['likely', 'possible', 'not_listed'] }
                }
              }
            }
          }
        }
      }
    }
  };
}

function extractionPrompt(allergens) {
  return [
    'You are reading a restaurant menu to help a diner screen dishes against stated allergens.',
    'Return only the requested JSON schema. Do not provide medical advice or claim any dish is safe.',
    'The diner wants to avoid these allergens: ' + allergens.join(', ') + '.',
    'Extract every readable dish. For each requested allergen, include a match only when the menu text supports a likely or possible match.',
    'Use likely for an explicitly named ingredient or standard component strongly identified by the dish text.',
    'Use possible when the dish text reasonably suggests the ingredient but is ambiguous. Never infer undisclosed ingredients as fact.',
    'In evidence, quote or paraphrase the exact menu wording that led to the result. In limitations, explain that recipes, substitutions, and cross-contact must be confirmed with staff.'
  ].join(' ');
}

function nvidiaExtractionPrompt(allergens) {
  return extractionPrompt(allergens) + ' Return exactly one valid JSON object with no Markdown, code fences, or commentary. It must match this JSON Schema: ' + JSON.stringify(schema());
}

function extractOutputText(responsePayload) {
  if (typeof responsePayload.output_text === 'string') return responsePayload.output_text;
  var output = Array.isArray(responsePayload.output) ? responsePayload.output : [];
  var parts = [];
  output.forEach(function (item) {
    (item.content || []).forEach(function (content) {
      if (content.type === 'output_text' && typeof content.text === 'string') parts.push(content.text);
    });
  });
  return parts.join('\n');
}

function configuredProvider() {
  if (process.env.NVIDIA_API_KEY) return 'nvidia';
  if (process.env.OPENAI_API_KEY) return 'openai';
  return null;
}

function parseAnalysis(text) {
  var cleaned = String(text || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  return JSON.parse(cleaned);
}

async function analyzeWithOpenAI(image, allergens) {
  var apiResponse = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + process.env.OPENAI_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-5-mini',
      store: false,
      input: [{
        role: 'user',
        content: [
          { type: 'input_text', text: extractionPrompt(allergens) },
          { type: 'input_image', image_url: image, detail: 'high' }
        ]
      }],
      text: {
        format: {
          type: 'json_schema',
          name: 'menu_allergen_screen',
          strict: true,
          schema: schema()
        }
      }
    })
  });

  var responseText = await apiResponse.text();
  if (!apiResponse.ok) {
    var apiError = new Error('The analysis service could not complete the scan. ' + responseText.slice(0, 300));
    apiError.status = apiResponse.status;
    throw apiError;
  }

  return parseAnalysis(extractOutputText(JSON.parse(responseText)));
}

async function analyzeWithNvidia(image, allergens) {
  var apiResponse = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + process.env.NVIDIA_API_KEY,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      model: process.env.NVIDIA_MODEL || 'meta/llama-3.2-90b-vision-instruct',
      temperature: 0.1,
      max_tokens: 2400,
      stream: false,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: nvidiaExtractionPrompt(allergens) },
          { type: 'image_url', image_url: { url: image } }
        ]
      }]
    })
  });

  var responseText = await apiResponse.text();
  if (!apiResponse.ok) {
    var apiError = new Error('The analysis service could not complete the scan. ' + responseText.slice(0, 300));
    apiError.status = apiResponse.status;
    throw apiError;
  }

  var payload = JSON.parse(responseText);
  var content = payload.choices && payload.choices[0] && payload.choices[0].message && payload.choices[0].message.content;
  return parseAnalysis(content);
}

async function analyzeMenu(image, allergens) {
  var provider = configuredProvider();
  if (!provider) {
    var missingKey = new Error('Menu Shield needs an OpenAI or NVIDIA API key in its local environment before it can analyze a photo.');
    missingKey.status = 503;
    throw missingKey;
  }

  try {
    return provider === 'nvidia' ? await analyzeWithNvidia(image, allergens) : await analyzeWithOpenAI(image, allergens);
  } catch (error) {
    if (error.status) throw error;
    var outputError = new Error('The analysis returned an unreadable result. Please retry with a clearer image.');
    outputError.status = 502;
    throw outputError;
  }
}

function serveStatic(request, response) {
  var requestPath = request.url === '/' ? '/index.html' : request.url.split('?')[0];
  var filename = path.resolve(PUBLIC_DIR, '.' + requestPath);
  if (!filename.startsWith(PUBLIC_DIR + path.sep)) {
    send(response, 403, 'Forbidden', 'text/plain; charset=utf-8');
    return;
  }
  fs.stat(filename, function (statError, stat) {
    if (statError || !stat.isFile()) {
      send(response, 404, 'Not found', 'text/plain; charset=utf-8');
      return;
    }
    response.writeHead(200, {
      'Content-Type': MIME_TYPES[path.extname(filename).toLowerCase()] || 'application/octet-stream',
      'X-Content-Type-Options': 'nosniff'
    });
    fs.createReadStream(filename).pipe(response);
  });
}

function createServer() {
  return http.createServer(async function (request, response) {
    if (request.method === 'GET' && request.url === '/api/health') {
      json(response, 200, { configured: Boolean(configuredProvider()), provider: configuredProvider() });
      return;
    }
    if (request.method === 'POST' && request.url === '/api/analyze') {
      try {
        var input = await readJson(request);
        var allergens = cleanAllergens(input.allergens);
        if (!validDataUrl(input.image)) {
          json(response, 400, { error: 'Please upload a PNG, JPG, or WebP menu image.' });
          return;
        }
        if (!allergens.length) {
          json(response, 400, { error: 'Add at least one allergen before scanning.' });
          return;
        }
        json(response, 200, await analyzeMenu(input.image, allergens));
      } catch (error) {
        json(response, error.status || 500, { error: error.message || 'Something went wrong while scanning the menu.' });
      }
      return;
    }
    serveStatic(request, response);
  });
}

if (require.main === module) {
  createServer().listen(PORT, '127.0.0.1', function () {
    console.log('Menu Shield is running at http://127.0.0.1:' + PORT);
  });
}

module.exports = { createServer: createServer };
