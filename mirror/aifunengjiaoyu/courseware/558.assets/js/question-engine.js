(function () {
  const STORAGE_KEY = "xytd_reading_profile_v2";

  class QuestionEngine {
    constructor(chapter, fallbackChapters = []) {
      this.chapter = chapter;
      this.fallbackChapters = Array.isArray(fallbackChapters) ? fallbackChapters.filter(Boolean) : [];
      this.profile = this.loadProfile();
      this.usedQuestions = new Set();
      this.currentIds = this.usedQuestions;
      this.usedGroups = new Set();
      this.previousIds = new Set();
      this.previousGroups = new Set();
      this.sessionLimit = 30;
      this.sessionId = "";
      this.lastResult = "ready";
    }

    loadProfile() {
      const empty = { answeredCorrect: {}, answeredWrong: {}, wrongQuestions: [], history: [] };
      try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
        return saved && typeof saved === "object" ? {
          answeredCorrect: saved.answeredCorrect || {},
          answeredWrong: saved.answeredWrong || {},
          wrongQuestions: Array.isArray(saved.wrongQuestions) ? saved.wrongQuestions : [],
          history: Array.isArray(saved.history) ? saved.history : []
        } : empty;
      } catch (error) {
        console.warn("Question history could not be loaded:", error);
        return empty;
      }
    }

    saveProfile() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.profile));
      } catch (error) {
        console.warn("Question history could not be saved:", error);
      }
    }

    startGame({ minQuestions = 25, maxQuestions = 35 } = {}) {
      const previous = this.profile.history.find(entry => entry.chapterId === this.chapter.id);
      this.previousIds = new Set(previous?.questionIds || []);
      this.previousGroups = new Set(previous?.questionGroups || []);
      this.usedQuestions = new Set();
      this.currentIds = this.usedQuestions;
      this.usedGroups = new Set();
      this.sessionLimit = minQuestions + Math.floor(Math.random() * (maxQuestions - minQuestions + 1));
      this.lastResult = "ready";
      this.sessionId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      this.profile.history.unshift({
        sessionId: this.sessionId,
        chapterId: this.chapter.id,
        startedAt: new Date().toISOString(),
        questionIds: [],
        questionGroups: []
      });
      this.profile.history = this.profile.history.slice(0, 10);
      this.saveProfile();
    }

    setSessionLimit(minQuestions, maxQuestions) {
      const nextLimit = minQuestions + Math.floor(Math.random() * (maxQuestions - minQuestions + 1));
      this.sessionLimit = Math.max(this.currentIds.size, nextLimit);
    }

    nextQuestion({ boss = false } = {}) {
      if (this.usedQuestions.size >= this.sessionLimit) {
        this.lastResult = "session-limit";
        return null;
      }

      const pools = [this.chapter, ...this.fallbackChapters];
      const unusedPools = pools.map(bank => ({
        bank,
        questions: bank.questions.filter(item => {
          if (!this.isValidQuestion(item)) return false;
          const groupId = item.groupId || item.id;
          return !this.usedQuestions.has(item.id) && !this.usedGroups.has(groupId);
        })
      }));

      let source = unusedPools.find(pool => pool.questions.some(item => {
        const groupId = item.groupId || item.id;
        return !this.previousIds.has(item.id) && !this.previousGroups.has(groupId);
      }));
      let candidates = source?.questions.filter(item => {
        const groupId = item.groupId || item.id;
        return !this.previousIds.has(item.id) && !this.previousGroups.has(groupId);
      });

      if (!candidates?.length) {
        source = unusedPools.find(pool => pool.questions.length);
        candidates = source?.questions || [];
      }
      if (!candidates.length) {
        this.lastResult = "pool-exhausted";
        return null;
      }

      const weighted = candidates.map(item => ({ item, weight: this.weight(item, boss) }));
      const total = weighted.reduce((sum, entry) => sum + entry.weight, 0);
      let cursor = Math.random() * total;
      let selected = weighted[weighted.length - 1].item;
      for (const entry of weighted) {
        cursor -= entry.weight;
        if (cursor <= 0) {
          selected = entry.item;
          break;
        }
      }

      const selectedGroup = selected.groupId || selected.id;
      this.usedQuestions.add(selected.id);
      this.usedGroups.add(selectedGroup);
      const currentSession = this.profile.history.find(entry => entry.sessionId === this.sessionId);
      if (currentSession) {
        currentSession.questionIds.push(selected.id);
        currentSession.questionGroups.push(selectedGroup);
      }
      this.saveProfile();
      this.lastResult = "drawn";
      return selected;
    }

    isValidQuestion(question) {
      return Boolean(
        question &&
        typeof question.id === "string" &&
        question.id.trim() &&
        typeof question.question === "string" &&
        question.question.trim() &&
        Array.isArray(question.options) &&
        question.options.length === 4 &&
        question.options.every(option => option && typeof option.id === "string" && typeof option.text === "string" && option.text.trim()) &&
        question.options.some(option => option.id === question.answer)
      );
    }

    getPoolStats() {
      const pools = [this.chapter, ...this.fallbackChapters];
      const loadedQuestions = pools.flatMap(bank => Array.isArray(bank?.questions) ? bank.questions : []);
      const validQuestions = loadedQuestions.filter(question => this.isValidQuestion(question));
      const invalidQuestions = loadedQuestions.filter(question => !this.isValidQuestion(question));
      const uniqueGroups = new Map();
      validQuestions.forEach(question => {
        const groupId = question.groupId || question.id;
        if (!uniqueGroups.has(groupId)) uniqueGroups.set(groupId, question);
      });
      const remainingGroups = [...uniqueGroups.keys()].filter(groupId => !this.usedGroups.has(groupId));
      const sourceTypes = {};
      uniqueGroups.forEach(question => {
        const type = question.sourceType || "未分类题";
        sourceTypes[type] = (sourceTypes[type] || 0) + 1;
      });
      return {
        chapterId: this.chapter.id,
        totalRecords: loadedQuestions.length,
        loadedValidRecords: validQuestions.length,
        enteredPool: uniqueGroups.size,
        drawn: this.usedQuestions.size,
        remainingDrawable: remainingGroups.length,
        filteredDuplicateVariants: validQuestions.length - uniqueGroups.size,
        invalidQuestions: invalidQuestions.length,
        sessionLimit: this.sessionLimit,
        sessionRemaining: Math.max(0, this.sessionLimit - this.usedQuestions.size),
        lastResult: this.lastResult,
        sourceTypes
      };
    }

    weight(question, boss) {
      const normalDifficulty = { 1: 5.5, 2: 6.5, 3: 1.4, 4: 0.6 };
      const bossDifficulty = { 1: 0.5, 2: 1.2, 3: 6.5, 4: 8 };
      const correctCount = this.profile.answeredCorrect[question.id] || 0;
      const wrongCount = this.profile.answeredWrong[question.id] || 0;
      const isWrongQuestion = this.profile.wrongQuestions.includes(question.id);
      const difficultyWeight = (boss ? bossDifficulty : normalDifficulty)[question.difficulty] || 1;
      const masteryWeight = 1 / (1 + correctCount * 0.65);
      const retryWeight = 1 + wrongCount * 1.1 + (isWrongQuestion ? 2.5 : 0);
      return Math.max(0.05, difficultyWeight * masteryWeight * retryWeight);
    }

    recordAnswer(questionId, correct) {
      if (correct) {
        this.profile.answeredCorrect[questionId] = (this.profile.answeredCorrect[questionId] || 0) + 1;
        const wrongIndex = this.profile.wrongQuestions.indexOf(questionId);
        if (wrongIndex >= 0) this.profile.wrongQuestions.splice(wrongIndex, 1);
      } else {
        this.profile.answeredWrong[questionId] = (this.profile.answeredWrong[questionId] || 0) + 1;
        if (!this.profile.wrongQuestions.includes(questionId)) this.profile.wrongQuestions.push(questionId);
      }
      this.saveProfile();
    }

    getSessionInfo() {
      return { asked: this.currentIds.size, limit: this.sessionLimit };
    }
  }

  window.QuestionEngine = QuestionEngine;
})();
