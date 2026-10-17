const config = require('../../config/whatsappConfig');

const GRAPH_URL = `https://graph.facebook.com/${config.apiVersion}`;

async function graphPost(path, payload) {
  if (!config.configured) {
    console.warn('[whatsapp] Skipping send — WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID is missing');
    return null;
  }

  const response = await fetch(`${GRAPH_URL}/${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error('[whatsapp] Graph API error', response.status, data?.error?.message || data?.message);
    const err = new Error(data?.error?.message || 'WhatsApp send failed');
    err.statusCode = 502;
    throw err;
  }
  return data;
}

async function sendText(to, body) {
  return graphPost(`${config.phoneNumberId}/messages`, {
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: { preview_url: true, body },
  });
}

async function sendButtons(to, body, buttons) {
  return graphPost(`${config.phoneNumberId}/messages`, {
    messaging_product: 'whatsapp',
    to,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: body },
      action: {
        buttons: buttons.slice(0, 3).map((btn) => ({
          type: 'reply',
          reply: { id: btn.id, title: String(btn.title).slice(0, 20) },
        })),
      },
    },
  });
}

async function sendList(to, body, buttonLabel, rows, sectionTitle = 'Options') {
  return graphPost(`${config.phoneNumberId}/messages`, {
    messaging_product: 'whatsapp',
    to,
    type: 'interactive',
    interactive: {
      type: 'list',
      body: { text: body },
      action: {
        button: String(buttonLabel).slice(0, 20),
        sections: [
          {
            title: String(sectionTitle).slice(0, 24),
            rows: rows.slice(0, 10).map((row) => ({
              id: row.id,
              title: String(row.title).slice(0, 24),
              description: row.description ? String(row.description).slice(0, 72) : undefined,
            })),
          },
        ],
      },
    },
  });
}

function extractIncomingMessages(payload) {
  const messages = [];
  for (const entry of payload?.entry || []) {
    for (const change of entry.changes || []) {
      const value = change.value || {};
      if (value.statuses) continue;
      for (const message of value.messages || []) {
        const contact = (value.contacts || []).find((c) => c.wa_id === message.from) || {};
        messages.push({
          from: message.from,
          name: contact.profile?.name || '',
          type: message.type,
          text: message.text?.body || '',
          buttonId: message.interactive?.button_reply?.id || message.interactive?.list_reply?.id || '',
          buttonTitle:
            message.interactive?.button_reply?.title || message.interactive?.list_reply?.title || '',
        });
      }
    }
  }
  return messages;
}

module.exports = {
  sendText,
  sendButtons,
  sendList,
  extractIncomingMessages,
};
