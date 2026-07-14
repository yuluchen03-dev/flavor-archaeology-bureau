import { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error) {
    // 静默处理webview环境中的非关键错误（如getBoundingClientRect on null）
    console.warn('应用错误已捕获:', error?.message || error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-flavor-dark">
          <div className="text-center p-8">
            <div className="text-5xl mb-4">🍜</div>
            <h2 className="text-2xl font-bold text-flavor-gold mb-4">页面出了点小问题</h2>
            <p className="text-white/70 mb-6">{this.state.error?.message || '未知错误'}</p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.href = '/';
              }}
              className="bg-flavor-gold hover:bg-flavor-brown text-white font-bold py-2 px-6 rounded-lg transition-colors"
            >
              返回首页
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
