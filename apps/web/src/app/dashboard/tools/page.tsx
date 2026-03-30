"use client";

import { useState } from "react";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type ToolTab = "llms-txt" | "schema";

type SchemaType = "Article" | "FAQPage" | "HowTo" | "WebPage";

// ---------------------------------------------------------------------------
// Copy Button
// ---------------------------------------------------------------------------
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for non-secure contexts
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-2 border border-border bg-bg-secondary px-4 py-2 text-body-sm font-medium text-text-primary transition-colors hover:bg-bg-tertiary"
    >
      {copied ? (
        <>
          <svg className="h-4 w-4 text-success" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
          Copied
        </>
      ) : (
        <>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
          </svg>
          Copy
        </>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Download Button
// ---------------------------------------------------------------------------
function DownloadButton({ content, filename }: { content: string; filename: string }) {
  function handleDownload() {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <button
      onClick={handleDownload}
      className="inline-flex items-center gap-2 border border-border bg-bg-secondary px-4 py-2 text-body-sm font-medium text-text-primary transition-colors hover:bg-bg-tertiary"
    >
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
      </svg>
      Download
    </button>
  );
}

// ---------------------------------------------------------------------------
// Spinner
// ---------------------------------------------------------------------------
function Spinner() {
  return (
    <svg className="h-5 w-5 animate-spin text-text-inverse" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// /llms.txt Generator Form
// ---------------------------------------------------------------------------
function LlmsTxtGenerator() {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [pagesFound, setPagesFound] = useState<number | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setPagesFound(null);

    try {
      const res = await fetch("/api/v1/generate/llms-txt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: url.trim(),
          ...(title.trim() && { title: title.trim() }),
          ...(description.trim() && { description: description.trim() }),
        }),
      });

      const body = await res.json();

      if (!res.ok) {
        throw new Error(body?.error?.message || `Generation failed (${res.status})`);
      }

      setResult(body.data.content);
      setPagesFound(body.data.pagesDiscovered ?? null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="llms-url" className="mb-1.5 block text-body-sm font-medium text-text-primary">
            Website URL
          </label>
          <input
            id="llms-url"
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            required
            className="w-full border border-border bg-bg-secondary px-4 py-3 text-body text-text-primary placeholder-text-tertiary outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
          <p className="mt-1 text-caption text-text-tertiary">
            We will crawl the homepage and sitemap to discover pages automatically.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="llms-title" className="mb-1.5 block text-body-sm font-medium text-text-primary">
              Site Title <span className="text-text-tertiary">(optional)</span>
            </label>
            <input
              id="llms-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Auto-detected from site"
              className="w-full border border-border bg-bg-secondary px-4 py-3 text-body text-text-primary placeholder-text-tertiary outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </div>
          <div>
            <label htmlFor="llms-desc" className="mb-1.5 block text-body-sm font-medium text-text-primary">
              Description <span className="text-text-tertiary">(optional)</span>
            </label>
            <input
              id="llms-desc"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Auto-detected from meta tags"
              className="w-full border border-border bg-bg-secondary px-4 py-3 text-body text-text-primary placeholder-text-tertiary outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !url.trim()}
          className="btn-primary w-full disabled:opacity-50"
        >
          {loading ? <Spinner /> : "Generate /llms.txt"}
        </button>
      </form>

      {error && (
        <div className="mt-6 border border-error/30 bg-error/10 px-5 py-4 text-body-sm text-error">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-6 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-body-sm font-medium text-text-primary">Generated llms.txt</span>
              {pagesFound !== null && (
                <span className="border border-border bg-bg-tertiary px-2 py-0.5 text-tiny text-text-tertiary">
                  {pagesFound} pages discovered
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <CopyButton text={result} />
              <DownloadButton content={result} filename="llms.txt" />
            </div>
          </div>
          <div className="overflow-hidden border border-border bg-bg-secondary">
            <pre className="overflow-x-auto p-5 text-body-sm leading-relaxed text-text-secondary font-mono">
              <code>{result}</code>
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Schema.org Generator Form
// ---------------------------------------------------------------------------
function SchemaGenerator() {
  const [url, setUrl] = useState("");
  const [schemaType, setSchemaType] = useState<SchemaType>("Article");
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [datePublished, setDatePublished] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [autoFilled, setAutoFilled] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setAutoFilled(null);

    try {
      const res = await fetch("/api/v1/generate/schema", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: url.trim(),
          type: schemaType,
          ...(title.trim() && { title: title.trim() }),
          ...(author.trim() && { author: author.trim() }),
          ...(datePublished.trim() && { datePublished: datePublished.trim() }),
          ...(description.trim() && { description: description.trim() }),
        }),
      });

      const body = await res.json();

      if (!res.ok) {
        throw new Error(body?.error?.message || `Generation failed (${res.status})`);
      }

      setResult(body.data.markup);
      setAutoFilled(body.data.autoFilledFrom);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="schema-url" className="mb-1.5 block text-body-sm font-medium text-text-primary">
              Page URL
            </label>
            <input
              id="schema-url"
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/blog/my-post"
              required
              className="w-full border border-border bg-bg-secondary px-4 py-3 text-body text-text-primary placeholder-text-tertiary outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </div>
          <div>
            <label htmlFor="schema-type" className="mb-1.5 block text-body-sm font-medium text-text-primary">
              Schema Type
            </label>
            <select
              id="schema-type"
              value={schemaType}
              onChange={(e) => setSchemaType(e.target.value as SchemaType)}
              className="w-full border border-border bg-bg-secondary px-4 py-3 text-body text-text-primary outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/20"
            >
              <option value="Article">Article</option>
              <option value="FAQPage">FAQPage</option>
              <option value="HowTo">HowTo</option>
              <option value="WebPage">WebPage</option>
            </select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="schema-title" className="mb-1.5 block text-body-sm font-medium text-text-primary">
              Title <span className="text-text-tertiary">(optional)</span>
            </label>
            <input
              id="schema-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Auto-detected from page"
              className="w-full border border-border bg-bg-secondary px-4 py-3 text-body text-text-primary placeholder-text-tertiary outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </div>
          <div>
            <label htmlFor="schema-author" className="mb-1.5 block text-body-sm font-medium text-text-primary">
              Author <span className="text-text-tertiary">(optional)</span>
            </label>
            <input
              id="schema-author"
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="Auto-detected from page"
              className="w-full border border-border bg-bg-secondary px-4 py-3 text-body text-text-primary placeholder-text-tertiary outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="schema-date" className="mb-1.5 block text-body-sm font-medium text-text-primary">
              Date Published <span className="text-text-tertiary">(optional)</span>
            </label>
            <input
              id="schema-date"
              type="date"
              value={datePublished}
              onChange={(e) => setDatePublished(e.target.value)}
              className="w-full border border-border bg-bg-secondary px-4 py-3 text-body text-text-primary outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </div>
          <div>
            <label htmlFor="schema-desc" className="mb-1.5 block text-body-sm font-medium text-text-primary">
              Description <span className="text-text-tertiary">(optional)</span>
            </label>
            <input
              id="schema-desc"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Auto-detected from meta tags"
              className="w-full border border-border bg-bg-secondary px-4 py-3 text-body text-text-primary placeholder-text-tertiary outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !url.trim()}
          className="btn-primary w-full disabled:opacity-50"
        >
          {loading ? <Spinner /> : "Generate Schema Markup"}
        </button>
      </form>

      {error && (
        <div className="mt-6 border border-error/30 bg-error/10 px-5 py-4 text-body-sm text-error">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-6 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-body-sm font-medium text-text-primary">
                Generated {schemaType} Schema
              </span>
              {autoFilled && (
                <span className="border border-success/30 bg-success/10 px-2 py-0.5 text-tiny text-success">
                  Auto-filled from page
                </span>
              )}
            </div>
            <CopyButton text={result} />
          </div>
          <div className="overflow-hidden border border-border bg-bg-secondary">
            <pre className="overflow-x-auto p-5 text-body-sm leading-relaxed text-text-secondary font-mono">
              <code>{result}</code>
            </pre>
          </div>
          <p className="text-caption text-text-tertiary">
            Paste this inside your {"<head>"} tag. Review auto-filled values and replace any placeholders before publishing.
          </p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tool Card
// ---------------------------------------------------------------------------
function ToolCard({
  active,
  onClick,
  icon,
  title,
  description,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`glass-card flex flex-1 items-start gap-4 p-5 text-left transition-all ${
        active ? "border-brand bg-brand-subtle" : ""
      }`}
    >
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center ${
        active ? "bg-brand text-text-inverse" : "bg-bg-tertiary text-text-secondary"
      }`}>
        {icon}
      </div>
      <div>
        <h3 className="text-body-sm font-medium text-text-primary">{title}</h3>
        <p className="mt-1 text-caption text-text-tertiary">{description}</p>
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------
function FileTextIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}

function CodeBracketIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Tools Page
// ---------------------------------------------------------------------------
export default function ToolsPage() {
  const [activeTab, setActiveTab] = useState<ToolTab>("llms-txt");

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-caption text-text-tertiary">
        <Link href="/dashboard" className="transition-colors hover:text-text-secondary">
          Dashboard
        </Link>
        <span>/</span>
        <span className="text-text-primary">Tools</span>
      </nav>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-h2 font-semibold text-text-primary">AEO Tools</h1>
        <p className="mt-2 text-body text-text-secondary">
          Generate files that improve your AI visibility. These tools produce
          ready-to-use output you can add to your site.
        </p>
      </div>

      {/* Tool Selector Cards */}
      <div className="mb-8 flex gap-4">
        <ToolCard
          active={activeTab === "llms-txt"}
          onClick={() => setActiveTab("llms-txt")}
          icon={<FileTextIcon />}
          title="Generate /llms.txt"
          description="Tell AI crawlers how to use your content. Follows the llmstxt.org standard."
        />
        <ToolCard
          active={activeTab === "schema"}
          onClick={() => setActiveTab("schema")}
          icon={<CodeBracketIcon />}
          title="Generate Schema Markup"
          description="Create Schema.org JSON-LD for Article, FAQ, HowTo, or WebPage."
        />
      </div>

      {/* Active Tool Form */}
      <div className="glass-card p-6 sm:p-8">
        {activeTab === "llms-txt" ? <LlmsTxtGenerator /> : <SchemaGenerator />}
      </div>
    </div>
  );
}
