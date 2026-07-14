import { Component } from 'react';
import { clearProgress } from '../lib/progressStore.js';

export default class OfflineErrorBoundary extends Component {
  state = { error: null, resetKey: 0 };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    console.error('离线展厅错误:', error);
  }

  recover = () => {
    this.setState(({ resetKey }) => ({ error: null, resetKey: resetKey + 1 }));
  };

  returnHome = () => {
    clearProgress();
    window.location.reload();
  };

  render() {
    if (this.state.error) {
      return (
        <main className="offline-failure" role="alert">
          <p className="offline-failure-kicker">离线恢复</p>
          <h1>当前展厅未能继续运行</h1>
          <p>馆藏数据仍保存在本机。可以恢复当前展厅，或清空进度后返回首页。</p>
          <div>
            <button type="button" onClick={this.recover}>恢复当前展厅</button>
            <button type="button" onClick={this.returnHome}>返回首页</button>
          </div>
        </main>
      );
    }
    return <div key={this.state.resetKey}>{this.props.children}</div>;
  }
}
