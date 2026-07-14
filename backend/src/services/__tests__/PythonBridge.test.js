const { EventEmitter } = require('events');
const { spawn } = require('child_process');
const PythonBridge = require('../PythonBridge');

jest.mock('child_process', () => ({
  spawn: jest.fn(),
}));

function createMockProcess() {
  const process = new EventEmitter();
  process.stdout = new EventEmitter();
  process.stderr = new EventEmitter();
  process.kill = jest.fn();
  return process;
}

describe('PythonBridge.call child process resilience', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  test('kills and rejects when the Python child process exceeds the timeout', async () => {
    jest.useFakeTimers();
    const child = createMockProcess();
    spawn.mockReturnValue(child);

    const promise = PythonBridge.call('analyze', { text: 'slow' }, { timeoutMs: 50 });

    jest.advanceTimersByTime(51);
    await expect(promise).rejects.toThrow(/timed out/i);
    expect(child.kill).toHaveBeenCalled();
  });

  test('kills and rejects when stdout exceeds the configured maximum output size', async () => {
    const child = createMockProcess();
    spawn.mockReturnValue(child);

    const promise = PythonBridge.call('analyze', { text: 'large' }, { maxOutputBytes: 8 });
    child.stdout.emit('data', Buffer.from('123456789', 'utf-8'));

    await expect(promise).rejects.toThrow(/stdout.*too large/i);
    expect(child.kill).toHaveBeenCalled();
  });

  test('kills and rejects when stderr exceeds the configured maximum output size', async () => {
    const child = createMockProcess();
    spawn.mockReturnValue(child);

    const promise = PythonBridge.call('analyze', { text: 'large' }, { maxOutputBytes: 8 });
    child.stderr.emit('data', Buffer.from('123456789', 'utf-8'));

    await expect(promise).rejects.toThrow(/stderr.*too large/i);
    expect(child.kill).toHaveBeenCalled();
  });

  test('uses PYTHON_BIN when launching the bridge process', async () => {
    const child = createMockProcess();
    spawn.mockReturnValue(child);
    process.env.PYTHON_BIN = 'python3';

    const promise = PythonBridge.call('list_dishes', {});
    child.stdout.emit('data', Buffer.from('{"dishes":[]}', 'utf-8'));
    child.emit('close', 0);

    await expect(promise).resolves.toEqual({ dishes: [] });
    expect(spawn).toHaveBeenCalledWith(
      'python3',
      expect.any(Array),
      expect.objectContaining({ cwd: expect.any(String) })
    );
    delete process.env.PYTHON_BIN;
  });
});
