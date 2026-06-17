const { execFile } = require('node:child_process');
const { promises: fs } = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { promisify } = require('node:util');

const execFileAsync = promisify(execFile);

function isYouTubeUrl(value) {
  try {
    const url = new URL(value);
    return ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be'].includes(url.hostname);
  } catch {
    return false;
  }
}

async function fetchOEmbedMetadata(sourceUrl) {
  const endpoint = new URL('https://www.youtube.com/oembed');
  endpoint.searchParams.set('url', sourceUrl);
  endpoint.searchParams.set('format', 'json');

  const response = await fetch(endpoint, {
    headers: {
      'user-agent': 'MissionControl/1.0 (+https://fletcher-mission-control-live.vercel.app)',
    },
  });

  if (!response.ok) {
    throw new Error(`oEmbed metadata lookup failed with HTTP ${response.status}`);
  }

  const data = await response.json();
  return {
    title: typeof data.title === 'string' ? data.title.trim() : '',
    author_name: typeof data.author_name === 'string' ? data.author_name.trim() : '',
    author_url: typeof data.author_url === 'string' ? data.author_url.trim() : '',
    thumbnail_url: typeof data.thumbnail_url === 'string' ? data.thumbnail_url.trim() : '',
  };
}

function formatCommandError(error, commandName) {
  const stderr = typeof error?.stderr === 'string' ? error.stderr.trim() : '';
  const stdout = typeof error?.stdout === 'string' ? error.stdout.trim() : '';
  const code = Number.isInteger(error?.code) ? error.code : null;

  if (error?.code === 'ENOENT') {
    return `${commandName} is unavailable: executable not found on PATH`;
  }

  const parts = [`${commandName} failed`];
  if (code != null) parts.push(`exit code ${code}`);
  if (stderr) parts.push(`stderr: ${stderr}`);
  if (!stderr && stdout) parts.push(`stdout: ${stdout}`);
  if (!stderr && !stdout && error?.message) parts.push(error.message);
  return parts.join(' | ');
}

async function readCaptionText(tempDir) {
  const files = await fs.readdir(tempDir);
  const captionFile = files.find((file) => file.endsWith('.vtt'));
  if (!captionFile) return '';

  const raw = await fs.readFile(path.join(tempDir, captionFile), 'utf8');
  const cleaned = raw
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line)
    .filter((line) => line !== 'WEBVTT')
    .filter((line) => !line.startsWith('NOTE'))
    .filter((line) => !line.includes('-->'))
    .map((line) => line.replace(/<[^>]+>/g, ''))
    .filter((line) => line)
    .join('\n');

  return cleaned;
}

function buildMetadataSummary(metadata, diagnostics) {
  const lines = [];
  if (metadata.title) lines.push(`Title: ${metadata.title}`);
  if (metadata.uploader || metadata.author_name) lines.push(`Creator: ${metadata.uploader || metadata.author_name}`);
  if (metadata.description) lines.push(`Description: ${metadata.description}`);
  if (diagnostics.length > 0) lines.push('', 'Extraction notes:', ...diagnostics);
  return lines.join('\n').trim();
}

async function fetchYtDlpMetadata(sourceUrl) {
  const { stdout } = await execFileAsync('yt-dlp', [
    '--dump-single-json',
    '--skip-download',
    '--no-warnings',
    sourceUrl,
  ], {
    maxBuffer: 10 * 1024 * 1024,
  });

  const parsed = JSON.parse(stdout);
  return {
    id: parsed.id || '',
    title: typeof parsed.title === 'string' ? parsed.title.trim() : '',
    description: typeof parsed.description === 'string' ? parsed.description.trim() : '',
    uploader: typeof parsed.uploader === 'string' ? parsed.uploader.trim() : '',
    channel: typeof parsed.channel === 'string' ? parsed.channel.trim() : '',
    duration: parsed.duration ?? null,
    webpage_url: typeof parsed.webpage_url === 'string' ? parsed.webpage_url.trim() : sourceUrl,
  };
}

async function fetchCaptions(sourceUrl) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mission-control-ytdlp-'));

  try {
    await execFileAsync('yt-dlp', [
      '--skip-download',
      '--write-auto-subs',
      '--write-subs',
      '--sub-langs',
      'en.*,en',
      '--sub-format',
      'vtt',
      '--output',
      path.join(tempDir, '%(id)s.%(ext)s'),
      sourceUrl,
    ], {
      maxBuffer: 10 * 1024 * 1024,
    });

    return await readCaptionText(tempDir);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

async function extractYouTubeContent(sourceUrl) {
  const diagnostics = [];
  let oembed = null;
  let metadata = null;

  try {
    oembed = await fetchOEmbedMetadata(sourceUrl);
  } catch (error) {
    diagnostics.push(`Metadata fallback lookup failed: ${error.message}`);
  }

  try {
    metadata = await fetchYtDlpMetadata(sourceUrl);
  } catch (error) {
    diagnostics.push(formatCommandError(error, 'yt-dlp metadata extraction'));
  }

  const merged = {
    title: metadata?.title || oembed?.title || '',
    description: metadata?.description || '',
    uploader: metadata?.uploader || metadata?.channel || '',
    author_name: oembed?.author_name || '',
    author_url: oembed?.author_url || '',
    thumbnail_url: oembed?.thumbnail_url || '',
    duration: metadata?.duration ?? null,
    webpage_url: metadata?.webpage_url || sourceUrl,
  };

  let captions = '';
  try {
    captions = await fetchCaptions(sourceUrl);
    if (!captions) diagnostics.push('No English captions were downloaded by yt-dlp');
  } catch (error) {
    diagnostics.push(formatCommandError(error, 'yt-dlp caption extraction'));
  }

  const rawContent = captions || buildMetadataSummary(merged, diagnostics);
  const summaryParts = [];
  if (captions) summaryParts.push('Auto-extracted YouTube captions');
  else summaryParts.push('Stored YouTube metadata fallback');
  if (diagnostics.length > 0) summaryParts.push(diagnostics.join(' | '));

  return {
    title: merged.title || 'YouTube video',
    rawContent: rawContent || 'YouTube metadata unavailable',
    summary: summaryParts.join('. '),
  };
}

module.exports = {
  extractYouTubeContent,
  isYouTubeUrl,
};
