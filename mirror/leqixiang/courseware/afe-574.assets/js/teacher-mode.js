(function(){
  "use strict";

  const STORAGE_KEY="xytd_teacher_questions_v1";
  const BANK_NAMES={
    chapter01:"第1回合",
    chapter02:"第2回合",
    chapter03:"第3回合",
    chapter04:"第4回合",
    chapter05:"第5回合"
  };
  const ROUND_LABELS={
    chapter01:"第1回合：1—25回",
    chapter02:"第2回合：26—50回",
    chapter03:"第3回合：51—75回",
    chapter04:"第4回合：76—100回",
    chapter05:"第5回合：全书综合"
  };
  let teacherQuestions=loadTeacherQuestions();
  let editingId=null;

  applyTeacherQuestions();
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initTeacherMode);
  else initTeacherMode();

  function initTeacherMode(){
    bind("teacherModeBtn","click",openTeacherMode);
    bind("teacherCloseBtn","click",closeTeacherMode);
    bind("downloadWordTemplate","click",downloadWordTemplate);
    bind("downloadExcelTemplate","click",downloadExcelTemplate);
    bind("wordUpload","change",event=>handleUpload(event,"word"));
    bind("excelUpload","change",event=>handleUpload(event,"excel"));
    bind("teacherSaveQuestion","click",saveQuestionFromForm);
    bind("teacherClearForm","click",clearForm);
    bind("teacherDeleteAll","click",deleteAllTeacherQuestions);
    renderTeacherList();
  }

  function bind(id,event,handler){
    const node=document.getElementById(id);
    if(node)node.addEventListener(event,handler);
  }

  function openTeacherMode(){
    const modal=document.getElementById("teacherModal");
    if(modal)modal.classList.add("show");
    renderTeacherList();
  }

  function closeTeacherMode(){
    const modal=document.getElementById("teacherModal");
    if(modal)modal.classList.remove("show");
  }

  function loadTeacherQuestions(){
    try{
      const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]");
      return Array.isArray(saved)?saved.filter(isValidTeacherRecord):[];
    }catch(error){
      console.warn("Teacher question bank could not be loaded:",error);
      return [];
    }
  }

  function persistTeacherQuestions(){
    try{
      localStorage.setItem(STORAGE_KEY,JSON.stringify(teacherQuestions));
      setStatus(`已保存教师题库：${teacherQuestions.length} 道。点击“重整旗鼓”或重新打开本回合即可使用。`);
    }catch(error){
      console.warn("Teacher question bank could not be saved:",error);
      setStatus("保存失败：浏览器本地存储不可用。");
    }
  }

  function applyTeacherQuestions(){
    const banks=window.CHAPTER_QUESTIONS;
    if(!banks)return;
    Object.keys(BANK_NAMES).forEach(bankId=>{
      if(!banks[bankId])return;
      banks[bankId]._teacherApplied=banks[bankId]._teacherApplied||new Set();
      const target=banks[bankId].questions||(banks[bankId].questions=[]);
      teacherQuestions.filter(q=>q.bank===bankId).forEach(record=>{
        if(banks[bankId]._teacherApplied.has(record.id))return;
        target.push(toGameQuestion(record));
        banks[bankId]._teacherApplied.add(record.id);
      });
    });
  }

  function toGameQuestion(record){
    return {
      id:record.id,
      groupId:record.id,
      question:record.question,
      options:record.options.slice(0,4),
      answer:record.answer,
      difficulty:record.difficulty||2,
      category:record.category||"教师题库",
      explanation:record.explanation||"教师自定义题目。",
      reward:record.reward||50,
      sourceType:"教师自定义题库"
    };
  }

  function isValidTeacherRecord(record){
    return record&&typeof record.id==="string"&&typeof record.bank==="string"&&typeof record.question==="string"&&
      Array.isArray(record.options)&&record.options.length===4&&Number.isInteger(record.answer)&&record.answer>=0&&record.answer<4;
  }

  function downloadWordTemplate(){
    const text=[
      "《西游塔防教师版》Word题库模板",
      "",
      "【题目】",
      "《西游记》中，孙悟空被压五行山后，情节功能主要是什么？",
      "",
      "【选项】",
      "A. 表现孙悟空武艺已经完全消失",
      "B. 使人物从反抗天庭转入护送取经",
      "C. 说明唐僧不再需要徒弟帮助",
      "D. 表明天庭从此不再干预人间",
      "",
      "【答案】",
      "B",
      "",
      "【解析】",
      "五行山情节承接大闹天宫，又为唐僧收徒和取经队伍形成作铺垫。",
      "",
      "【题目】",
      "",
      "【选项】",
      "A. ",
      "B. ",
      "C. ",
      "D. ",
      "",
      "【答案】",
      "",
      "【解析】",
      ""
    ].join("\n");
    downloadFile("西游塔防_Word题库模板.doc",text,"application/msword;charset=utf-8");
  }

  function downloadExcelTemplate(){
    const csv=[
      ["题目","A","B","C","D","答案","解析"].join(","),
      csvRow([
        "《西游记》中，三打白骨精后唐僧赶走悟空，主要表现了师徒关系中的哪种矛盾？",
        "悟空识妖能力与唐僧慈悲观念的冲突",
        "八戒与沙僧争功的冲突",
        "白龙马不愿西行的冲突",
        "天庭与龙宫争宝的冲突",
        "A",
        "唐僧重慈悲、悟空重除妖，二者判断标准不同，推动师徒关系出现波折。"
      ])
    ].join("\n");
    downloadFile("西游塔防_Excel题库模板.csv","\uFEFF"+csv,"text/csv;charset=utf-8");
  }

  function csvRow(cells){
    return cells.map(value=>`"${String(value).replace(/"/g,'""')}"`).join(",");
  }

  function downloadFile(filename,content,type){
    const blob=new Blob([content],{type});
    const a=document.createElement("a");
    a.href=URL.createObjectURL(blob);
    a.download=filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},200);
  }

  async function handleUpload(event,kind){
    const file=event.target.files&&event.target.files[0];
    if(!file)return;
    try{
      const text=await readFileAsText(file);
      const bank=document.getElementById("teacherRound")?.value||"chapter01";
      const parsed=kind==="excel"?parseExcelQuestions(text,bank):parseWordQuestions(text,bank);
      if(!parsed.length){
        setStatus("没有解析到有效题目，请检查模板字段是否完整。");
        return;
      }
      teacherQuestions=teacherQuestions.concat(parsed);
      persistTeacherQuestions();
      applyTeacherQuestions();
      renderTeacherList();
      setStatus(`已从《${file.name}》添加 ${parsed.length} 道题。`);
    }catch(error){
      console.warn("Teacher upload failed:",error);
      setStatus("上传解析失败，请确认文件为模板生成的 .doc/.txt 或 .csv/.tsv。");
    }finally{
      event.target.value="";
    }
  }

  function readFileAsText(file){
    return new Promise((resolve,reject)=>{
      const reader=new FileReader();
      reader.onload=()=>resolve(String(reader.result||""));
      reader.onerror=()=>reject(reader.error);
      reader.readAsText(file,"utf-8");
    });
  }

  function cleanText(text){
    return String(text||"")
      .replace(/\r/g,"\n")
      .replace(/<br\s*\/?>/gi,"\n")
      .replace(/<\/(p|div|li|tr|h\d)>/gi,"\n")
      .replace(/<[^>]+>/g,"")
      .replace(/&nbsp;/g," ")
      .replace(/&lt;/g,"<")
      .replace(/&gt;/g,">")
      .replace(/&amp;/g,"&")
      .replace(/[ \t]+\n/g,"\n")
      .trim();
  }

  function parseWordQuestions(text,bank){
    const source=cleanText(text);
    const blocks=source.split(/(?=【题目】)/).map(s=>s.trim()).filter(Boolean);
    return blocks.map(block=>{
      const question=section(block,"题目");
      const optionText=section(block,"选项");
      const answerText=section(block,"答案");
      const explanation=section(block,"解析")||"教师自定义解析。";
      const options=parseOptionLines(optionText);
      return makeTeacherRecord({bank,question,options,answerText,explanation});
    }).filter(Boolean);
  }

  function section(block,label){
    const pattern=new RegExp(`【${label}】([\\s\\S]*?)(?=【题目】|【选项】|【答案】|【解析】|$)`);
    const match=block.match(pattern);
    return match?match[1].trim():"";
  }

  function parseOptionLines(optionText){
    const lines=cleanText(optionText).split(/\n+/).map(s=>s.trim()).filter(Boolean);
    const options=[];
    lines.forEach(line=>{
      const match=line.match(/^[A-D甲乙丙丁][\.、\)\s]+(.+)$/i);
      options.push((match?match[1]:line).trim());
    });
    return options.slice(0,4);
  }

  function parseExcelQuestions(text,bank){
    const delimiter=text.includes("\t")?"\t":",";
    const rows=parseDelimited(text,delimiter).filter(row=>row.some(cell=>String(cell).trim()));
    if(!rows.length)return [];
    const header=rows[0].map(s=>String(s).trim());
    const hasHeader=header.includes("题目")&&header.includes("答案");
    const dataRows=hasHeader?rows.slice(1):rows;
    return dataRows.map(row=>{
      const get=(name,index)=>hasHeader?row[header.indexOf(name)]||"":row[index]||"";
      return makeTeacherRecord({
        bank,
        question:get("题目",0),
        options:[get("A",1),get("B",2),get("C",3),get("D",4)],
        answerText:get("答案",5),
        explanation:get("解析",6)||"教师自定义解析。"
      });
    }).filter(Boolean);
  }

  function parseDelimited(text,delimiter){
    const rows=[];let row=[],cell="",quoted=false;
    for(let i=0;i<text.length;i++){
      const ch=text[i],next=text[i+1];
      if(ch==='"'&&quoted&&next==='"'){cell+='"';i++;continue}
      if(ch==='"'){quoted=!quoted;continue}
      if(ch===delimiter&&!quoted){row.push(cell.trim());cell="";continue}
      if((ch==="\n"||ch==="\r")&&!quoted){
        if(ch==="\r"&&next==="\n")i++;
        row.push(cell.trim());rows.push(row);row=[];cell="";continue;
      }
      cell+=ch;
    }
    row.push(cell.trim());rows.push(row);
    return rows;
  }

  function makeTeacherRecord({bank,question,options,answerText,explanation}){
    const cleanQuestion=String(question||"").trim();
    const cleanOptions=(options||[]).map(s=>String(s||"").trim()).filter(Boolean);
    if(!cleanQuestion||cleanOptions.length!==4)return null;
    const answer=resolveAnswer(answerText,cleanOptions);
    if(answer<0)return null;
    return {
      id:`teacher_${bank}_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
      bank,
      question:cleanQuestion,
      options:cleanOptions,
      answer,
      difficulty:2,
      category:"教师题库",
      explanation:String(explanation||"教师自定义解析。").trim(),
      reward:50
    };
  }

  function resolveAnswer(answerText,options){
    const value=String(answerText||"").trim();
    const letter=value.toUpperCase();
    const letterIndex={A:0,B:1,C:2,D:3,甲:0,乙:1,丙:2,丁:3}[letter];
    if(Number.isInteger(letterIndex))return letterIndex;
    const numeric=Number(value);
    if(Number.isInteger(numeric)&&numeric>=1&&numeric<=4)return numeric-1;
    return options.findIndex(option=>option===value);
  }

  function saveQuestionFromForm(){
    const bank=document.getElementById("teacherRound")?.value||"chapter01";
    const record=makeTeacherRecord({
      bank,
      question:value("teacherQuestion"),
      options:[value("teacherA"),value("teacherB"),value("teacherC"),value("teacherD")],
      answerText:value("teacherAnswer"),
      explanation:value("teacherExplanation")||"教师自定义解析。"
    });
    if(!record){
      setStatus("保存失败：题目、四个选项和答案必须填写完整。");
      return;
    }
    if(editingId){
      record.id=editingId;
      const index=teacherQuestions.findIndex(q=>q.id===editingId);
      if(index>=0)teacherQuestions[index]=record;
      editingId=null;
      setStatus("题目已更新。");
    }else{
      teacherQuestions.push(record);
      setStatus("题目已添加到教师题库。");
    }
    persistTeacherQuestions();
    applyTeacherQuestions();
    clearForm();
    renderTeacherList();
  }

  function value(id){
    return document.getElementById(id)?.value||"";
  }

  function clearForm(){
    ["teacherQuestion","teacherA","teacherB","teacherC","teacherD","teacherExplanation"].forEach(id=>{
      const node=document.getElementById(id);
      if(node)node.value="";
    });
    const answer=document.getElementById("teacherAnswer");
    if(answer)answer.value="A";
    editingId=null;
  }

  function renderTeacherList(){
    const tbody=document.getElementById("teacherQuestionList");
    if(!tbody)return;
    tbody.innerHTML="";
    if(!teacherQuestions.length){
      tbody.innerHTML='<tr><td colspan="4">暂无教师自定义题。可下载模板填写后上传，或在上方手动录入。</td></tr>';
      return;
    }
    teacherQuestions.forEach(record=>{
      const tr=document.createElement("tr");
      const answerLabel=["A","B","C","D"][record.answer]||"";
      tr.innerHTML=`<td>${escapeHtml(BANK_NAMES[record.bank]||record.bank)}</td><td>${escapeHtml(record.question)}</td><td>${answerLabel}</td><td><button class="teacher-btn secondary" data-edit="${record.id}">编辑</button> <button class="teacher-btn warn" data-delete="${record.id}">删除</button></td>`;
      tbody.appendChild(tr);
    });
    tbody.querySelectorAll("[data-edit]").forEach(btn=>btn.addEventListener("click",()=>editQuestion(btn.dataset.edit)));
    tbody.querySelectorAll("[data-delete]").forEach(btn=>btn.addEventListener("click",()=>deleteQuestion(btn.dataset.delete)));
  }

  function editQuestion(id){
    const record=teacherQuestions.find(q=>q.id===id);
    if(!record)return;
    editingId=id;
    setValue("teacherRound",record.bank);
    setValue("teacherQuestion",record.question);
    setValue("teacherA",record.options[0]);
    setValue("teacherB",record.options[1]);
    setValue("teacherC",record.options[2]);
    setValue("teacherD",record.options[3]);
    setValue("teacherAnswer",["A","B","C","D"][record.answer]||"A");
    setValue("teacherExplanation",record.explanation);
    setStatus("正在编辑题目，修改后点击“保存题目”。");
  }

  function setValue(id,value){
    const node=document.getElementById(id);
    if(node)node.value=value;
  }

  function deleteQuestion(id){
    teacherQuestions=teacherQuestions.filter(q=>q.id!==id);
    persistTeacherQuestions();
    renderTeacherList();
    setStatus("题目已删除。重新打开本回合后，题库池会同步更新。");
  }

  function deleteAllTeacherQuestions(){
    if(!confirm("确定清空教师题库吗？此操作只删除教师自定义题，不影响游戏内置题库。"))return;
    teacherQuestions=[];
    persistTeacherQuestions();
    renderTeacherList();
    clearForm();
    setStatus("教师题库已清空。");
  }

  function setStatus(message){
    const node=document.getElementById("teacherStatus");
    if(node)node.textContent=message;
  }

  function escapeHtml(value){
    return String(value||"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  }

  window.XYTD_TEACHER_MODE={
    getQuestions:()=>teacherQuestions.slice(),
    apply:applyTeacherQuestions,
    storageKey:STORAGE_KEY,
    roundLabels:ROUND_LABELS
  };
})();
