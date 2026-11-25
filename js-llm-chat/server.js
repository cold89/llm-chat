import express from 'express';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
app.use(express.json());
app.use(express.static('public'));

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

app.post('/api/chat', async (req, res) => {
  try {
    const { message, previousInteractionId } = req.body;

    const interaction = await ai.interactions.create({
      model: 'gemini-3.8-flash',
      input: message,
      ...(previousInteractionId ? { previous_interaction_id: previousInteractionId } : {}),
    });

    res.json({
      reply: interaction.output_text,
      interactionId: interaction.id,
    });
  } catch (error) {
    console.error('LLM Error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate response' });
  }
});

app.listen(3000, () => {
  console.log('Chatbox running at http://localhost:3000');
});