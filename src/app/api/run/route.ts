import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const JUDGE0_URL = "https://ce.judge0.com";

/** Map of language names (as used in code fences) → Judge0 CE language IDs. */
const LANGUAGE_MAP: Record<string, number> = {
  python: 71,
  python3: 71,
  py: 71,
  javascript: 63,
  js: 63,
  node: 63,
  typescript: 74,
  ts: 74,
  tsx: 74,
  jsx: 63,
  c: 103,
  "c99": 103,
  cpp: 105,
  "c++": 105,
  cpp17: 105,
  "cpp14": 105,
  java: 91,
  go: 60,
  golang: 60,
  rust: 73,
  rs: 73,
  ruby: 72,
  rb: 72,
  php: 68,
  swift: 83,
  kotlin: 78,
  kt: 78,
  scala: 81,
  lua: 64,
  bash: 46,
  sh: 46,
  shell: 46,
  sql: 82,
  dart: 48,
  elixir: 57,
  clojure: 86,
  haskell: 61,
  hs: 61,
  perl: 85,
  r: 80,
  "racket": 84,
  "f#": 93,
  "c#": 51,
  csharp: 51,
  cs: 51,
  "objective-c": 84,
  "assembly": 45,
  nasm: 45,
  "fortran": 66,
  zig: 110,
  "nim": 96,
  "crystal": 97,
  "vb.net": 101,
};

interface RunRequest {
  code: string;
  language: string;
  input?: string;
}

interface Judge0Response {
  stdout: string | null;
  stderr: string | null;
  compile_output: string | null;
  message: string | null;
  time: string | null;
  memory: number | null;
  status: { id: number; description: string } | null;
  token?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as RunRequest;
    const { code, language, input } = body;
    if (!code || !language) {
      return NextResponse.json(
        { error: "code and language are required" },
        { status: 400 }
      );
    }
    const languageId = LANGUAGE_MAP[language.toLowerCase()];
    if (!languageId) {
      return NextResponse.json(
        {
          error: `Unsupported language: "${language}". Supported: ${Object.keys(LANGUAGE_MAP).join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Submit to Judge0 CE with wait=true for synchronous result.
    // Use base64 encoding to avoid UTF-8 conversion issues.
    const encodedCode = Buffer.from(code).toString("base64");
    const encodedInput = Buffer.from(input || "").toString("base64");
    const submissionRes = await fetch(
      `${JUDGE0_URL}/submissions/?base64_encoded=true&wait=true&fields=stdout,stderr,compile_output,message,time,memory,status,token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_code: encodedCode,
          language_id: languageId,
          stdin: encodedInput,
        }),
      }
    );

    if (!submissionRes.ok) {
      const text = await submissionRes.text();
      return NextResponse.json(
        { error: `Judge0 error: ${submissionRes.status} ${text}` },
        { status: 502 }
      );
    }

    const result = (await submissionRes.json()) as Judge0Response;
    // Decode base64-encoded output fields
    const decode = (s: string | null): string | null => {
      if (!s) return null;
      try {
        return Buffer.from(s, "base64").toString("utf8");
      } catch {
        return s;
      }
    };
    return NextResponse.json({
      stdout: decode(result.stdout),
      stderr: decode(result.stderr),
      compileOutput: decode(result.compile_output),
      message: decode(result.message),
      time: result.time,
      memory: result.memory,
      status: result.status,
    });
  } catch (e) {
    return NextResponse.json(
      { error: `Request failed: ${(e as Error).message}` },
      { status: 500 }
    );
  }
}

/** Export the language map for client-side use (language detection). */
export { LANGUAGE_MAP };
