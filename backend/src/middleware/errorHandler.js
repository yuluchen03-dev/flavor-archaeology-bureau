const errorHandler = (err, req, res, next) => {
  console.error('Error:', err.message);
  
  // 生产环境不暴露错误细节
  if (process.env.NODE_ENV === 'production') {
    return res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
  
  // 开发环境返回错误详情
  res.status(err.status || 500).json({
    success: false,
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};

module.exports = errorHandler;
