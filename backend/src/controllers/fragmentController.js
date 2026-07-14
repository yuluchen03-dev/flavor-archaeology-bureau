const FragmentService = require('../services/FragmentService');

const listFragments = (req, res) => {
  const data = FragmentService.listFragments(req.query || {});
  res.json({ success: true, data });
};

const getFragment = (req, res) => {
  const fragment = FragmentService.getFragmentById(req.params.id);
  if (!fragment) {
    return res.status(404).json({ success: false, message: '古籍碎片不存在' });
  }
  return res.json({ success: true, data: fragment });
};

module.exports = { listFragments, getFragment };
