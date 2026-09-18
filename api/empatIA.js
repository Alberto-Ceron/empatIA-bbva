// Vercel serverless function. Configure XAI_API_KEY in the deployment environment.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido.' });

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  const text = String(body.text || '').trim();
  const mode = ['simple', 'voice', 'translate'].includes(body.mode) ? body.mode : 'simple';
  if (!text) return res.status(400).json({ error: 'Comparte un texto para adaptar.' });
  if (text.length > 30000) return res.status(413).json({ error: 'El texto excede el límite del prototipo.' });
  if (!process.env.XAI_API_KEY) return res.status(503).json({ error: 'Falta configurar XAI_API_KEY en el servidor.' });

  const task = {
    simple: 'Explica el texto con lenguaje claro, breve y accionable.',
    voice: 'Redacta una explicación breve, cálida y fácil de escuchar en voz alta.',
    translate: 'Traduce al inglés con contexto financiero, sin traducción literal engañosa.'
  }[mode];

  const instructions = [
    'Eres EmpatIA BBVA, una capa de accesibilidad financiera.',
    task,
    'Preserva cifras, fechas, tasas, condiciones y significado. No inventes información.',
    'Si falta contexto, dilo claramente. No solicites ni reproduzcas datos personales sensibles.',
    'Devuelve únicamente la respuesta para la persona usuaria, en máximo 120 palabras.'
  ].join(' ');

  try {
    const response = await fetch('https://api.x.ai/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + process.env.XAI_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'grok-4.6',
        input: [
          { role: 'system', content: instructions },
          { role: 'user', content: text }
        ]
      })
    });
    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data.error?.message || 'Grok no pudo generar una respuesta.' });
    const output = data.output_text || data.output?.flatMap(item => item.content || []).map(part => part.text || '').join('').trim();
    if (!output) return res.status(502).json({ error: 'Grok no devolvió una respuesta utilizable.' });
    return res.status(200).json({ text: output });
  } catch (error) {
    return res.status(500).json({ error: 'No se pudo conectar con Grok.' });
  }
}
