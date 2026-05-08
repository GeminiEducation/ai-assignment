// ─── utils/hashFile.ts ────────────────────────────────────────────────────────
// Compute SHA-256 of a File in the browser
export async function getFileHash(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}


// ─── lib/analyzeAssignment.ts ─────────────────────────────────────────────────
// Call the Supabase edge function correctly
import { getFileHash } from "@/utils/hashFile";
import { supabase } from "@/lib/supabaseClient"; // your existing supabase client

export async function analyzeAssignment(file: File, extractedText: string) {
  // Step 1: hash the file IN THE BROWSER
  const fileHash = await getFileHash(file);
  console.log("Sending fileHash:", fileHash.slice(0, 10) + "…");
  console.log("Text length:", extractedText.length);

  // Step 2: call the edge function
  const { data, error } = await supabase.functions.invoke("analyze-assignment", {
    body: {
      fileHash,                // ← string, not the File object
      fileName: file.name,
      text: extractedText,     // ← extracted PDF text string
    },
  });

  if (error) {
    console.error("Edge function error:", error);
    throw new Error(error.message ?? "Analysis failed");
  }

  return data;
}


// ─── Common mistakes that cause the 400 error ─────────────────────────────────
//
// ❌ WRONG — sending the File object directly (it becomes null in JSON)
//    supabase.functions.invoke("analyze-assignment", {
//      body: { file: file, text: extractedText }
//    })
//
// ❌ WRONG — forgetting to await the hash
//    const fileHash = getFileHash(file)   // Promise, not a string!
//
// ❌ WRONG — sending FormData instead of a plain object
//    const form = new FormData()
//    form.append("fileHash", fileHash)
//    supabase.functions.invoke("analyze-assignment", { body: form })
//    // supabase.functions.invoke() expects a plain object, not FormData
//
// ✅ CORRECT — plain object with fileHash as a string
//    supabase.functions.invoke("analyze-assignment", {
//      body: { fileHash, fileName: file.name, text: extractedText }
//    })