const path = require('path');

const fragments = require(path.join(__dirname, '../../../data/fragments/ancient_fragments.json'));

function includes(value, query) {
  return String(value || '').toLowerCase().includes(String(query || '').toLowerCase());
}

class FragmentService {
  static listFragments({ q, dynasty, source, tag } = {}) {
    return fragments.filter((fragment) => {
      const queryMatch = !q || [fragment.title, fragment.passage, fragment.source, ...(fragment.tags || [])]
        .some((value) => includes(value, q));
      const dynastyMatch = !dynasty || fragment.dynasty === dynasty;
      const sourceMatch = !source || fragment.source === source;
      const tagMatch = !tag || (fragment.tags || []).includes(tag);
      return queryMatch && dynastyMatch && sourceMatch && tagMatch;
    });
  }

  static getFragmentById(id) {
    return fragments.find((fragment) => fragment.id === id);
  }
}

module.exports = FragmentService;
