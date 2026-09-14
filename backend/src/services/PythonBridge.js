const { spawn } = require('child_process');
const path = require('path');

const DEFAULT_TIMEOUT_MS = 30000;
const DEFAULT_MAX_OUTPUT_BYTES = 1024 * 1024;
const PYTHON_BIN = () => process.env.PYTHON_BIN || 'python';
// 脱敏错误信息 - 移除文件路径和堆栈信息
const sanitizeError = (message) => {
  if (!message) return message;
  return message
    .replace(/\/[^\/\s]+\.(js|py|ts):\d+:\d+/g, '[file]')
    .replace(/at\s+.*\(.*\)/g, '[stack]')
    .replace(/Error:.*$/gm, 'Error: [sanitized]');
};


class PythonBridge {
  static async call(action, inputData = {}, options = {}) {
    const wrapperPath = path.join(__dirname, '../../../service/api_wrapper.py');
    const timeoutMs = Number(options.timeoutMs || process.env.PYTHON_BRIDGE_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);
    const maxOutputBytes = Number(
      options.maxOutputBytes || process.env.PYTHON_BRIDGE_MAX_OUTPUT_BYTES || DEFAULT_MAX_OUTPUT_BYTES
    );

    return new Promise((resolve, reject) => {
      const inputJson = JSON.stringify(inputData);

      const python = spawn(PYTHON_BIN(), [wrapperPath, action, inputJson], {
        cwd: path.join(__dirname, '../../..'),
        env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
      });

      let stdout = '';
      let stderr = '';
      let stdoutBytes = 0;
      let stderrBytes = 0;
      let settled = false;

      const finish = (callback, value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        callback(value);
      };

      const rejectAndKill = (error) => {
        if (settled) return;
        try {
          python.kill();
        } catch (killError) {
          // Keep the original bridge error.
        }
        finish(reject, error);
      };

      const timeout = setTimeout(() => {
        rejectAndKill(new Error(`Python process timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      python.stdout.on('data', (data) => {
        stdoutBytes += Buffer.byteLength(data);
        if (stdoutBytes > maxOutputBytes) {
          rejectAndKill(new Error(`Python stdout too large: exceeded ${maxOutputBytes} bytes`));
          return;
        }
        stdout += data.toString('utf-8');
      });

      python.stderr.on('data', (data) => {
        stderrBytes += Buffer.byteLength(data);
        if (stderrBytes > maxOutputBytes) {
          rejectAndKill(new Error(`Python stderr too large: exceeded ${maxOutputBytes} bytes`));
          return;
        }
        stderr += data.toString('utf-8');
      });

      python.on('close', (code) => {
        if (settled) return;

        if (code !== 0) {
          console.error(`Python script exit code: ${code}`);
          console.error(`Python stderr: ${stderr}`);
          const sanitizedStderr = sanitizeError(stderr);
          finish(reject, new Error(`Python script failed: ${sanitizedStderr || 'unknown error'}`));
          return;
        }

        try {
          const result = JSON.parse(stdout);
          if (result.error) {
            const sanitizedResultError = sanitizeError(result.error);
            finish(reject, new Error(sanitizedResultError));
          } else {
            finish(resolve, result);
          }
        } catch (e) {
          console.error(`Failed to parse Python output: ${stdout}`);
          finish(reject, new Error(`Failed to parse Python output: ${e.message}`));
        }
      });

      python.on('error', (err) => {
        console.error('Failed to start Python process:', err);
        finish(reject, new Error(`Failed to start Python process: ${err.message}`));
      });
    });
  }

  static async analyze(text) {
    return this.call('analyze', { text });
  }

  static async restore(dishId) {
    return this.call('restore', { dish_id: dishId });
  }

  static async listDishes() {
    return this.call('list_dishes', {});
  }

  static async teach(dishId, question) {
    return this.call('teach', { dish_id: dishId, question });
  }

  static async getStarMap() {
    return this.call('star_map', {});
  }

  static async evolution(dishId1, dishId2) {
    return this.call('evolution', { dish_id_1: dishId1, dish_id_2: dishId2 });
  }
}

module.exports = PythonBridge;
