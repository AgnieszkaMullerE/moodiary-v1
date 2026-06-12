'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

// ── Types ──────────────────────────────────────────────────────────────────

type Section = 'create' | 'ask' | 'read' | 'setup' | 'tools';

type ApiToken = {
  id: string;
  name: string;
  token?: string;
  created_at: string;
  last_used_at: string | null;
};

// ── Shared UI components ───────────────────────────────────────────────────

function MethodBadge({ method }: { method: 'GET' | 'POST' | 'TOOL' }) {
  const colors: Record<string, string> = {
    GET: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
    POST: 'bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-400',
    TOOL: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400',
  };
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-md text-[11px] font-bold font-mono tracking-wider ${colors[method]}`}>
      {method}
    </span>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="bg-gray-50 dark:bg-[#1e1c30] rounded-xl px-4 py-4 text-[12px] font-mono text-gray-700 dark:text-gray-300 overflow-x-auto leading-relaxed whitespace-pre">
      {children}
    </pre>
  );
}

function ParamRow({ name, type, required, description }: {
  name: string; type: string; required: boolean; description: string;
}) {
  return (
    <tr className="border-b border-gray-100 dark:border-gray-800/60 last:border-0">
      <td className="py-2.5 pr-3 align-top">
        <code className="text-[12px] font-mono text-violet-600 dark:text-violet-400">{name}</code>
      </td>
      <td className="py-2.5 pr-3 align-top">
        <code className="text-[11px] font-mono text-gray-400 whitespace-nowrap">{type}</code>
      </td>
      <td className="py-2.5 pr-3 align-top">
        {required
          ? <span className="text-[10px] font-semibold text-rose-500 uppercase tracking-wider">wymagane</span>
          : <span className="text-[10px] font-semibold text-gray-300 dark:text-gray-600 uppercase tracking-wider">opcjonalne</span>}
      </td>
      <td className="py-2.5 align-top text-[12px] text-gray-600 dark:text-gray-400">{description}</td>
    </tr>
  );
}

function SectionLabel({ children }: { children: string }) {
  return <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-gray-400 mb-3">{children}</p>;
}

function AuthBanner() {
  return (
    <div className="mb-6 flex items-start gap-3 bg-violet-50 dark:bg-violet-950/20 border border-violet-100 dark:border-violet-900/40 rounded-xl px-4 py-3">
      <svg className="shrink-0 mt-0.5 text-violet-500" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
        <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
      <p className="text-[12px] text-violet-700 dark:text-violet-300 leading-relaxed">
        Wymagany nagłówek{' '}
        <code className="font-mono bg-violet-100 dark:bg-violet-900/40 px-1 rounded text-[11px]">Authorization: Bearer YOUR_API_KEY</code>
        {' '}lub{' '}
        <code className="font-mono bg-violet-100 dark:bg-violet-900/40 px-1 rounded text-[11px]">X-API-Key: YOUR_API_KEY</code>
      </p>
    </div>
  );
}

// ── API content sections ───────────────────────────────────────────────────

function CreateSection() {
  return (
    <div>
      <div className="flex items-center gap-3 mb-1">
        <MethodBadge method="POST" />
        <code className="text-sm font-mono text-gray-700 dark:text-gray-300">/api/entries</code>
      </div>
      <h2 className="text-2xl font-[family-name:var(--font-display)] font-semibold text-gray-900 dark:text-white mb-1">
        Dodaj wpis do dziennika
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
        Tworzy nowy wpis lub dołącza tekst do istniejącego wpisu dla podanej daty.
        Nastrój jest automatycznie wnioskowany przez AI, chyba że zostanie podany jawnie.
      </p>
      <AuthBanner />
      <div className="space-y-6">
        <div>
          <SectionLabel>Request Body</SectionLabel>
          <table className="w-full text-left">
            <tbody>
              <ParamRow name="content" type="string" required description="Treść wpisu jako plain text." />
              <ParamRow name="date" type="string" required={false} description="Data YYYY-MM-DD. Domyślnie: dzisiaj." />
              <ParamRow name="mood" type="integer (1–5)" required={false} description="1=bardzo źle, 2=źle, 3=neutralnie, 4=dobrze, 5=świetnie. Jeśli nie podano, AI analizuje nastrój." />
            </tbody>
          </table>
        </div>
        <div>
          <SectionLabel>Response</SectionLabel>
          <CodeBlock>{`{ "ok": true, "action": "created" | "updated", "date": "2026-06-12", "mood": "good" }`}</CodeBlock>
        </div>
        <div>
          <SectionLabel>Przykład</SectionLabel>
          <CodeBlock>{`curl -X POST https://your-domain.com/api/entries \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{ "content": "Dziś był spokojny dzień.", "date": "2026-06-12", "mood": 4 }'`}</CodeBlock>
        </div>
      </div>
    </div>
  );
}

