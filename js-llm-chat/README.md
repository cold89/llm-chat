Extends the chat workflow so developers or users can query content stored inside a local PDF file.

* **What the code does:**
  * Reads a local PDF file from disk or file input (e.g., using `[pdf-parse / pdfjs-dist / LangChain]`).
  * Extracts and normalizes text from PDF pages.
  * Injects the extracted PDF text into the LLM prompt/context so answers are grounded in the document.
* **Key files to inspect:** `[e.g., src/pdfReader.js / src/chatWithPdf.js]`
* User asks a question $\rightarrow$ System retrieves matching chunks from your PDF $\rightarrow$ LLM generates an answer.

## Healthcare Policy RAG Pipeline Architecture

A Retrieval-Augmented Generation (RAG) pipeline for healthcare policy PDFs breaks policy documents into structured chunks, indexes their vector embeddings with metadata, and retrieves the most relevant clauses before generating an answer. This prevents context bloat, preserves clause traceability, and helps catch missing coverage rules.

### 1. PDF Parsing & Structural Extraction

Healthcare policies rely on headings, numbered clauses, exclusions, and benefit tables. Naive plain-text extraction often jumbles multi-column layouts or separates a table row from its column header.

* **Preserve document structure:** Extract text block-by-block while tracking page numbers, section titles, and clause numbers.
* **Handle tables intentionally:** Convert coverage tables (such as deductibles, copays, or waiting periods) into structured Markdown or key-value rows so row labels stay tied to their limits.
* **Detect scanned PDFs:** Run OCR only on pages that lack an embedded text layer, and flag low-confidence pages for review.

### 2. Chunking Strategy for Policy Documents

Chunking determines whether the retriever pulls a complete rule or a severed sentence.

* **Structure-first splitting:** Split along policy headings, numbered sections, and subsections first rather than cutting blindly at fixed character counts.
* **Size and overlap bounds:** Keep most chunks around `300–700` tokens with `10–15%` overlap (around `50–80` tokens) so context carries across split paragraphs without flooding the prompt.
* **Keep exclusions with benefits:** In healthcare policies, an inclusion right next to an exclusion or waiting period must stay together or share parent section metadata—otherwise a user gets half the rule.
* **Attach rich metadata to every chunk:** Store `doc_id`, `policy_name`, `section_title`, `clause_id`, `page_number`, and `effective_date` alongside the chunk text.

### 3. Embedding & Vector Indexing

Embeddings map semantic meaning into dense numeric vectors so queries like *"Is physiotherapy covered after surgery?"* match clauses about *"rehabilitative therapy"* or *"post-operative care"* even without exact keyword overlap.

* **Match embedding model to domain and language:** Use a consistent embedding model across ingestion and query time; if you change models later, re-index the collection so vector spaces never mix.
* **Normalize text cleanly:** Strip repeated running headers/footers and page numbers before embedding so boilerplate does not skew similarity scores.
* **Index vectors + metadata filters:** Store vectors in a vector database or index supporting metadata filtering (for example, filtering by `doc_id` or `policy_version` before or during similarity search).

### 4. Retrieval, Grounding & Generation

Retrieval fetches candidate chunks; the generator synthesizes an answer strictly from those chunks.

* **Top-k retrieval + score inspection:** Retrieve the top `4–8` chunks per query using cosine or dot-product similarity. Consider combining semantic search with hybrid search when exact clause numbers or medical terms matter.
* **Strict context-only prompting:** Pass only retrieved chunks with their section/page tags into the prompt, and instruct the model to cite sources and state clearly when the retrieved text does not answer the question.
* **Return citations with every claim:** Include `section_title` and `page_number` in the API response so users or reviewers can verify the exact policy text.

### 5. Evaluation & Failure Checks

Before scaling up, test the pipeline against a small benchmark of policy questions:

1. **Direct coverage questions:** Verify exact limits, waiting periods, and copays.
2. **Exception & exclusion traps:** Test questions where a general benefit has a specific carve-out.
3. **Out-of-scope / unstated rules:** Confirm the system says *"not found in the policy"* instead of inventing an answer.
4. **Retrieval vs. generation split:** Measure whether failures come from **retrieval** (wrong chunk returned) or **generation** (right chunk returned, wrong answer written).

### Code understanding 
1. **Setup & Imports (load keys and tools)**

2. **Chunking (cut the PDF text into smaller pieces with overlap)**

3. **Embeddings & Similarity Search (turn text into number lists called vectors and find the closest matches to a question)**

4. **Answering with Grounding (send only the top matching pieces to Gemini and ask it to answer using those pieces)**
###### TO Check task_type 
ai.models.embedContent({
  config:"RETRIEVAL_QUERY / RETRIEVAL_DOCUMENT"
})

Why the model treats a question differently from a document chunk
Questions and document passages are shaped differently:

A user question (RETRIEVAL_QUERY) is usually short, phrased as a question or keyword search, and missing the surrounding context—like "what is Pre-Existing Diseases ?".

A document chunk (RETRIEVAL_DOCUMENT) is a longer passage or statement containing facts, rules, or explanations—like "Pre-Existing Diseases (PED): Conditions diagnosed or treated within 36 months...".

Because the model knows which role each text plays, it places queries and document chunks into the shared vector space so a question vector lands close to the document chunk vector that answers it, rather than just matching identical words

### Decide Which chunkPolicy
You have two main routes depending on whether you want Google's managed service to handle chunking automatically or a JavaScript library to split the text cleanly inside your own code

1. **You upload your PDF directly to a File Search store via ai.fileSearchStores.uploadToFileSearchStore(...). Google automatically parses the PDF, chunks it, generates embeddings, and indexes it**

2. **@langchain/textsplitters (RecursiveCharacterTextSplitter): The most widely used splitter in JS/TS. You pass chunkSize and chunkOverlap, and it automatically tries to split along paragraphs (\n\n), then newlines (\n), then sentences/spaces so words don't get chopped in half.**

Your project is a RAG (Retrieval-Augmented Generation) pipeline because it follows the core RAG pattern: retrieve relevant external information from your knowledge source (a PDF) and augment the model's prompt with that retrieved context before generating an answer.A VectorDB and an MCP (Model Context Protocol) server are helpful integrations, not prerequisites for RAG.Why Your Code Is Already RAGIn server.js, you have all three stages of RAG:Chunking & Indexing: Parses ./docs/sample-healthcare-policy.pdf, splits it into overlapping chunks, embeds each chunk with gemini-embedding-001 (RETRIEVAL_DOCUMENT), and stores them in an in-memory array (indexedChunks)Retrieval: Embeds the user's question (RETRIEVAL_QUERY) and uses cosineSimilarity to pick the top matching chunks (topK)Augmented Generation: Injects those matched policy chunks into contextBlock inside the prompt sent to the model so it answers grounded in your document instead of guessing   Why You Don't Need a VectorDB or MCP Server HereIn-memory array vs. VectorDB: A VectorDB (like Pinecone, Qdrant, or pgvector) simply stores vectors and performs similarity search at scale or across restarts. Your indexedChunks array is an in-memory vector index—completely valid for prototyping, small documents, or demos, though it rebuilds on server restart and doesn't scale to millions of chunks like a dedicated database.Direct code vs. MCP: MCP is a standard protocol for connecting AI models/agents to external tools or data sources over a client–server interface. Since your Node.js server reads the PDF, computes similarity, and builds the prompt directly in code, you don't need MCP unless you want to expose those capabilities as external MCP tools.