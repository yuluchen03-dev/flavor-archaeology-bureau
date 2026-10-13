const DEFAULT_MAX_EVENT_LENGTH = 64 * 1024;
const DEFAULT_MAX_BUFFER_LENGTH = 128 * 1024;

export class SseStreamError extends Error {
  constructor(message, code, cause) {
    super(message);
    this.name = 'SseStreamError';
    this.code = code;
    if (cause !== undefined) this.cause = cause;
  }
}

function boundedLimit(value, fallback) {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function createSseJsonParser({
  onEvent,
  maxEventLength = DEFAULT_MAX_EVENT_LENGTH,
  maxBufferLength = DEFAULT_MAX_BUFFER_LENGTH,
} = {}) {
  if (typeof onEvent !== 'function') {
    throw new TypeError('onEvent must be a function.');
  }

  const eventLimit = boundedLimit(maxEventLength, DEFAULT_MAX_EVENT_LENGTH);
  const bufferLimit = boundedLimit(maxBufferLength, DEFAULT_MAX_BUFFER_LENGTH);
  let buffer = '';
  let dataLines = [];
  let eventLength = 0;

  const dispatchEvent = () => {
    if (dataLines.length === 0) return;

    const rawData = dataLines.join('\n');
    dataLines = [];
    eventLength = 0;

    let event;
    try {
      event = JSON.parse(rawData);
    } catch (error) {
      throw new SseStreamError('The SSE event contains invalid JSON.', 'INVALID_SSE_JSON', error);
    }
    onEvent(event);
  };

  const processLine = (rawLine) => {
    if (rawLine.length > bufferLimit) {
      throw new SseStreamError('The SSE line exceeds the buffer limit.', 'SSE_BUFFER_TOO_LARGE');
    }

    const line = rawLine.endsWith('\r') ? rawLine.slice(0, -1) : rawLine;
    if (line === '') {
      dispatchEvent();
      return;
    }
    if (line.startsWith(':')) return;

    const separator = line.indexOf(':');
    const field = separator === -1 ? line : line.slice(0, separator);
    let value = separator === -1 ? '' : line.slice(separator + 1);
    if (value.startsWith(' ')) value = value.slice(1);
    if (field !== 'data') return;

    const nextLength = eventLength + (dataLines.length > 0 ? 1 : 0) + value.length;
    if (nextLength > eventLimit) {
      throw new SseStreamError('The SSE event exceeds the event limit.', 'SSE_EVENT_TOO_LARGE');
    }
    dataLines.push(value);
    eventLength = nextLength;
  };

  return {
    push(chunk) {
      if (!chunk) return;
      buffer += String(chunk);

      let newlineIndex = buffer.indexOf('\n');
      while (newlineIndex !== -1) {
        processLine(buffer.slice(0, newlineIndex));
        buffer = buffer.slice(newlineIndex + 1);
        newlineIndex = buffer.indexOf('\n');
      }

      if (buffer.length > bufferLimit) {
        throw new SseStreamError('The SSE buffer exceeds the buffer limit.', 'SSE_BUFFER_TOO_LARGE');
      }
    },

    finish() {
      if (buffer) processLine(buffer);
      buffer = '';
      dispatchEvent();
    },
  };
}

function signalReason(signal) {
  return signal?.reason instanceof Error
    ? signal.reason
    : new DOMException('The stream was aborted.', 'AbortError');
}

export async function consumeSseJsonStream(stream, {
  signal,
  onEvent,
  maxEventLength,
  maxBufferLength,
} = {}) {
  if (!stream || typeof stream.getReader !== 'function') {
    throw new SseStreamError('The response does not contain a readable stream.', 'SSE_STREAM_UNAVAILABLE');
  }
  if (signal?.aborted) throw signalReason(signal);

  const parser = createSseJsonParser({ onEvent, maxEventLength, maxBufferLength });
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let cancelPromise;

  const cancelReader = () => {
    cancelPromise = reader.cancel(signalReason(signal)).catch(() => {});
  };
  signal?.addEventListener('abort', cancelReader, { once: true });

  try {
    while (true) {
      if (signal?.aborted) throw signalReason(signal);
      const { done, value } = await reader.read();
      if (signal?.aborted) throw signalReason(signal);
      if (done) break;
      parser.push(decoder.decode(value, { stream: true }));
    }

    const finalText = decoder.decode();
    if (finalText) parser.push(finalText);
    parser.finish();
  } catch (error) {
    if (!signal?.aborted) {
      try {
        await reader.cancel(error);
      } catch {
        // Preserve the parser or network error that caused cancellation.
      }
    }
    if (signal?.aborted) throw signalReason(signal);
    throw error;
  } finally {
    signal?.removeEventListener('abort', cancelReader);
    if (cancelPromise) await cancelPromise;
    reader.releaseLock();
  }
}
