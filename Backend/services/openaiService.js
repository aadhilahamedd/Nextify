const OpenAI = require('openai');

console.log('========== OPENAI SERVICE LOADED ==========');
console.log('OpenAI module keys:', Object.keys(OpenAI));
console.log('OpenAI constructor:', typeof OpenAI.OpenAI);

const openai = new OpenAI.OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

console.log('responses:', typeof openai.responses);
console.log('responses.create:', typeof openai.responses?.create);

module.exports = openai;