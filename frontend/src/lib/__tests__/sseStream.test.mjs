import test from 'node:test';
import assert from 'node:assert/strict';

async function loadSseStreamModule() {
  try {
    return await import('../sseStream.js');
  } catch (error) {
    if (error?.code !== 'ERR_MODULE_NOT_FOUND') throw error;
    return {};
  }
}

async function loadParserExports() {
  const module = await loadSseStreamModule();
  assert.equal(typeof module.createSseJsonParser, 'function');
  assert.equal(typeof module.consumeSseJsonStream, 'function');
  return module;
}

test('parses CRLF SSE events split across chunks with multiple data lines', async () => {
  const { createSseJsonParser } = await loadParserExports();
  const events = [];
  const parser = createSseJsonParser({ onEvent: (event) => events.push(event) });

  parser.push('data: {"type":"ste');
  parser.push('p",\r\ndata');
  parser.push(': "step":1}\r\n\r');
  parser.push('\n');

  assert.deepEqual(events, [{ type: 'step', step: 1 }]);
});

test('rejects malformed JSON without emitting a partial event', async () => {
  const { createSseJsonParser } = await loadParserExports();
  const events = [];
  const parser = createSseJsonParser({ onEvent: (event) => events.push(event) });

  assert.throws(
    () => parser.push('data: {"type":\n\n'),
    (error) => error?.code === 'INVALID_SSE_JSON',
  );
  assert.deepEqual(events, []);
});

test('enforces per-event and unfinished-buffer limits', async () => {
  const { createSseJsonParser } = await loadParserExports();
  const eventParser = createSseJsonParser({
    onEvent: () => {},
    maxEventLength: 12,
    maxBufferLength: 64,
  });
  const bufferParser = createSseJsonParser({
    onEvent: () => {},
    maxEventLength: 64,
    maxBufferLength: 12,
  });

  assert.throws(
    () => eventParser.push('data: {"message":"too long"}\n'),
    (error) => error?.code === 'SSE_EVENT_TOO_LARGE',
  );
  assert.throws(
    () => bufferParser.push('data: unfinished event without newline'),
    (error) => error?.code === 'SSE_BUFFER_TOO_LARGE',
  );
});

test('decodes byte chunks incrementally and flushes the final event', async () => {
  const { consumeSseJsonStream } = await loadParserExports();
  const encoder = new TextEncoder();
  const events = [];
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode('data: {"type":"res'));
      controller.enqueue(encoder.encode('ult","dish":{"name":"蟹'));
      controller.enqueue(encoder.encode('酿橙"}}\r\n\r\n'));
      controller.close();
    },
  });

  await consumeSseJsonStream(stream, { onEvent: (event) => events.push(event) });

  assert.deepEqual(events, [{ type: 'result', dish: { name: '蟹酿橙' } }]);
});

test('cancels the active reader when the caller aborts', async () => {
  const { consumeSseJsonStream } = await loadParserExports();
  const controller = new AbortController();
  let cancelReason;
  const stream = new ReadableStream({
    cancel(reason) {
      cancelReason = reason;
    },
  });

  const consuming = consumeSseJsonStream(stream, {
    signal: controller.signal,
    onEvent: () => {},
  });
  controller.abort(new DOMException('cancelled by test', 'AbortError'));

  await assert.rejects(consuming, (error) => error?.name === 'AbortError');
  assert.equal(cancelReason?.name, 'AbortError');
});