function AskSection() {
  return (
    <div>
      <div className="flex items-center gap-3 mb-1">
        <MethodBadge method="POST" />
        <code className="text-sm font-mono text-gray-700 dark:text-gray-300">/api/freud/ask</code>
      </div>
      <h2 className="text-2xl font-[family-name:var(--font-display)] font-semibold text-gray-900 dark:text-white mb-1">
        Zadaj pytanie dr Freudowi
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
        Wysyła pytanie do psychoanalitycznego AI. Opcjonalnie pobiera wpis z danego dnia jako kontekst.
        Każde zapytanie jest niezależne — endpoint nie przechowuje historii rozmowy.
      </p>
      <AuthBanner />
      <div className="space-y-6">
        <div>
          <SectionLabel>Request Body</SectionLabel>
          <table className="w-full text-left">
            <tbody>
              <ParamRow name="question" type="string" required description="Pytanie skierowane do dr Freuda." />
              <ParamRow name="date" type="string" required={false} description="Data wpisu użytego jako kontekst (YYYY-MM-DD). Domyślnie: dzisiaj." />
            </tbody>
          </table>
        </div>
        <div>
          <SectionLabel>Response</SectionLabel>
          <CodeBlock>{`{ "answer": "Sehr interessant... Co kryje się za tym niepokojem?", "date": "2026-06-12" }`}</CodeBlock>
        </div>
        <div>
          <SectionLabel>Przykład</SectionLabel>
          <CodeBlock>{`curl -X POST https://your-domain.com/api/freud/ask \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{ "question": "Dlaczego dziś czuję się nieswojo?", "date": "2026-06-12" }'`}</CodeBlock>
        </div>
      </div>
    </div>
  );
}

function ReadSection() {
  return (
    <div>
      <div className="flex items-center gap-3 mb-1">
        <MethodBadge method="GET" />
        <code className="text-sm font-mono text-gray-700 dark:text-gray-300">
          /api/entries/<span className="text-violet-500">{'{date}'}</span>
        </code>
      </div>
      <h2 className="text-2xl font-[family-name:var(--font-display)] font-semibold text-gray-900 dark:text-white mb-1">
        Pobierz wpis z dnia
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
        Zwraca treść wpisu dla podanej daty jako plain text (bez HTML) wraz z nastrojem.
        Zwraca 404 jeśli dla danej daty nie ma żadnego wpisu.
      </p>
      <AuthBanner />
      <div className="space-y-6">
        <div>
          <SectionLabel>URL Params</SectionLabel>
          <table className="w-full text-left">
            <tbody>
              <ParamRow name="date" type="string" required description="Data w formacie YYYY-MM-DD, np. 2026-06-12." />
            </tbody>
          </table>
        </div>
        <div>
          <SectionLabel>Response</SectionLabel>
          <CodeBlock>{`// 200 OK
{
  "date": "2026-06-12",
  "content": "Dziś był spokojny, produktywny dzień.",
  "mood": "good",
  "moodScore": 4,
  "createdAt": "2026-06-12T10:30:00.000Z"
}

// 404 Not Found
{ "error": "Brak wpisu dla tej daty" }`}</CodeBlock>
        </div>
        <div>
          <SectionLabel>Przykład</SectionLabel>
          <CodeBlock>{`curl https://your-domain.com/api/entries/2026-06-12 \\
  -H "Authorization: Bearer YOUR_API_KEY"`}</CodeBlock>
        </div>
      </div>
    </div>
  );
}

