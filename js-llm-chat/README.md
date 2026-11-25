Extends the chat workflow so developers or users can query content stored inside a local PDF file.

* **What the code does:**
  * Reads a local PDF file from disk or file input (e.g., using `[pdf-parse / pdfjs-dist / LangChain]`).
  * Extracts and normalizes text from PDF pages.
  * Injects the extracted PDF text into the LLM prompt/context so answers are grounded in the document.
* **Key files to inspect:** `[e.g., src/pdfReader.js / src/chatWithPdf.js]`
