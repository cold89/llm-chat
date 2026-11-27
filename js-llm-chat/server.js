// rag-policy.js
import fs from 'node:fs';
import pdfParse from 'pdf-parse';
import dotenv from 'dotenv';
import express from 'express';

import { GoogleGenAI } from '@google/genai';
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

dotenv.config();

const app = express();
app.use(express.json());
app.use(express.static('public'));// Serves index.html from the project root

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const EMBEDDING_MODEL = 'gemini-embedding-001';
const CHAT_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

// 1. Structure-aware chunking with overlap
//Why chunk? Sending a huge document every time is slow and noisy. Smaller chunks let us pull only the parts relevant to the user's question.

async function chunkPolicyText(rawText, { maxChars = 750, overlapChars = 120 } = {}) {
  let chunks;
  let chunkManuallyFlag = false;
  if (chunkManuallyFlag) {
    chunks = chunkPolicyManualText(rawText);
  } else {
    chunks = await chunkPolicyManualJavaScriptPlugin(rawText);
  }
  return chunks;
}

async function chunkPolicyManualJavaScriptPlugin(rawText, { maxChars = 750, overlapChars = 120 } = {}) {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: maxChars,
    chunkOverlap: overlapChars,
  });

  const cleaned = rawText.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  const sectionBlocks = cleaned
    .split(/(?=Section \d+:)/g)
    .map((s) => s.trim())
    .filter(Boolean);

  const chunks = [];
  let chunkIndex = 0;

  for (const block of sectionBlocks) {
    const firstLine = block.split("\n")[0].trim();
    const sectionTitle = /^Section \d+:/.test(firstLine) ? firstLine : "General Policy";

    const parts = await splitter.splitText(block);

    for (const part of parts) {
      const text = part.trim();
      if (!text) continue;

      chunks.push({
        id: `chunk_${chunkIndex++}`,
        sectionTitle,
        text,
      });
    }
  }

  return chunks;
}

function chunkPolicyManualText(rawText, { maxChars = 750, overlapChars = 120 } = {}) {
  const cleaned = rawText.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  const sectionBlocks = cleaned.split(/(?=Section \d+:)/g).map((s) => s.trim()).filter(Boolean);

  const chunks = [];
  let chunkIndex = 0;

  for (const block of sectionBlocks) {
    const firstLine = block.split('\n')[0].trim();
    const sectionTitle = /^Section \d+:/.test(firstLine) ? firstLine : 'General Policy';

    if (block.length <= maxChars) {
      chunks.push({
        id: `chunk_${chunkIndex++}`,
        sectionTitle,
        text: block,
      });
      continue;
    }

    let start = 0;
    while (start < block.length) {//When a long section has to be split in two, hence overlapChars = 120
      const end = Math.min(start + maxChars, block.length);
      const slice = block.slice(start, end).trim();
      if (slice) {
        chunks.push({
          id: `chunk_${chunkIndex++}`,
          sectionTitle,
          text: slice,
        });
      }
      if (end >= block.length) break;
      start = Math.max(0, end - overlapChars);
    }
  }

  return chunks;
}

// 2. Embed chunks or query
async function embedText(text, taskType) {
  const res = await ai.models.embedContent({//we are list of numbers i.e vector co-oridantes representing the meaning of your text not saving in VectorDB
    model: EMBEDDING_MODEL,
    contents: text,
    config: taskType ? { taskType } : undefined,
  });
  return res.embeddings[0].values;
}

function cosineSimilarity(a, b) {//we are doing semantic score search
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB) || 1);
}

// 3. Build in-memory vector index from PDF
export async function buildPolicyIndex(pdfPath = './docs/sample-healthcare-policy.pdf') {
  const buffer = fs.readFileSync(pdfPath);
  const parsed = await pdfParse(buffer);
  const text = parsed.text;

  const chunks = await chunkPolicyText(text);

  const indexedChunks = [];
  for (const chunk of chunks) {
    const embedding = await embedText(chunk.text, 'RETRIEVAL_DOCUMENT');
    indexedChunks.push({ ...chunk, embedding });
  }

  return indexedChunks;
}

// 4. Retrieve top-k chunks and generate a grounded answer
export async function answerPolicyQuestion(
  question,
  indexedChunks,
  topK = 3,
  previousInteractionId = null
) {
  const queryEmbedding = await embedText(question, 'RETRIEVAL_QUERY');

  const ranked = indexedChunks
    .map((item) => ({
      ...item,
      score: cosineSimilarity(queryEmbedding, item.embedding),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  const contextBlock = ranked
    .map(
      (c, idx) =>
        `[${idx + 1}] (${c.sectionTitle} | score: ${c.score.toFixed(3)})\n${c.text}`
    )
    .join('\n\n---\n\n');

  const prompt = `You are a healthcare policy assistant. Answer ONLY using the policy excerpts below.
If the policy excerpts do not contain the answer, respond: "Not found in the provided policy document."
Cite the section title for every factual claim.

Policy Excerpts:
${contextBlock}

User Question: ${question}`;

  const interaction = await ai.interactions.create({
    model: CHAT_MODEL,
    input: prompt,
    ...(previousInteractionId ? { previous_interaction_id: previousInteractionId } : {}),
  });

  return {
    answer: interaction.output_text,
    interactionId: interaction.id,
    sources: ranked.map(({ id, sectionTitle, score }) => ({ id, sectionTitle, score })),
  };
}

const policyIndex = await buildPolicyIndex();

app.post('/api/chat', async (req, res) => {
  try {
    const { message, previousInteractionId } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required.' });
    }

    const result = await answerPolicyQuestion(
      message,
      policyIndex,
      3,
      previousInteractionId
    );

    res.json({
      reply: result.answer,
      interactionId: result.interactionId,
      sources: result.sources,
    });
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ error: err.message || 'Failed to generate response.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