// ── MCP content sections ───────────────────────────────────────────────────

function McpSetupSection() {
  return (
    <div>
      <h2 className="text-2xl font-[family-name:var(--font-display)] font-semibold text-gray-900 dark:text-white mb-1">
        Konfiguracja MCP
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
        MCP pozwala agentom AI (Claude, Cursor, Copilot i innym) korzystać z dziennika
        jako narzędzia — bez potrzeby pisania własnej integracji HTTP.
      </p>

      <div className="space-y-8">
        <div>
          <SectionLabel>Server URL</SectionLabel>
          <CodeBlock>{'https://your-domain.com/api/mcp'}</CodeBlock>
        </div>
        <div>
          <SectionLabel>Claude Desktop</SectionLabel>
          <p className="text-[12px] text-gray-500 dark:text-gray-400 mb-3">
            Dodaj do pliku{' '}
            <code className="font-mono text-[11px] bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">claude_desktop_config.json</code>
            {' '}(macOS:{' '}
            <code className="font-mono text-[11px] bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">~/Library/Application Support/Claude/</code>):
          </p>
          <CodeBlock>{`{
  "mcpServers": {
    "moodiary": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://your-domain.com/api/mcp"],
      "env": {
        "MCP_REMOTE_HEADER_AUTHORIZATION": "Bearer YOUR_API_KEY"
      }
    }
  }
}`}</CodeBlock>
        </div>
        <div>
          <SectionLabel>Cursor / Windsurf / inne klienty MCP</SectionLabel>
          <p className="text-[12px] text-gray-500 dark:text-gray-400 mb-3">
            Klienty obsługujące natywny HTTP transport:
          </p>
          <CodeBlock>{`{
  "mcpServers": {
    "moodiary": {
      "transport": {
        "type": "http",
        "url": "https://your-domain.com/api/mcp"
      },
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY"
      }
    }
  }
}`}</CodeBlock>
        </div>
        <div>
          <SectionLabel>Ręczne testowanie (curl)</SectionLabel>
          <CodeBlock>{`# Handshake – initialize
curl -X POST https://your-domain.com/api/mcp \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{ "jsonrpc": "2.0", "method": "initialize", "params": { "protocolVersion": "2024-11-05", "capabilities": {}, "clientInfo": { "name": "curl", "version": "1.0" } }, "id": 0 }'

# Lista narzędzi
curl -X POST https://your-domain.com/api/mcp \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{ "jsonrpc": "2.0", "method": "tools/list", "id": 1 }'`}</CodeBlock>
        </div>
      </div>
    </div>
  );
}

