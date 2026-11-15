export class ChapterSystem {
  constructor(registry,context){this.registry=registry;this.context=context;this.instances=new Map();this.currentId=null;}
  getRegistration(id){return this.registry.find(chapter=>chapter.id===id);}
  async open(id,options={}){const registration=this.getRegistration(id);if(!registration?.enabled)throw new Error(`Chapter is not enabled: ${id}`);if(!this.instances.has(id)){const module=await registration.module();if(typeof module.createChapter!=='function')throw new Error(`Chapter module must export createChapter(): ${id}`);this.instances.set(id,module.createChapter({...this.context,...options,registration}));}this.currentId=id;const instance=this.instances.get(id);instance.group.visible=true;return instance;}
  hideCurrent(){const instance=this.instances.get(this.currentId);if(instance)instance.group.visible=false;}
  remove(id){const instance=this.instances.get(id);if(instance)this.context.book.group.remove(instance.group);this.instances.delete(id);if(this.currentId===id)this.currentId=null;}
}
