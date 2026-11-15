import {searchCourses} from './catalog-search.js';
import {orderCourses} from './course-order.js?v=delivery-parity-20261023.1';

export const isTeacherCourse=p=>p.origin==='community'||p.creatorId!=null;
export const matchesOrigin=(p,origin='全部')=>origin==='全部'||(origin==='教师课件'?isTeacherCourse(p):!isTeacherCourse(p));
export const courseSubject=(p,stage='全部')=>stage==='全部'?p.subject:(p.stageSubjects?.[stage]||p.subject);

export function browseCatalog(courses,{origin='全部',stage='全部',subject='全部',price='全部',author='',query='',sortBy='default',courseIds=null}={}) {
  const selected=courses.filter(p=>matchesOrigin(p,origin)
    &&(stage==='全部'||p.stages?.includes(stage)||p.stage===stage)
    &&(subject==='全部'||courseSubject(p,stage)===subject)
    &&(price==='全部'||p.mode===(price==='免费'?'free':'paid'))
    &&(!author||String(p.creatorId)===String(author))
    &&(!courseIds||courseIds.includes(p.id)));
  const unique=[...new Map(selected.map(p=>[p.id,p])).values()];
  return orderCourses(searchCourses(unique,query,{sortBy:sortBy==='default'?'relevance':'source'}),{sortBy});
}

export function courseAuthors(courses) {
  const authors=new Map();
  for(const p of courses){
    if(!isTeacherCourse(p)||p.creatorId==null)continue;
    const id=String(p.creatorId);
    if(!authors.has(id))authors.set(id,{id,name:p.creatorName||'教师',count:0,firstTitle:p.title||''});
    authors.get(id).count++;
  }
  return [...authors.values()].sort((a,b)=>a.name.localeCompare(b.name,'zh-CN')||a.id.localeCompare(b.id));
}
