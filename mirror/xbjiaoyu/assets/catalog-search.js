// Search only published presentation metadata; never infer teaching tags or use
// a displayed author name as an identity filter.
export function normalizeSearchText(value) {
  return String(value ?? '').normalize('NFKC').toLowerCase().replace(/\s+/gu, ' ').trim();
}

const queryTerms = query => [...new Set(normalizeSearchText(query).split(' ').filter(Boolean))];
const list = value => Array.isArray(value) ? value : [];
const text = (...values) => normalizeSearchText(values.flat(Infinity).filter(value => typeof value === 'string').join(' '));

function searchableFields(course) {
  const taxonomy = list(course.taxonomy).flatMap(item => [item?.domain, item?.chapter, item?.topics]);
  const modules = list(course.modules).flatMap(item => [item?.title, item?.description, item?.topics]);
  const curriculum = typeof course.curriculum === 'string' ? course.curriculum :
    list(course.curriculum).flatMap(item => typeof item === 'string' ? item : [item?.title, item?.domain, item?.chapter, item?.topics]);
  const stageSubjects = course.stageSubjects && typeof course.stageSubjects === 'object' ? course.stageSubjects : {};
  const author = course.creatorName || (!course.creatorId && course.origin !== 'community' ? '小小小白' : '');
  return [
    [text(course.title), 100],
    [text(course.features, course.topics, taxonomy, modules, curriculum), 60],
    [text(course.subject, course.subjects, course.stage, course.stages, Object.keys(stageSubjects), Object.values(stageSubjects)), 40],
    [text(author), 30],
    [text(course.tagline, course.description), 10]
  ];
}

function scoreTerms(course, terms) {
  if (!course || typeof course !== 'object' || Array.isArray(course)) return -1;
  if (!terms.length) return 0;
  const fields = searchableFields(course);
  let score = 0;
  for (const term of terms) {
    const match = fields.find(([value]) => value.includes(term));
    if (!match) return -1;
    score += match[1];
  }
  return score;
}

// -1 means at least one term is absent; 0 means the query is empty.
export function courseSearchScore(course, query) {
  return scoreTerms(course, queryTerms(query));
}

// All terms must match, including terms distributed across different fields.
// Equal relevance and empty queries retain the catalogue's original order.
export function searchCourses(courses, query, {sortBy = 'relevance'} = {}) {
  const terms = queryTerms(query);
  const results = list(courses).map((course, index) => ({course, index, score: scoreTerms(course, terms)})).filter(item => item.score >= 0);
  if (terms.length && sortBy === 'relevance') results.sort((a, b) => b.score - a.score || a.index - b.index);
  return results.map(item => item.course);
}
