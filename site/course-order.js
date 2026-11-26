// Stable grouping: publicly free resources first, integrated editions first within each group.
// Ownership does not change a resource's public price category.
export function orderCourses(courses,{sortBy='default',freeFirst=true}={}) {
  const ordered=[...courses];
  if(sortBy==='newest')ordered.sort((a,b)=>new Date(b.updatedAt||0)-new Date(a.updatedAt||0));
  ordered.sort((a,b)=>(freeFirst?Number(b.mode==='free')-Number(a.mode==='free'):0)||Number(b.edition==='integrated')-Number(a.edition==='integrated'));
  return ordered;
}
