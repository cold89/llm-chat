import express from 'express';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
app.use(express.json());
app.use(express.static('public'));

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    apiVersion: 'v1beta',
  }
 });

const DOC_PATH = './docs/sample-healthcare-policy.pdf';

let docURI = null;
let docMimeType = null;
let uploadPromise = null;

async function getDocument(forceRefresh = false) {
  if (!forceRefresh && docURI && docMimeType) {
    return { uri: docURI, mimeType: docMimeType };
  }

  if (!forceRefresh && uploadPromise) {
    return uploadPromise;
  }

  uploadPromise = (async () => {
    const uploaded = await ai.files.upload({
      file: DOC_PATH,
      config: { mimeType: 'application/pdf' },
    });

    docURI = uploaded.uri;
    docMimeType = uploaded.mime_type || 'application/pdf';

    console.log('Uploaded document:', { docURI, docMimeType });
    return { uri: docURI, mimeType: docMimeType };
  })();

  try {
    return await uploadPromise;
  } finally {
    uploadPromise = null;
  }
}

async function askWithDocument(message, previousInteractionId, doc) {
  return ai.interactions.create({
    model: 'gemini-3.8-flash',
    input: [
      {
        type: 'document',
        uri: doc.uri,
        mime_type: doc.mimeType,
      },
      {
        type: 'text',
        text: `Analyze the attached document carefully to answer the user's question. If something is not in the document, say so clearly.\n\nUser question: ${message}`,
      },
    ],
    ...(previousInteractionId ? { previous_interaction_id: previousInteractionId } : {}),
  });
}

app.post('/api/chat', async (req, res) => {
  try {
    const { message, previousInteractionId } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    let doc = await getDocument(false);

    try {
      const interaction = await askWithDocument(message, previousInteractionId, doc);
      return res.json({
        reply: interaction.output_text,
        interactionId: interaction.id,
      });
    } catch (firstError) {
      console.warn('First attempt failed, refreshing document upload:', firstError.message);
      docURI = null;
      docMimeType = null;
      doc = await getDocument(true);

      const retryInteraction = await askWithDocument(message, previousInteractionId, doc);
      return res.json({
        reply: retryInteraction.output_text,
        interactionId: retryInteraction.id,
      });
    }
  } catch (error) {
    console.error('LLM Error:', error);
    if (error.cause) console.error('Cause:', error.cause);
    res.status(500).json({ error: error.message || 'Failed to generate response' });
  }
});

app.listen(3000, async () => {
  console.log('Chatbox running at http://localhost:3000');
  try {
    await getDocument(false);
  } catch (err) {
    console.error('Startup upload error:', err);
  }
});