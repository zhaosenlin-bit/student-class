(function(root){
 const sentences=[
  'Welcome to Greenfield School! There is a library on your left.',
  'There are many books in it. Across the path from the library is our dining hall.',
  'The sports field is in front of you. Our classroom building is behind the sports field.',
  'We play football after school.',
  'My favourite place is the library because I love reading.',
  'Where would you like to go first?'
 ];
 const questions=[
  {q:'What is Lin introducing?',options:['A new school.','A family.','A birthday party.'],answer:0,evidence:[0],explain:'开头点明介绍的对象：Greenfield School。'},
  {q:'Where is the classroom building?',options:['Behind the sports field.','On your left.','Across from the dining hall.'],answer:0,evidence:[2],explain:'注意 classroom building，而不是 library。找到包含 behind 的句子。'},
  {q:'Why does Lin like the library?',options:['Because Lin loves reading.','Because Lin plays football there.','Because the food is delicious.'],answer:0,evidence:[4],explain:'because 后面给出了 Lin 喜欢图书馆的原因。'}
 ];
 const talks={
 library:{label:'Library',zh:'图书馆',yaw:-62,pitch:-2,role:'Lin · 校园向导',turns:[
  {npc:'Hi! Where would you like to go?',help:'告诉 Lin，你想去图书馆。',example:"I'd like to go to the library.",kind:'library',ok:'Great! Where is the library?'},
  {npc:'Where is the library?',help:'从校门朝向运动场观察，图书馆在你的左边。',example:'It is on my left.',kind:'left',ok:'Yes! What can you do there?'},
  {npc:'What can you do there?',help:'说出你在图书馆可以做的事。',example:'I can read books there.',kind:'read',ok:"Good idea! Let's read together."}
 ]},
 field:{label:'Sports field',zh:'运动场',yaw:0,pitch:-8,role:'Lin · 校园向导',turns:[
  {npc:'What is behind the sports field?',help:'观察运动场后面，说出建筑名称。',example:'The classroom building is behind it.',kind:'classroom',ok:'Yes. What can you do on the sports field?'},
  {npc:'What can you do on the sports field?',help:'说出一项可以在运动场进行的活动。',example:'I can play football there.',kind:'sport',ok:'That sounds fun! Let us play after school.'}
 ]},
 dining:{label:'Dining hall',zh:'食堂',yaw:62,pitch:-3,role:'Lin · 校园向导',turns:[
  {npc:'Is there a dining hall in this school?',help:'用 there be 回答校园里有没有食堂。',example:'Yes, there is.',kind:'there',ok:'Where is it?'},
  {npc:'Where is it?',help:'食堂位于图书馆对面，中间隔着步道。',example:'It is across from the library.',kind:'across',ok:'What is your favourite place in school? Why?'},
  {npc:'What is your favourite place in school? Why?',help:'选择一个你喜欢的校园地点，并用 because 说明理由。',example:'My favourite place is the library because I love reading.',kind:'reason',ok:'Thank you for sharing! Every school has places to enjoy.'}
 ]}
 };
 function normalize(s){return String(s).toLowerCase().replace(/[’‘]/g,"'").replace(/[^a-z' ]/g,' ').replace(/\s+/g,' ').trim()}
 function assess(kind,text){const s=normalize(text);if(!s)return {ok:false,message:'先说一句英语，或输入你的回答。'};if(/\b(not|never|no|don't|doesn't|isn't|aren't|cannot|can't)\b/.test(s)&&kind!=='reason')return {ok:false,message:'这句话包含否定表达。请核对场景，或请老师确认你想表达的意思。'};
 let ok=false;switch(kind){case'library':ok=/\blibrary\b/.test(s);break;case'left':ok=/\bleft\b/.test(s)&&! /\bright\b/.test(s);break;case'read':ok=/\b(read|reading|study|studying|borrow)\b/.test(s);break;case'classroom':ok=/\bclassroom\b/.test(s);break;case'sport':ok=/\b(football|soccer|basketball|run|running|exercise|sports)\b/.test(s);break;case'there':ok=/\byes\b/.test(s)&&/\bthere is\b/.test(s);break;case'across':ok=/\b(across|opposite)\b/.test(s)&&/\blibrary\b/.test(s);break;case'reason':ok=/\bbecause\b/.test(s)&&/\b(library|classroom|school|sports field|dining hall|playground|garden|gym|lab|art room|music room)\b/.test(s)&&s.split('because')[1].trim().split(' ').length>=3;break;}
 return {ok,message:ok?'已找到本轮所需的信息。请回听录音，检查表达是否清楚、完整。':'还没有找到本轮的关键信息。可以参考句型重说；识别有误时，先修改文字。其他合理表达可请老师判断。'};
 }
 const data={sentences,questions,talks,normalize,assess};root.CampusContent=data;if(typeof module!=='undefined')module.exports=data;
})(typeof window!=='undefined'?window:globalThis);