function McpToolsSection() {
  return (
    <div className="space-y-10">
      {/* add_entry */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <MethodBadge method="TOOL" />
          <code className="text-sm font-mono text-gray-700 dark:text-gray-300">add_entry</code>
        </div>
        <h3 className="text-xl font-[family-name:var(--font-display)] font-semibold text-gray-900 dark:text-white mb-1">
          Dodaj wpis do dziennika
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 leading-relaxed">
          Tworzy nowy wpis lub dołącza tekst do istniejącego. Nastrój jest wnioskowany przez AI, jeśli nie podano.
        </p>
        <div className="space-y-4">
          <div>
            <SectionLabel>Parametry</SectionLabel>
            <table className="w-full text-left">
              <tbody>
                <ParamRow name="content" type="string" required description="Treść wpisu jako plain text." />
                <ParamRow name="date" type="string" required={false} description="Data YYYY-MM-DD. Domyślnie: dzisiaj." />
                <ParamRow name="mood" type="number (1–5)" required={false} description="1=terrible … 5=great. Jeśli nie podano, AI wnioskuje nastrój." />
              </tbody>
            </table>
          </div>
          <div>
            <SectionLabel>Wywołanie MCP (curl)</SectionLabel>
            <CodeBlock>{`curl -X POST https://your-domain.com/api/mcp \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "add_entry",
      "arguments": { "content": "Dziś był spokojny dzień.", "mood": 4 }
    },
    "id": 1
  }'`}</CodeBlock>
          </div>
        </div>
      </div>

      <hr className="border-gray-100 dark:border-gray-800" />

      {/* ask_freud */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <MethodBadge method="TOOL" />
          <code className="text-sm font-mono text-gray-700 dark:text-gray-300">ask_freud</code>
        </div>
        <h3 className="text-xl font-[family-name:var(--font-display)] font-semibold text-gray-900 dark:text-white mb-1">
          Zadaj pytanie dr Freudowi
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 leading-relaxed">
          Wysyła pytanie do psychoanalitycznego AI z opcjonalnym kontekstem wpisu. Odpowiedź zawsze po polsku.
        </p>
        <div className="space-y-4">
          <div>
            <SectionLabel>Parametry</SectionLabel>
            <table className="w-full text-left">
              <tbody>
                <ParamRow name="question" type="string" required description="Pytanie skierowane do dr Freuda." />
                <ParamRow name="date" type="string" required={false} description="Data kontekstu (YYYY-MM-DD). Domyślnie: dzisiaj." />
              </tbody>
            </table>
          </div>
          <div>
            <SectionLabel>Wywołanie MCP (curl)</SectionLabel>
            <CodeBlock>{`curl -X POST https://your-domain.com/api/mcp \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "ask_freud",
      "arguments": { "question": "Dlaczego czuję się nieswojo?", "date": "2026-06-12" }
    },
    "id": 2
  }'`}</CodeBlock>
          </div>
        </div>
      </div>

      <hr className="border-gray-100 dark:border-gray-800" />

      {/* get_entry */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <MethodBadge method="TOOL" />
          <code className="text-sm font-mono text-gray-700 dark:text-gray-300">get_entry</code>
        </div>
        <h3 className="text-xl font-[family-name:var(--font-display)] font-semibold text-gray-900 dark:text-white mb-1">
          Pobierz wpis z dnia
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 leading-relaxed">
          Pobiera treść i nastrój wpisu dla podanej daty. Jeśli nie ma wpisu, zwraca stosowny komunikat.
        </p>
        <div className="space-y-4">
          <div>
            <SectionLabel>Parametry</SectionLabel>
            <table className="w-full text-left">
              <tbody>
                <ParamRow name="date" type="string" required description="Data w formacie YYYY-MM-DD, np. 2026-06-12." />
              </tbody>
            </table>
          </div>
          <div>
            <SectionLabel>Wywołanie MCP (curl)</SectionLabel>
            <CodeBlock>{`curl -X POST https://your-domain.com/api/mcp \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": { "name": "get_entry", "arguments": { "date": "2026-06-12" } },
    "id": 3
  }'`}</CodeBlock>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Token widget ───────────────────────────────────────────────────────────

function maskToken(token: string): string {
  return `${token.slice(0, 7)}${'•'.repeat(12)}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });
}

function TokenWidget({
  user,
  tokens,
  onGenerate,
  onDelete,
  generating,
}: {
  user: User | null | undefined;
  tokens: ApiToken[];
  onGenerate: () => void;
  onDelete: (id: string) => void;
  generating: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const latest = tokens[0];

  const handleCopy = () => {
    if (!latest?.token) return;
    navigator.clipboard.writeText(latest.token).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  if (user === undefined) {
    return <div className="h-4 w-20 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />;
  }

  if (user === null) {
    return (
      <p className="text-[11px] text-gray-400 leading-relaxed">
        <Link href="/login" className="underline hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
          Zaloguj się
        </Link>
        {' '}aby zarządzać tokenami.
      </p>
    );
  }

  return (
    <div>
      <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-gray-400 mb-3">
        Your access token
      </p>

      {latest?.token && (
        <div className="flex items-center gap-1.5 mb-2">
          <code className="flex-1 text-[11px] font-mono text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800/60 rounded-md px-2.5 py-1.5 truncate">
            {maskToken(latest.token)}
          </code>
          <button
            type="button"
            onClick={handleCopy}
            className="shrink-0 p-1.5 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800/60 transition-colors"
            title="Kopiuj token"
          >
            {copied ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none">
                <polyline points="20 6 9 17 4 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none">
                <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={onGenerate}
        disabled={generating}
        className="w-full text-left px-3 py-1.5 text-[12px] font-medium rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors disabled:opacity-50 mb-4"
      >
        {generating ? 'Generowanie…' : '+ Generate token'}
      </button>

      {tokens.length > 0 && (
        <>
          <p className="text-[10px] font-semibold tracking-[0.18em] uppercase text-gray-400 mb-2">
            Active tokens
          </p>
          <div className="space-y-0.5">
            {tokens.map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-1 py-1 group">
                <div className="min-w-0">
                  <p className="text-[11px] text-gray-600 dark:text-gray-300 truncate">{t.name}</p>
                  <p className="text-[10px] text-gray-400">{formatDate(t.created_at)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onDelete(t.id)}
                  className="shrink-0 p-1 rounded text-gray-300 dark:text-gray-600 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 opacity-0 group-hover:opacity-100 transition-all"
                  title="Usuń token"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none">
                    <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                    <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Sidebar nav item ───────────────────────────────────────────────────────

function NavItem({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left px-3 py-1.5 text-[13px] transition-colors rounded-lg ${
        active
          ? 'bg-gray-100 dark:bg-gray-800/60 text-gray-900 dark:text-white font-medium'
          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/30'
      }`}
    >
      {children}
    </button>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function DocsPage() {
  const [section, setSection] = useState<Section>('create');
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [generating, setGenerating] = useState(false);

  const fetchTokens = useCallback(async () => {
    try {
      const res = await fetch('/api/tokens');
      if (res.ok) setTokens(await res.json());
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      setUser(u);
      if (u) fetchTokens();
    });
  }, [fetchTokens]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/tokens', { method: 'POST' });
      if (res.ok) {
        const newToken: ApiToken = await res.json();
        setTokens((prev) => [newToken, ...prev]);
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (id: string) => {
    setTokens((prev) => prev.filter((t) => t.id !== id));
    await fetch(`/api/tokens?id=${id}`, { method: 'DELETE' });
  };

  return (
    <div className="h-full overflow-hidden flex flex-col bg-[#FCFBF9] dark:bg-[#18162a] font-[family-name:var(--font-inter)]">

      {/* Top bar */}
      <div className="shrink-0 flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-gray-800">
        <span className="text-[11px] font-semibold text-gray-400 tracking-widest uppercase">
          mój dzienniczek.
        </span>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-[12px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none">
            <polyline points="15 18 9 12 15 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          back
        </Link>
      </div>

      {/* Body: sidebar + content */}
      <div className="flex-1 overflow-hidden flex">

        {/* Sidebar */}
        <aside className="w-52 md:w-60 shrink-0 overflow-y-auto border-r border-gray-100 dark:border-gray-800 py-5 px-3 space-y-5">

          {/* Token widget */}
          <TokenWidget
            user={user}
            tokens={tokens}
            onGenerate={handleGenerate}
            onDelete={handleDelete}
            generating={generating}
          />

          {/* Divider */}
          <div className="border-t border-gray-100 dark:border-gray-800" />

          {/* API nav */}
          <div>
            <p className="text-[10px] font-semibold tracking-[0.18em] uppercase text-gray-400 px-3 mb-1">API</p>
            <NavItem active={section === 'create'} onClick={() => setSection('create')}>Create entry</NavItem>
            <NavItem active={section === 'ask'} onClick={() => setSection('ask')}>Ask the therapist</NavItem>
            <NavItem active={section === 'read'} onClick={() => setSection('read')}>Read entry</NavItem>
          </div>

          {/* MCP nav */}
          <div>
            <p className="text-[10px] font-semibold tracking-[0.18em] uppercase text-gray-400 px-3 mb-1">MCP</p>
            <NavItem active={section === 'setup'} onClick={() => setSection('setup')}>Setup</NavItem>
            <NavItem active={section === 'tools'} onClick={() => setSection('tools')}>Tools</NavItem>
          </div>
        </aside>

        {/* Content */}
        <main className="flex-1 overflow-y-auto px-6 md:px-10 py-8 max-w-2xl">
          {section === 'create' && <CreateSection />}
          {section === 'ask' && <AskSection />}
          {section === 'read' && <ReadSection />}
          {section === 'setup' && <McpSetupSection />}
          {section === 'tools' && <McpToolsSection />}
        </main>

      </div>
    </div>
  );
}
