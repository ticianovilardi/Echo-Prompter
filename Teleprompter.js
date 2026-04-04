class Teleprompter {
  constructor() {
    this.pageMap = {
      reader: 'index.html',
      prompts: 'prompts.html',
      settings: 'settings.html',
    };
    this.storageKeys = {
      appView: 'promptyAppView',
      textLibrary: 'promptyTextLibrary',
      activeTextId: 'promptyActiveTextId',
      settings: 'promptySettings',
      dirtyDraft: 'promptyDirtyDraft',
    };
    this.visualProfiles = {
      mobile: {
        size: 28,
        font: "'Instrument Sans', sans-serif",
        fg: [242, 242, 242],
        highlightColor: [126, 231, 135],
        textBoxWidth: 100,
        textLineHeight: 1.15,
        fontWeight: 400,
        textAlign: 'center',
        paddingTop: 56,
        paddingRight: 16,
        paddingBottom: 180,
        paddingLeft: 16,
        readingPosition: 'top',
        readingTopMargin: 96,
        readingTopLines: 2,
      },
      tablet: {
        size: 56,
        font: "'Instrument Sans', sans-serif",
        fg: [242, 242, 242],
        highlightColor: [126, 231, 135],
        textBoxWidth: 92,
        textLineHeight: 1.2,
        fontWeight: 400,
        textAlign: 'center',
        paddingTop: 72,
        paddingRight: 32,
        paddingBottom: 180,
        paddingLeft: 32,
        readingPosition: 'top',
        readingTopMargin: 110,
        readingTopLines: 2,
      },
      desktop: {
        size: 120,
        font: "'Instrument Sans', sans-serif",
        fg: [242, 242, 242],
        highlightColor: [126, 231, 135],
        textBoxWidth: 84,
        textLineHeight: 1.25,
        fontWeight: 400,
        textAlign: 'center',
        paddingTop: 96,
        paddingRight: 56,
        paddingBottom: 160,
        paddingLeft: 56,
        readingPosition: 'top',
        readingTopMargin: 140,
        readingTopLines: 2,
      },
    };
    this.activeVisualProfile = this.getViewportVisualProfile();
    this.text = DEFAULT_TEXT_EN;
    this.textLibrary = [];
    this.activeTextId = null;
    this.appView = document.body.dataset.entryView || 'reader';
    this.filteredQuery = '';
    this.draggedScriptId = null;
    this.cleanMode = false;
    this.sessionCompleted = false;
    this.msgCounter = 0;
    this.colorWarn = true;
    this.colorWarnIdx = -1;
    this.play = false;
    this.edit = false;
    this.langValues = LANGUAGE_VALUES;
    this.showMatchIdx = -1;
    this.speechPosition = 0;
    this.micStatus = 'Idle';
    this.currentRecording = [];
    this.currentMatchArray = [];
    this.matchHistory = [];
    this.lastRenderedPosition = 0;
    this.previewPosition = 0;
    this.readingPosition = 'top';
    this.readingTopMargin = 140;
    this.readingTopLines = 2;
    this.highlightColor = [126, 231, 135];
    this.followLag = 4;
    this.speechBackendStatus = 'Web Speech API ready';
    this.resumeRecognitionTimer = null;
    this.waitingForVisibilityResume = false;
    this.scrollAnimationFrame = null;
    this.scrollFollowTarget = 0;
    this.textBoxWidth = 84;
    this.textLineHeight = 1.25;
    this.paddingTop = 96;
    this.paddingRight = 56;
    this.paddingBottom = 160;
    this.paddingLeft = 56;
    this.fontWeight = 400;
    this.textAlign = 'center';
    this.shortcuts = this.getDefaultShortcuts();
    this.dirtyPrompt = false;
    this.pendingPromptDraft = '';
    this.inlineEditSaveDelayMs = 3000;
    this.inlineEditSaveTimer = null;
    this.quickSettingsPreviouslyFocused = null;
    this.toDefaultSettings();
    this.captureElements();
    this.populateLanguageSelectors();
    if (this.editorEl)
      this.editorEl.value = this.text;
    if (this.readingEditorEl)
      this.readingEditorEl.value = this.text;
    if (this.dirtyPrompt && this.pendingPromptDraft !== '') {
      this.text = this.pendingPromptDraft;
      this.updateActiveScriptText(this.text);
      if (this.editorEl)
        this.editorEl.value = this.text;
      if (this.readingEditorEl)
        this.readingEditorEl.value = this.text;
    }
    if (this.scriptTitleEl)
      this.scriptTitleEl.value = this.getActiveTextTitle();
    this.adaptText();
    this.speechRec = null;
    this.initializeSpeechBackend();
    this.bindAppEvents();
    this.bindSettingsEvents();
    this.designControlFields = [
      'text-box-width',
      'text-size-live',
      'line-height-live',
      'font-family-live',
      'font-weight-live',
      'text-align-live',
      'highlight-color-live',
      'text-color-live',
    ];
    for (let i = 0; i < this.designControlFields.length; i++) {
      document.getElementById(this.designControlFields[i]).addEventListener('input', () => this.updateDesignControlsFromInputs());
      document.getElementById(this.designControlFields[i]).addEventListener('change', () => this.updateDesignControlsFromInputs());
    }
    this.matchTuningFields = [
      'match-short-threshold',
      'match-medium-threshold',
      'match-long-threshold',
      'match-strong-threshold',
      'match-skip-short-word-length',
      'match-required-sequential',
      'rejoin-enabled',
      'rejoin-lookahead-window',
      'rejoin-sequence-length',
      'rejoin-confidence-threshold',
      'rejoin-max-gap-in-speech',
      'rejoin-cooldown',
    ];
    for (let i = 0; i < this.matchTuningFields.length; i++) {
      const field = document.getElementById(this.matchTuningFields[i]);
      if (!field)
        continue;
      const eventName = field.type === 'checkbox' ? 'change' : 'input';
      field.addEventListener(eventName, () => this.updateMatchTuningFromInputs());
    }
    window.addEventListener('resize', () => this.handleViewportResize());
    document.addEventListener('visibilitychange', () => this.handleVisibilityChange());
    document.addEventListener('fullscreenchange', () => {
      this.cleanMode = !!document.fullscreenElement;
      document.body.classList.toggle('clean-reader', this.cleanMode);
      this.applySettings();
    });
    window.addEventListener('focus', () => this.resumeRecognitionAfterInterruption());
    this.bindLibraryEvents();
    window.addEventListener('beforeunload', evt => this.handleBeforeUnload(evt));
    this.applySettings();
  }

  captureElements() {
    this.appViewTitleEl = document.getElementById('app-view-title');
    this.activeScriptLabelEl = document.getElementById('active-script-label');
    this.sidebarTitleEl = document.getElementById('sidebar-active-title');
    this.sidebarPreviewEl = document.getElementById('sidebar-active-preview');
    this.sidebarProgressEl = document.getElementById('sidebar-progress');
    this.sidebarMicEl = document.getElementById('sidebar-mic');
    this.readerMicStatusEl = document.getElementById('reader-mic-status');
    this.readerLanguageStatusEl = document.getElementById('reader-language-status');
    this.readerLanguageStatusOverlayEl = document.getElementById('reader-language-status-overlay');
    this.readerFollowStatusEl = document.getElementById('reader-follow-status');
    this.readerBackendStatusEl = document.getElementById('reader-backend-status');
    this.readerProgressFillEl = document.getElementById('reader-progress-fill');
    this.readerProgressFillFloatingEl = document.getElementById('reader-progress-fill-floating');
    this.readerProgressPercentEl = document.getElementById('reader-progress-percent');
    this.readerProgressPercentFloatingEl = document.getElementById('reader-progress-percent-floating');
    this.readerProgressMetaEl = document.getElementById('reader-progress-meta');
    this.readerProgressMetaChipEl = document.getElementById('reader-progress-meta-chip');
    this.readerSessionStatusChipEl = document.getElementById('reader-session-status-chip');
    this.playToggleEl = document.getElementById('reader-play-toggle');
    this.cleanToggleEl = document.getElementById('reader-clean-toggle');
    this.readerMicStatusOverlayEl = document.getElementById('reader-mic-status-overlay');
    this.scriptTitleEl = document.getElementById('script-title');
    this.editorEl = document.getElementById('prompt-editor');
    this.readingEditorEl = document.getElementById('text_editor');
    this.scriptSearchEl = document.getElementById('script-search');
    this.scriptListEl = document.getElementById('script-list');
    this.scriptLibraryStatusEl = document.getElementById('script-library-status');
    this.readerScriptNavEl = document.getElementById('reader-script-nav');
    this.readerScriptSwitcherEl = document.getElementById('reader-script-switcher');
    this.readerScriptSwitcherLabelEl = document.getElementById('reader-script-switcher-label');
    this.readerScriptOptionsEl = document.getElementById('reader-script-options');
    this.readerPrevScriptEl = document.getElementById('reader-prev-script');
    this.readerNextScriptEl = document.getElementById('reader-next-script');
    this.readerEditQuickEl = document.getElementById('reader-edit-quick');
    this.editorDirtyStateEl = document.getElementById('editor-dirty-state');
    this.editorWordCountEl = document.getElementById('editor-word-count');
    this.languageGroupEl = document.getElementById('language-group');
    this.languageVariantEl = document.getElementById('language-variant');
    this.showRecToggleEl = document.getElementById('showrec-toggle');
    this.mirrorHToggleEl = document.getElementById('mirrorh-toggle');
    this.mirrorVToggleEl = document.getElementById('mirrorv-toggle');
    this.quickSettingsBackdropEl = document.getElementById('quick-settings-backdrop');
    this.quickSettingsPanelEl = document.getElementById('quick-settings-panel');
    this.quickTextSizeEl = document.getElementById('quick-text-size');
    this.quickTextSizeValueEl = document.getElementById('quick-text-size-value');
    this.quickTextWidthEl = document.getElementById('quick-text-width');
    this.quickTextWidthValueEl = document.getElementById('quick-text-width-value');
    this.quickLineHeightEl = document.getElementById('quick-line-height');
    this.quickLineHeightValueEl = document.getElementById('quick-line-height-value');
    this.quickPaddingTopEl = document.getElementById('quick-padding-top');
    this.quickPaddingTopValueEl = document.getElementById('quick-padding-top-value');
    this.quickPaddingTopManualEl = document.getElementById('quick-padding-top-manual');
    this.quickPaddingRightEl = document.getElementById('quick-padding-right');
    this.quickPaddingRightValueEl = document.getElementById('quick-padding-right-value');
    this.quickPaddingRightManualEl = document.getElementById('quick-padding-right-manual');
    this.quickPaddingBottomEl = document.getElementById('quick-padding-bottom');
    this.quickPaddingBottomValueEl = document.getElementById('quick-padding-bottom-value');
    this.quickPaddingBottomManualEl = document.getElementById('quick-padding-bottom-manual');
    this.quickPaddingLeftEl = document.getElementById('quick-padding-left');
    this.quickPaddingLeftValueEl = document.getElementById('quick-padding-left-value');
    this.quickPaddingLeftManualEl = document.getElementById('quick-padding-left-manual');
    this.quickFontFamilyEl = document.getElementById('quick-font-family');
    this.quickHighlightColorEl = document.getElementById('quick-highlight-color');
    this.quickTextColorEl = document.getElementById('quick-text-color');
    this.quickTextAlignEl = document.getElementById('quick-text-align');
    this.shortcutPlayPauseEl = document.getElementById('shortcut-play-pause');
    this.shortcutRestartEl = document.getElementById('shortcut-restart');
    this.shortcutFullscreenEl = document.getElementById('shortcut-fullscreen');
    this.shortcutEditEl = document.getElementById('shortcut-edit');
    this.messagesEl = document.getElementById('messages');
    this.currentFile = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
  }

  bindAppEvents() {
    const readerRestartEl = document.getElementById('reader-restart');
    const openQuickPanelTopEl = document.getElementById('reader-open-quick-panel');
    const openQuickPanelBottomEl = document.getElementById('reader-open-quick-panel-bottom');
    const openSettingsModalEl = document.getElementById('reader-open-settings-modal');
    const quickSettingsCloseEl = document.getElementById('quick-settings-close');
    const prevEl = document.getElementById('prev');
    const nextEl = document.getElementById('next');
    const lastEl = document.getElementById('last');

    if (readerRestartEl)
      readerRestartEl.addEventListener('click', () => this.restartReading());
    if (this.playToggleEl)
      this.playToggleEl.addEventListener('click', () => this.togglePlayback());
    if (this.cleanToggleEl)
      this.cleanToggleEl.addEventListener('click', () => this.toggleFullscreenMode());
    if (openQuickPanelTopEl)
      openQuickPanelTopEl.addEventListener('click', evt => this.openQuickSettings(evt.currentTarget));
    if (openQuickPanelBottomEl)
      openQuickPanelBottomEl.addEventListener('click', evt => this.openQuickSettings(evt.currentTarget));
    if (openSettingsModalEl)
      openSettingsModalEl.addEventListener('click', () => {
        const settingsModal = document.getElementById('settings-modal');
        if (settingsModal)
          settingsModal.showModal();
      });
    if (quickSettingsCloseEl)
      quickSettingsCloseEl.addEventListener('click', () => this.closeQuickSettings());
    if (this.quickSettingsBackdropEl)
      this.quickSettingsBackdropEl.addEventListener('click', () => this.closeQuickSettings());
    if (this.quickSettingsPanelEl)
      this.quickSettingsPanelEl.addEventListener('keydown', evt => {
        if (evt.key === 'Escape')
          this.closeQuickSettings();
      });
    document.addEventListener('keydown', evt => this.handleGlobalShortcut(evt));
    if (prevEl)
      prevEl.addEventListener('click', () => this.showPrevious());
    if (nextEl)
      nextEl.addEventListener('click', () => this.showNext());
    if (lastEl)
      lastEl.addEventListener('click', () => this.showLast());
    if (this.readingEditorEl)
      this.readingEditorEl.addEventListener('input', () => this.handleInlineReaderEditInput());
    if (this.readerPrevScriptEl)
      this.readerPrevScriptEl.addEventListener('click', () => this.switchReaderScriptByOffset(-1));
    if (this.readerNextScriptEl)
      this.readerNextScriptEl.addEventListener('click', () => this.switchReaderScriptByOffset(1));
    if (this.readerScriptOptionsEl) {
      this.readerScriptOptionsEl.addEventListener('click', evt => {
        const optionButton = evt.target.closest('[data-reader-script-id]');
        if (!optionButton)
          return;
        this.selectScript(optionButton.dataset.readerScriptId);
        if (this.readerScriptSwitcherEl)
          this.readerScriptSwitcherEl.removeAttribute('open');
      });
    }
    document.addEventListener('click', evt => {
      if (!this.readerScriptSwitcherEl || !this.readerScriptSwitcherEl.open)
        return;
      if (this.readerScriptSwitcherEl.contains(evt.target))
        return;
      this.readerScriptSwitcherEl.removeAttribute('open');
    });
  }

  bindLibraryEvents() {
    const newScriptEl = document.getElementById('new-script');
    const saveScriptEl = document.getElementById('save-script');
    const deleteScriptEl = document.getElementById('delete-script');
    const duplicateScriptEl = document.getElementById('duplicate-script');

    if (newScriptEl)
      newScriptEl.addEventListener('click', () => this.createNewScript());
    if (saveScriptEl)
      saveScriptEl.addEventListener('click', () => this.saveCurrentScript());
    if (deleteScriptEl)
      deleteScriptEl.addEventListener('click', () => this.deleteCurrentScript());
    if (duplicateScriptEl)
      duplicateScriptEl.addEventListener('click', () => this.duplicateCurrentScript());
    if (this.scriptTitleEl)
      this.scriptTitleEl.addEventListener('input', () => this.markPromptDirty());
    if (this.scriptTitleEl)
      this.scriptTitleEl.addEventListener('change', () => this.renameActiveScript());
    if (this.editorEl) {
      this.editorEl.addEventListener('input', () => this.syncPromptEditors());
      this.editorEl.addEventListener('blur', () => this.persistDraftState());
    }
    if (this.scriptSearchEl) {
      this.scriptSearchEl.addEventListener('input', evt => {
        this.filteredQuery = evt.target.value || '';
        this.renderTextLibrary();
      });
    }
  }

  bindSettingsEvents() {
    const readingPositionEl = document.getElementById('reading-position');
    const readingTopMarginEl = document.getElementById('reading-top-margin');
    const readingTopLinesEl = document.getElementById('reading-top-lines');
    const highlightColorEl = document.getElementById('highlight-color');
    const followLagEl = document.getElementById('follow-lag');
    const restoreDefaultsEl = document.getElementById('restore-defaults');
    const shortcutFields = [
      this.shortcutPlayPauseEl,
      this.shortcutRestartEl,
      this.shortcutFullscreenEl,
      this.shortcutEditEl,
    ];

    if (readingPositionEl) {
      readingPositionEl.addEventListener('change', evt => {
        this.readingPosition = evt.target.value;
        this.applySettings();
      });
    }
    if (readingTopMarginEl) {
      readingTopMarginEl.addEventListener('input', evt => {
        let value = parseInt(evt.target.value);
        if (isNaN(value)) value = 0;
        this.readingTopMargin = min(max(value, 0), 600);
        evt.target.value = this.readingTopMargin;
        this.applySettings();
      });
    }
    if (readingTopLinesEl) {
      readingTopLinesEl.addEventListener('input', evt => {
        let value = parseInt(evt.target.value);
        if (isNaN(value)) value = 2;
        this.readingTopLines = min(max(value, 1), 6);
        evt.target.value = this.readingTopLines;
        this.applySettings();
      });
    }
    if (highlightColorEl) {
      highlightColorEl.addEventListener('input', evt => {
        this.highlightColor = this.hexToRgb(evt.target.value);
        this.applySettings();
      });
    }
    if (followLagEl) {
      followLagEl.addEventListener('input', evt => {
        this.followLag = parseInt(evt.target.value);
        this.applySettings();
      });
    }
    if (this.languageGroupEl)
      this.languageGroupEl.addEventListener('change', () => this.handleLanguageGroupChange());
    if (this.languageVariantEl)
      this.languageVariantEl.addEventListener('change', () => this.handleLanguageVariantChange());
    if (this.showRecToggleEl) {
      this.showRecToggleEl.addEventListener('change', evt => {
        this.showrec = evt.target.checked;
        this.applySettings();
      });
    }
    if (this.mirrorHToggleEl) {
      this.mirrorHToggleEl.addEventListener('change', evt => {
        this.mirrorh = evt.target.checked;
        this.applySettings();
      });
    }
    if (this.mirrorVToggleEl) {
      this.mirrorVToggleEl.addEventListener('change', evt => {
        this.mirrorv = evt.target.checked;
        this.applySettings();
      });
    }
    if (restoreDefaultsEl)
      restoreDefaultsEl.addEventListener('click', () => this.restoreDefaultSettings());
    for (let i = 0; i < shortcutFields.length; i++) {
      if (!shortcutFields[i])
        continue;
      shortcutFields[i].addEventListener('keydown', evt => this.captureShortcutInput(evt));
      shortcutFields[i].addEventListener('blur', () => this.syncShortcutInputs());
    }
    if (this.quickTextSizeEl) {
      this.quickTextSizeEl.addEventListener('input', evt => {
        this.size = parseInt(evt.target.value);
        this.applySettings();
      });
    }
    if (this.quickTextWidthEl) {
      this.quickTextWidthEl.addEventListener('input', evt => {
        this.textBoxWidth = parseInt(evt.target.value);
        this.applySettings();
      });
    }
    if (this.quickLineHeightEl) {
      this.quickLineHeightEl.addEventListener('input', evt => {
        this.textLineHeight = parseInt(evt.target.value) / 100;
        this.applySettings();
      });
    }
    if (this.quickPaddingTopEl) {
      this.quickPaddingTopEl.addEventListener('input', evt => {
        this.paddingTop = this.normalizePaddingValue(evt.target.value);
        if (this.quickPaddingTopManualEl)
          this.quickPaddingTopManualEl.value = `${this.paddingTop}`;
        this.applySettings();
      });
    }
    if (this.quickPaddingTopManualEl) {
      this.quickPaddingTopManualEl.addEventListener('input', evt => {
        this.paddingTop = this.normalizePaddingValue(evt.target.value);
        this.applySettings();
      });
    }
    if (this.quickPaddingRightEl) {
      this.quickPaddingRightEl.addEventListener('input', evt => {
        this.paddingRight = this.normalizePaddingValue(evt.target.value);
        if (this.quickPaddingRightManualEl)
          this.quickPaddingRightManualEl.value = `${this.paddingRight}`;
        this.applySettings();
      });
    }
    if (this.quickPaddingRightManualEl) {
      this.quickPaddingRightManualEl.addEventListener('input', evt => {
        this.paddingRight = this.normalizePaddingValue(evt.target.value);
        this.applySettings();
      });
    }
    if (this.quickPaddingBottomEl) {
      this.quickPaddingBottomEl.addEventListener('input', evt => {
        this.paddingBottom = this.normalizePaddingValue(evt.target.value);
        if (this.quickPaddingBottomManualEl)
          this.quickPaddingBottomManualEl.value = `${this.paddingBottom}`;
        this.applySettings();
      });
    }
    if (this.quickPaddingBottomManualEl) {
      this.quickPaddingBottomManualEl.addEventListener('input', evt => {
        this.paddingBottom = this.normalizePaddingValue(evt.target.value);
        this.applySettings();
      });
    }
    if (this.quickPaddingLeftEl) {
      this.quickPaddingLeftEl.addEventListener('input', evt => {
        this.paddingLeft = this.normalizePaddingValue(evt.target.value);
        if (this.quickPaddingLeftManualEl)
          this.quickPaddingLeftManualEl.value = `${this.paddingLeft}`;
        this.applySettings();
      });
    }
    if (this.quickPaddingLeftManualEl) {
      this.quickPaddingLeftManualEl.addEventListener('input', evt => {
        this.paddingLeft = this.normalizePaddingValue(evt.target.value);
        this.applySettings();
      });
    }
    if (this.quickFontFamilyEl) {
      this.quickFontFamilyEl.addEventListener('change', evt => {
        this.font = evt.target.value;
        this.applySettings();
      });
    }
    if (this.quickHighlightColorEl) {
      this.quickHighlightColorEl.addEventListener('input', evt => {
        this.highlightColor = this.hexToRgb(evt.target.value);
        this.applySettings();
      });
    }
    if (this.quickTextColorEl) {
      this.quickTextColorEl.addEventListener('input', evt => {
        this.fg = this.hexToRgb(evt.target.value);
        this.applySettings();
      });
    }
    if (this.quickTextAlignEl) {
      this.quickTextAlignEl.addEventListener('change', evt => {
        this.textAlign = evt.target.value;
        this.applySettings();
      });
    }
  }

  hasReaderSurface() {
    return this.readingEditorEl !== null && document.getElementById('play_text') !== null;
  }

  hasPromptEditor() {
    return this.editorEl !== null && this.scriptTitleEl !== null;
  }

  hasSettingsPanel() {
    return this.languageGroupEl !== null;
  }

  readStorage(key) {
    try {
      return JSON.parse(localStorage.getItem(key));
    } catch (error) {
      return null;
    }
  }

  writeStorage(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {}
  }

  normalizePaddingValue(value) {
    const parsedValue = parseInt(value);
    if (isNaN(parsedValue))
      return 0;
    return min(max(parsedValue, 0), 10000);
  }

  getViewportVisualProfile() {
    const width = window.innerWidth || document.documentElement.clientWidth || 1024;
    if (width <= 640)
      return 'mobile';
    if (width <= 1024)
      return 'tablet';
    return 'desktop';
  }

  getVisualTextSizeMin() {
    if (this.activeVisualProfile === 'mobile')
      return 18;
    if (this.activeVisualProfile === 'tablet')
      return 24;
    return 40;
  }

  getCurrentVisualSettings() {
    return {
      size: this.size,
      font: this.font,
      fg: this.fg,
      highlightColor: this.highlightColor,
      textBoxWidth: this.textBoxWidth,
      textLineHeight: this.textLineHeight,
      fontWeight: this.fontWeight,
      textAlign: this.textAlign,
      paddingTop: this.paddingTop,
      paddingRight: this.paddingRight,
      paddingBottom: this.paddingBottom,
      paddingLeft: this.paddingLeft,
      readingPosition: this.readingPosition,
      readingTopMargin: this.readingTopMargin,
      readingTopLines: this.readingTopLines,
    };
  }

  applyVisualSettingsForProfile(profile, storedProfile = null) {
    const visualSettings = {
      ...(this.visualProfiles[profile] || this.visualProfiles.desktop),
      ...(storedProfile && typeof storedProfile === 'object' ? storedProfile : {}),
    };
    this.size = visualSettings.size || this.size;
    this.font = visualSettings.font || this.font;
    this.fg = visualSettings.fg || this.fg;
    this.highlightColor = visualSettings.highlightColor || this.highlightColor;
    this.textBoxWidth = visualSettings.textBoxWidth || this.textBoxWidth;
    this.textLineHeight = visualSettings.textLineHeight || this.textLineHeight;
    this.fontWeight = visualSettings.fontWeight || this.fontWeight;
    this.textAlign = visualSettings.textAlign || this.textAlign;
    this.paddingTop = visualSettings.paddingTop ?? this.paddingTop;
    this.paddingRight = visualSettings.paddingRight ?? this.paddingRight;
    this.paddingBottom = visualSettings.paddingBottom ?? this.paddingBottom;
    this.paddingLeft = visualSettings.paddingLeft ?? this.paddingLeft;
    this.readingPosition = visualSettings.readingPosition || this.readingPosition;
    this.readingTopMargin = visualSettings.readingTopMargin || this.readingTopMargin;
    this.readingTopLines = visualSettings.readingTopLines || this.readingTopLines;
  }

  syncVisualControlRanges() {
    const minSize = this.getVisualTextSizeMin();
    if (this.quickTextSizeEl)
      this.quickTextSizeEl.min = `${minSize}`;
    const textSizeLiveEl = document.getElementById('text-size-live');
    if (textSizeLiveEl)
      textSizeLiveEl.min = `${minSize}`;
    this.size = min(max(this.size, minSize), 220);
  }

  handleViewportResize() {
    const nextProfile = this.getViewportVisualProfile();
    if (nextProfile === this.activeVisualProfile) {
      this.applySettings();
      return;
    }
    const storedSettings = this.readStorage(this.storageKeys.settings) || {};
    const storedProfiles = storedSettings.visualProfiles && typeof storedSettings.visualProfiles === 'object'
      ? storedSettings.visualProfiles
      : {};
    storedProfiles[this.activeVisualProfile] = this.getCurrentVisualSettings();
    this.writeStorage(this.storageKeys.settings, {
      ...storedSettings,
      visualProfiles: storedProfiles,
    });
    this.activeVisualProfile = nextProfile;
    this.applyVisualSettingsForProfile(nextProfile, storedProfiles[nextProfile]);
    this.syncVisualControlRanges();
    this.applySettings();
  }

  startStopwatchSafely() {
    if (typeof startStopwatch === 'function')
      startStopwatch();
  }

  pauseStopwatchSafely() {
    if (typeof pauseStopwatch === 'function')
      pauseStopwatch();
  }

  resetStopwatchSafely() {
    if (typeof resetStopwatch === 'function')
      resetStopwatch();
  }

  showPrevious() {
    if (this.showMatchIdx == -1 && this.matchHistory.length > 0) {
      this.showMatchIdx = this.matchHistory.length - 1;
      this.applySettings();
    } else if (this.showMatchIdx > 0) {
      this.showMatchIdx--;
      this.applySettings();
    }
  }

  showNext() {
    if (this.showMatchIdx + 1 == this.matchHistory.length) {
      this.showMatchIdx = -1;
      this.applySettings();
    } else if (this.showMatchIdx + 1 < this.matchHistory.length) {
      this.showMatchIdx++;
      this.applySettings();
    }
  }

  showLast() {
    this.showMatchIdx = -1;
    this.applySettings();
  }

  adaptText() {
    const regex = /[\x00-\x2f\x3a-\x40\x5b-\x60\x7b-\xbf\xd7\xf7]+/gm;
    this.recText = [];
    this.splitText = [];
    let match;
    let idx = 0;
    while ((match = regex.exec(this.text)) !== null) {
      if (match.index > idx) {
        const word = this.text.substring(idx, match.index);
        this.recText.push({ idx: this.splitText.length, word: simplify(word) })
        this.splitText.push(word);
      }
      this.splitText.push(match[0]);
      idx = match.index + match[0].length;
    }
    if (this.text.length > idx) {
      const word = this.text.substring(idx, this.text.length);
      this.recText.push({ idx: this.splitText.length, word: simplify(word) })
      this.splitText.push(word);
    }
    let playText = '';
    idx = 0;
    let recText2 = [...this.recText];
    if (recText2.length === 0) {
      playText = '<span id="word_0"></span>&#8203;';
      this.numWordSpans = 1;
    } else {
      if (recText2[recText2.length - 1].idx != this.splitText.length - 1)
        recText2.push({ idx: this.splitText.length - 1 });
      this.numWordSpans = recText2.length;
      for (let i = 0; i < this.numWordSpans; i++) {
        playText += `<span id="word_${i}">`;
        for (; idx <= (i + 1 < recText2.length ? recText2[i + 1].idx - 1 : recText2[i].idx); idx++)
          playText += escapeHtml(this.splitText[idx]);
        playText += '</span>&#8203;';
      }
    }
    const playTextEl = document.getElementById('play_text');
    if (playTextEl !== null) {
      playTextEl.innerHTML = playText;
      for (let i = 0; i < this.numWordSpans; i++) {
        const wordEl = document.getElementById(`word_${i}`);
        if (wordEl !== null)
          wordEl.addEventListener('click', () => this.wordClick(i));
      }
    }
    this.currentPosition = 0;
  }

  settingsClick(setting) {
    if (setting == 'play') {
      if (!this.edit) {
        if (this.play) {
          this.pause();
          this.pauseStopwatchSafely();
        } else {
          this.start();
          this.startStopwatchSafely();
        }
      }
      this.applySettings();
    } else if (setting == 'restart') {
      this.stop();
      this.resetStopwatchSafely();
      this.applySettings();
    } else if (setting == 'edit') {
      this.pause();
      if (this.edit) {
        const editDiv = document.getElementById('edit_text_div');
        const readingScrollTop = editDiv ? editDiv.scrollTop : 0;
        this.flushInlineReaderEdit();
        this.edit = false;
        const playDiv = document.getElementById('play_div');
        if (playDiv)
          playDiv.scrollTop = readingScrollTop;
      } else {
        const playDiv = document.getElementById('play_div');
        const editDiv = document.getElementById('edit_text_div');
        this.edit = true;
        if (this.readingEditorEl) {
          this.readingEditorEl.value = this.text;
          this.resizeInlineReaderEditor();
        }
        if (editDiv)
          editDiv.scrollTop = playDiv ? playDiv.scrollTop : 0;
        window.setTimeout(() => {
          if (this.readingEditorEl) {
            this.readingEditorEl.focus();
            if (playDiv)
              document.getElementById('edit_text_div').scrollTop = playDiv.scrollTop;
          }
        }, 0);
      }
      this.applySettings();
    } else if (setting == 'clear') {
      this.stop();
      this.toFactorySettings();
      this.applySettings();
    } else if (typeof this[setting] === 'boolean') {
      this[setting] = !this[setting];
      this.applySettings();
    } else if (typeof this[setting] === 'number' || typeof this[setting] === 'string' || typeof this[setting] === 'object') {
      this.pause();
      const position = document.getElementById(`s_${setting}`).getBoundingClientRect();
      let editElement = '';
      if (setting == 'lang') {
        editElement += `<select id="editor_${setting}">`;
        for (let i = 0; i < this.langValues.length; i++) {
          let sel = '';
          for (let k = 1; k < this.langValues[i].length; k++) {
            if (this.langValues[i][k][0] == this.lang) {
              sel = ' selected';
              break;
            }
          }
          editElement += `<option value="${i}"${sel}>${this.langValues[i][0]}</option>`;
        }
        editElement += `</select><span id="editor_${setting}_refine"></span>`;
      } else if (typeof this[setting] === 'number') {
        editElement += `<input type="number" id="editor_${setting}" value="${this[setting]}" />`;
      } else if (typeof this[setting] === 'string') {
        editElement += `<input type="text" id="editor_${setting}" value="${this[setting]}" />`;
      } else if (typeof this[setting] === 'object') {
        editElement += `<input type="text" id="editor_${setting}" value="${this[setting].join(', ')}" />`;
      }
      const newDiv = document.createElement('div');
      newDiv.setAttribute('id', 'editor_div');
      newDiv.style.zIndex = '21';
      newDiv.style.position = 'fixed';
      newDiv.style.left = `${position.left}px`;
      newDiv.style.top = `${position.top}px`;
      newDiv.innerHTML = `<div id="edit_s_${setting}" class="s_item s_edit"><div class="s_flex">
        <div class="s_icon" id="edit_s_${setting}_icon">
          <img src="icons/${setting}-${rgbToLum(...this.bg) < 0.5 ? 'white' : 'black'}.svg" class="s_img" id="edit_s_${setting}_img" />
        </div>${editElement}
      </div></div>`;
      document.body.appendChild(newDiv);
      document.getElementById('disable_block').style.display = 'block';
      document.getElementById(`editor_${setting}`).addEventListener('change', () => this.editChange(setting));
      if (setting == 'lang')
        this.adaptLanguageSelector();
    }
  }

  wordClick(numWord) {
    if (this.play) {
      this.currentPosition = min(numWord, this.recText.length);
      this.lastRenderedPosition = this.currentPosition;
      this.previewPosition = this.currentPosition;
      if (this.speechRec !== null) this.speechRec.reset(this.lang);
      this.speechPosition = 0;
      this.currentRecording = [];
      this.currentMatchArray = [];
      if (this.currentPosition >= this.recText.length)
        this.stop();
      else
        this.speechRec.start();
      this.applySettings();
    }
  }

  start() {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
          stream.getTracks().forEach(track => track.stop());
          this.startRecognition();
        })
        .catch(() => {
          this.play = false;
          this.micStatus = 'Microphone blocked';
          this.addMessage('error', 'Could not access the microphone. Check browser site permissions and Windows input device settings.');
          this.applySettings();
        });
    } else {
      this.startRecognition();
    }
  }

  startRecognition(resetTracking = true) {
    if (this.resumeRecognitionTimer !== null) {
      window.clearTimeout(this.resumeRecognitionTimer);
      this.resumeRecognitionTimer = null;
    }
    if (this.speechRec !== null) this.speechRec.stop();
    this.play = true;
    this.sessionCompleted = false;
    this.showrec = true;
    this.lastRenderedPosition = this.currentPosition;
    this.previewPosition = this.currentPosition;
    if (resetTracking) {
      this.speechPosition = 0;
      this.currentRecording = [];
      this.currentMatchArray = [];
    }
    this.waitingForVisibilityResume = false;
    this.micStatus = `Starting ${this.getSpeechBackendLabel()} (${this.lang})`;
    this.initializeSpeechBackend();
    this.speechRec.start();
    this.applySettings();
  }

  stop(resetPosition = true) {
    if (this.resumeRecognitionTimer !== null) {
      window.clearTimeout(this.resumeRecognitionTimer);
      this.resumeRecognitionTimer = null;
    }
    if (this.speechRec !== null) this.speechRec.stop();
    this.stopSmoothScroll();
    this.play = false;
    this.waitingForVisibilityResume = false;
    if (resetPosition) {
      this.currentPosition = 0;
      this.lastRenderedPosition = 0;
      this.previewPosition = 0;
      this.sessionCompleted = false;
      this.micStatus = 'Stopped';
      this.speechBackendStatus = `${this.getSpeechBackendLabel()} stopped`;
    } else {
      this.currentPosition = this.recText.length;
      this.lastRenderedPosition = this.currentPosition;
      this.previewPosition = this.currentPosition;
      this.sessionCompleted = true;
      this.micStatus = 'Sesión completada';
      this.speechBackendStatus = `${this.getSpeechBackendLabel()} completed`;
    }
    this.pauseStopwatchSafely();
  }

  pause() {
    if (this.resumeRecognitionTimer !== null) {
      window.clearTimeout(this.resumeRecognitionTimer);
      this.resumeRecognitionTimer = null;
    }
    if (this.speechRec !== null) this.speechRec.stop();
    this.stopSmoothScroll();
    this.play = false;
    this.waitingForVisibilityResume = false;
    this.lastRenderedPosition = this.currentPosition;
    this.previewPosition = this.currentPosition;
    this.micStatus = 'Paused';
    this.speechBackendStatus = `${this.getSpeechBackendLabel()} paused`;
    this.pauseStopwatchSafely();
  }

  speechResult(type, finalRes, interimRes) {
    if (type == 'start') {
      this.micStatus = `Listening (${this.lang})`;
      this.speechBackendStatus = `${this.getSpeechBackendLabel()} active`;
      this.applySettings();
    } else if (type == 'status') {
      this.micStatus = interimRes;
      this.speechBackendStatus = interimRes;
      this.applySettings();
    } else if (type == 'error') {
      this.micStatus = interimRes;
      this.speechBackendStatus = interimRes;
      this.addMessage('error', interimRes);
      if (this.speechRec !== null) this.speechRec.stop();
      this.applySettings();
    } else if (type == 'end') {
      // Browsers can stop speech recognition after a short silence.
      // Keep listening while the teleprompter is still running.
        if (this.play && this.currentPosition < this.recText.length) {
          if (document.hidden) {
            this.waitingForVisibilityResume = true;
            this.micStatus = 'Backgrounded, waiting to resume';
            this.speechBackendStatus = 'Backgrounded, waiting to resume';
            this.applySettings();
          } else {
            this.micStatus = 'Reconnecting microphone...';
            this.speechBackendStatus = 'Reconnecting microphone...';
            this.applySettings();
            this.resumeRecognitionAfterInterruption(150);
          }
        }
    } else if (type == 'result') {
      finalRes = splitResult(finalRes);
      interimRes = splitResult(interimRes);
      this.currentRecording = finalRes;
      for (let i = 0; i < interimRes.length; i++)
        this.currentRecording.push(interimRes[i]);
      let match;
      const previousPosition = this.currentPosition;
      [this.previewPosition, this.speechPosition, this.currentMatchArray, match] =
        matchText(this.recText, previousPosition, this.currentRecording, this.speechPosition, this.currentMatchArray);
      this.currentPosition = getConfirmedPosition(
        this.recText,
        previousPosition,
        this.currentRecording,
        this.speechPosition,
        this.currentMatchArray
      );
      this.previewPosition = this.currentPosition;
      this.matchHistory.push(match);
      this.micStatus = `Heard ${this.currentRecording.length} word${this.currentRecording.length === 1 ? '' : 's'} (${this.lang})`;
      this.speechBackendStatus = `${this.getSpeechBackendLabel()} returned text`;
      if (this.currentPosition >= this.recText.length)
        this.stop(false);
      this.applySettings();
    }
  }

  adaptLanguageSelector() {
    let needSecondSel = -1;
    for (let i = 0; i < this.langValues.length; i++) {
      for (let k = 1; k < this.langValues[i].length; k++) {
        if (this.langValues[i][k][0] == this.lang) {
          if (this.langValues[i].length > 2)
            needSecondSel = i;
          break;
        }
      }
    }
    if (needSecondSel == -1) {
      document.getElementById('editor_lang_refine').innerHTML = '';
    } else {
      let editElement = '';
      editElement += `<select id="editorref_lang">`;
      for (let k = 1; k < this.langValues[needSecondSel].length; k++) {
        let sel = '';
        if (this.langValues[needSecondSel][k][0] == this.lang) sel = ' selected';
        editElement += `<option value="${k}"${sel}>${this.langValues[needSecondSel][k][1]}</option>`;
      }
      editElement += `</select>`;
      document.getElementById('editor_lang_refine').innerHTML = editElement;
      document.getElementById('editorref_lang').addEventListener('change', () => this.editChange('lang'));
    }
  }

  editChange(setting) {
    if (setting == 'lang') {
      const primaryIdx = parseInt(document.getElementById(`editor_${setting}`).value);
      let secondaryIdx = 1;
      if (typeof document.getElementById(`editorref_${setting}`) === 'object' && document.getElementById(`editorref_${setting}`) !== null)
        secondaryIdx = parseInt(document.getElementById(`editorref_${setting}`).value);
      secondaryIdx = min(this.langValues[primaryIdx].length - 1, secondaryIdx);
      this.lang = this.langValues[primaryIdx][secondaryIdx][0];
      if (this.speechRec !== null)
        this.speechRec.reset(this.lang);
      this.adaptLanguageSelector();
    } else if (typeof this[setting] === 'number') {
      let value = parseInt(document.getElementById(`editor_${setting}`).value);
      if (isNaN(value)) value = 1; if (value < 1) value = 1;
      this[setting] = value;
      document.getElementById(`editor_${setting}`).value = value;
    } else if (typeof this[setting] === 'string') {
      this[setting] = document.getElementById(`editor_${setting}`).value;
    } else if (typeof this[setting] === 'object') {
      let value = [0, 0, 0];
      if (document.getElementById(`editor_${setting}`).value.search(/^ *([0-9]+), *([0-9]+), *([0-9]+) *$/) != -1) {
        const match = document.getElementById(`editor_${setting}`).value.match(/^ *([0-9]+), *([0-9]+), *([0-9]+) *$/);
        let r = parseInt(match[1]); let g = parseInt(match[2]); let b = parseInt(match[3]);
        if (isNaN(r)) r = 0; if (r < 0) r = 0; if (r > 255) r = 255;
        if (isNaN(g)) g = 0; if (g < 0) g = 0; if (g > 255) g = 255;
        if (isNaN(b)) b = 0; if (b < 0) b = 0; if (b > 255) b = 255;
        value = [r, g, b];
      }
      this.colorWarn = true;
      this[setting] = value;
      document.getElementById(`editor_${setting}`).value = value.join(', ');
    }
    if (this.font[0] != "'" && this.font.search(/ /g) != -1)
      this.font = `'${this.font}'`;
    if (this.size < 16) this.size = 16;
    if (this.size > 500) this.size = 500;
    if (this.margin > 1000) this.margin = 1000;
  }

  editFinishedClick() {
    this.text = document.getElementById('text_editor').value;
    this.updateActiveScriptText(this.text);
    this.adaptText();
    const editor = document.getElementById('editor_div');
    if (editor !== null)
      document.body.removeChild(editor);
    document.getElementById('disable_block').style.display = 'none';
    this.applySettings();
  }

  toFactorySettings() {
    this.lang = 'es-AR';
    this.bg = [13, 17, 23];
    this.fg = [242, 242, 242];
    this.size = 120;
    this.font = "'Instrument Sans', sans-serif";
    this.margin = 56;
    this.paddingTop = 96;
    this.paddingRight = 56;
    this.paddingBottom = 160;
    this.paddingLeft = 56;
    this.mirrorv = false;
    this.mirrorh = false;
    this.showrec = true;
    this.readingPosition = 'top';
    this.readingTopMargin = 140;
    this.readingTopLines = 2;
    this.highlightColor = [126, 231, 135];
    this.followLag = 4;
    this.textBoxWidth = 84;
    this.textLineHeight = 1.25;
    this.fontWeight = 400;
    this.textAlign = 'center';
    this.matchTuning = this.getDefaultMatchTuning();
    this.shortcuts = this.getDefaultShortcuts();
    this.speechBackendStatus = 'Web Speech API ready';
    this.activeVisualProfile = this.getViewportVisualProfile();
    this.applyVisualSettingsForProfile(this.activeVisualProfile);
  }

  toDefaultSettings() {
    this.toFactorySettings();
    this.loadTextLibrary();
    const storedView = this.readStorage(this.storageKeys.appView);
    const storedSettings = this.readStorage(this.storageKeys.settings);
    const storedDraft = this.readStorage(this.storageKeys.dirtyDraft);
    if (!document.body.dataset.entryView && typeof storedView === 'string')
      this.appView = storedView;
    if (storedSettings && typeof storedSettings === 'object') {
      const storedProfiles = storedSettings.visualProfiles && typeof storedSettings.visualProfiles === 'object'
        ? storedSettings.visualProfiles
        : {};
      this.lang = storedSettings.lang || this.lang;
      this.bg = storedSettings.bg || this.bg;
      this.margin = storedSettings.margin || this.margin;
      this.mirrorv = typeof storedSettings.mirrorv === 'boolean' ? storedSettings.mirrorv : this.mirrorv;
      this.mirrorh = typeof storedSettings.mirrorh === 'boolean' ? storedSettings.mirrorh : this.mirrorh;
      this.showrec = typeof storedSettings.showrec === 'boolean' ? storedSettings.showrec : this.showrec;
      this.followLag = storedSettings.followLag || this.followLag;
      this.matchTuning = this.normalizeMatchTuning(storedSettings.matchTuning);
      this.shortcuts = this.normalizeShortcuts(storedSettings.shortcuts);
      this.applyVisualSettingsForProfile(this.activeVisualProfile, storedProfiles[this.activeVisualProfile] || storedSettings);
    }
    this.syncVisualControlRanges();
    if (storedDraft && typeof storedDraft === 'object') {
      this.dirtyPrompt = !!storedDraft.isDirty;
      this.pendingPromptDraft = typeof storedDraft.text === 'string' ? storedDraft.text : '';
    }
  }

  applySettings() {
    localStorage.setItem('text', JSON.stringify(this.text));
    localStorage.setItem('teleprompterTextLibrary', JSON.stringify(this.textLibrary));
    localStorage.setItem('teleprompterActiveTextId', JSON.stringify(this.activeTextId));
    localStorage.setItem('teleprompterAppView', JSON.stringify(this.appView));
    localStorage.setItem('lang', JSON.stringify(this.lang));
    localStorage.setItem('bg', JSON.stringify(this.bg));
    localStorage.setItem('fg', JSON.stringify(this.fg));
    localStorage.setItem('size', JSON.stringify(this.size));
    localStorage.setItem('font', JSON.stringify(this.font));
    localStorage.setItem('margin', JSON.stringify(this.margin));
    localStorage.setItem('mirrorv', JSON.stringify(this.mirrorv));
    localStorage.setItem('mirrorh', JSON.stringify(this.mirrorh));
    localStorage.setItem('showrec', JSON.stringify(this.showrec));
    localStorage.setItem('readingPosition', JSON.stringify(this.readingPosition));
    localStorage.setItem('readingTopMargin', JSON.stringify(this.readingTopMargin));
    localStorage.setItem('readingTopLines', JSON.stringify(this.readingTopLines));
    localStorage.setItem('highlightColor', JSON.stringify(this.highlightColor));
    localStorage.setItem('followLag', JSON.stringify(this.followLag));
    localStorage.setItem('textBoxWidth', JSON.stringify(this.textBoxWidth));
    localStorage.setItem('textLineHeight', JSON.stringify(this.textLineHeight));
    localStorage.setItem('fontWeight', JSON.stringify(this.fontWeight));
    localStorage.setItem('textAlign', JSON.stringify(this.textAlign));
    localStorage.setItem('matchTuning', JSON.stringify(this.matchTuning));
    this.writeStorage(this.storageKeys.settings, {
      lang: this.lang,
      bg: this.bg,
      fg: this.fg,
      size: this.size,
      font: this.font,
      margin: this.margin,
      paddingTop: this.paddingTop,
      paddingRight: this.paddingRight,
      paddingBottom: this.paddingBottom,
      paddingLeft: this.paddingLeft,
      mirrorv: this.mirrorv,
      mirrorh: this.mirrorh,
      showrec: this.showrec,
      readingPosition: this.readingPosition,
      readingTopMargin: this.readingTopMargin,
      readingTopLines: this.readingTopLines,
      highlightColor: this.highlightColor,
      followLag: this.followLag,
      textBoxWidth: this.textBoxWidth,
      textLineHeight: this.textLineHeight,
      fontWeight: this.fontWeight,
      textAlign: this.textAlign,
      matchTuning: this.matchTuning,
      shortcuts: this.shortcuts,
      activeVisualProfile: this.activeVisualProfile,
      visualProfiles: {
        ...((this.readStorage(this.storageKeys.settings) || {}).visualProfiles || {}),
        [this.activeVisualProfile]: this.getCurrentVisualSettings(),
      },
    });
    window.prompterMatchTuning = this.matchTuning;
    if (this.scriptTitleEl && document.activeElement !== this.scriptTitleEl)
      this.scriptTitleEl.value = this.getActiveTextTitle();
    if (this.editorEl && document.activeElement !== this.editorEl && this.editorEl.value !== this.text)
      this.editorEl.value = this.text;
    if (this.readingEditorEl && this.readingEditorEl.value !== this.text)
      this.readingEditorEl.value = this.text;
    document.getElementById('script-library-status').textContent = this.getLibraryStatus();
    this.renderTextLibrary();
    this.renderReaderScriptNavigator();
    const micStatusEl = document.getElementById('mic_status');
    const readingPositionEl = document.getElementById('reading-position');
    const readingTopMarginEl = document.getElementById('reading-top-margin');
    const readingTopMarginValueEl = document.getElementById('reading-top-margin-value');
    const readingTopLinesEl = document.getElementById('reading-top-lines');
    const readingTopLinesValueEl = document.getElementById('reading-top-lines-value');
    const highlightColorEl = document.getElementById('highlight-color');
    const followLagEl = document.getElementById('follow-lag');
    const followLagValueEl = document.getElementById('follow-lag-value');
    if (micStatusEl)
      micStatusEl.textContent = this.micStatus;
    document.getElementById('reading-position').value = this.readingPosition;
    document.getElementById('reading-top-margin').value = this.readingTopMargin;
    document.getElementById('reading-top-margin-value').textContent = `${this.readingTopMargin}px`;
    document.getElementById('reading-top-lines').value = this.readingTopLines;
    document.getElementById('reading-top-lines-value').textContent = `${this.readingTopLines} línea${this.readingTopLines === 1 ? '' : 's'}`;
    if (highlightColorEl)
      highlightColorEl.value = this.rgbToHex(this.highlightColor);
    document.getElementById('follow-lag').value = this.followLag;
    document.getElementById('follow-lag-value').textContent = `${this.followLag} palabra${this.followLag === 1 ? '' : 's'}`;
    this.syncMatchTuningInputs();
    this.syncDesignControlInputs();
    this.syncShortcutInputs();
    this.syncRouteUi();
    this.syncLanguageSelectors();
    this.showRecToggleEl.checked = this.showrec;
    this.mirrorHToggleEl.checked = this.mirrorh;
    this.mirrorVToggleEl.checked = this.mirrorv;
    const progress = this.getReaderProgress();
    this.readerProgressFillEl.style.width = `${progress.percent}%`;
    if (this.readerProgressFillFloatingEl)
      this.readerProgressFillFloatingEl.style.width = `${progress.percent}%`;
    this.readerProgressPercentEl.textContent = `${progress.percent}%`;
    if (this.readerProgressPercentFloatingEl)
      this.readerProgressPercentFloatingEl.textContent = `${progress.percent}%`;
    this.readerProgressMetaEl.textContent = `${progress.current} de ${progress.total} palabras`;
    if (this.readerProgressMetaChipEl)
      this.readerProgressMetaChipEl.textContent = `${progress.current} de ${progress.total} palabras`;
    this.sidebarProgressEl.textContent = `${progress.percent}%`;
    this.readerMicStatusEl.textContent = this.micStatus;
    this.readerLanguageStatusEl.textContent = this.lang;
    this.readerFollowStatusEl.textContent = `${this.followLag} palabra${this.followLag === 1 ? '' : 's'}`;
    this.readerBackendStatusEl.textContent = this.speechBackendStatus;
    const sessionStatus = this.getSessionStatusLabel();
    this.sidebarMicEl.textContent = sessionStatus;
    if (this.readerSessionStatusChipEl)
      this.readerSessionStatusChipEl.textContent = sessionStatus;
    this.activeScriptLabelEl.textContent = this.getActiveTextTitle() || 'Sin título';
    this.sidebarTitleEl.textContent = this.getActiveTextTitle() || 'Sin título';
    this.sidebarPreviewEl.textContent = this.getScriptPreview(this.text);
    this.playToggleEl.innerHTML = this.play
      ? '<i class="fa-solid fa-pause" aria-hidden="true"></i>'
      : '<i class="fa-solid fa-play" aria-hidden="true"></i>';
    this.cleanToggleEl.innerHTML = this.cleanMode
      ? '<i class="fa-solid fa-compress" aria-hidden="true"></i>'
      : '<i class="fa-solid fa-expand" aria-hidden="true"></i>';
    if (this.readerEditQuickEl) {
      this.readerEditQuickEl.classList.toggle('active', this.edit);
      this.readerEditQuickEl.title = this.edit ? 'Terminar edición y guardar' : 'Editar en pantalla';
      this.readerEditQuickEl.innerHTML = this.edit
        ? '<i class="fa-solid fa-check" aria-hidden="true"></i>'
        : '<i class="fa-solid fa-pen" aria-hidden="true"></i>';
    }
    this.quickTextSizeEl.value = `${this.size}`;
    if (this.quickTextSizeValueEl)
      this.quickTextSizeValueEl.textContent = `${this.size} px`;
    this.quickTextWidthEl.value = `${this.textBoxWidth}`;
    if (this.quickTextWidthValueEl)
      this.quickTextWidthValueEl.textContent = `${this.textBoxWidth}%`;
    this.quickLineHeightEl.value = `${Math.round(this.textLineHeight * 100)}`;
    if (this.quickLineHeightValueEl)
      this.quickLineHeightValueEl.textContent = `${this.textLineHeight.toFixed(2)}x`;
    if (this.quickPaddingTopEl)
      this.quickPaddingTopEl.value = `${min(this.paddingTop, parseInt(this.quickPaddingTopEl.max) || this.paddingTop)}`;
    if (this.quickPaddingTopManualEl && document.activeElement !== this.quickPaddingTopManualEl)
      this.quickPaddingTopManualEl.value = `${this.paddingTop}`;
    if (this.quickPaddingTopValueEl)
      this.quickPaddingTopValueEl.textContent = `${this.paddingTop} px`;
    if (this.quickPaddingRightEl)
      this.quickPaddingRightEl.value = `${min(this.paddingRight, parseInt(this.quickPaddingRightEl.max) || this.paddingRight)}`;
    if (this.quickPaddingRightManualEl && document.activeElement !== this.quickPaddingRightManualEl)
      this.quickPaddingRightManualEl.value = `${this.paddingRight}`;
    if (this.quickPaddingRightValueEl)
      this.quickPaddingRightValueEl.textContent = `${this.paddingRight} px`;
    if (this.quickPaddingBottomEl)
      this.quickPaddingBottomEl.value = `${min(this.paddingBottom, parseInt(this.quickPaddingBottomEl.max) || this.paddingBottom)}`;
    if (this.quickPaddingBottomManualEl && document.activeElement !== this.quickPaddingBottomManualEl)
      this.quickPaddingBottomManualEl.value = `${this.paddingBottom}`;
    if (this.quickPaddingBottomValueEl)
      this.quickPaddingBottomValueEl.textContent = `${this.paddingBottom} px`;
    if (this.quickPaddingLeftEl)
      this.quickPaddingLeftEl.value = `${min(this.paddingLeft, parseInt(this.quickPaddingLeftEl.max) || this.paddingLeft)}`;
    if (this.quickPaddingLeftManualEl && document.activeElement !== this.quickPaddingLeftManualEl)
      this.quickPaddingLeftManualEl.value = `${this.paddingLeft}`;
    if (this.quickPaddingLeftValueEl)
      this.quickPaddingLeftValueEl.textContent = `${this.paddingLeft} px`;
    if (this.quickFontFamilyEl)
      this.quickFontFamilyEl.value = this.font;
    this.quickHighlightColorEl.value = this.rgbToHex(this.highlightColor);
    this.quickTextColorEl.value = this.rgbToHex(this.fg);
    this.quickTextAlignEl.value = this.textAlign;
    if (this.editorDirtyStateEl) {
      this.editorDirtyStateEl.textContent = this.dirtyPrompt ? (this.edit ? 'Guardando...' : 'Sin guardar') : 'Guardado';
      this.editorDirtyStateEl.classList.toggle('dirty', this.dirtyPrompt);
      this.editorDirtyStateEl.classList.toggle('saved', !this.dirtyPrompt);
    }
    if (this.editorWordCountEl) {
      const wordCount = this.text.trim() === '' ? 0 : this.text.trim().split(/\s+/).filter(Boolean).length;
      this.editorWordCountEl.textContent = `${wordCount} pal.`;
    }
    document.body.classList.toggle('clean-reader', this.cleanMode);
    if (!this.play && !this.edit) {
      if (this.lang.search(/^en-(AU|CA|IN|KE|TZ|GH|NZ|NG|ZA|PH|GB|US)$/) != -1) {
        if (this.text == DEFAULT_TEXT_DE || this.text == DEFAULT_TEXT_FR) {
          this.text = DEFAULT_TEXT_EN;
          this.editorEl.value = this.text;
          this.readingEditorEl.value = this.text;
          this.adaptText();
        }
      }
      if (this.lang == 'de-DE') {
        if (this.text == DEFAULT_TEXT_EN || this.text == DEFAULT_TEXT_FR) {
          this.text = DEFAULT_TEXT_DE;
          this.editorEl.value = this.text;
          this.readingEditorEl.value = this.text;
          this.adaptText();
        }
      }
      if (this.lang == 'fr-FR') {
        if (this.text == DEFAULT_TEXT_DE || this.text == DEFAULT_TEXT_EN) {
          this.text = DEFAULT_TEXT_FR;
          this.editorEl.value = this.text;
          this.readingEditorEl.value = this.text;
          this.adaptText();
        }
      }
    }
    const bgDark = rgbToLum(...this.bg) < 0.5;
    const fgDark = rgbToLum(...this.fg) < 0.5;
    if (this.colorWarn) {
      if (bgDark && fgDark) {
        this.removeColorWarning();
        this.colorWarnIdx = this.addMessage('warning', 'Both text and background color are quite dark. Consider using a higher contrast.');
        this.colorWarn = false;
      }
      if (!bgDark && !fgDark) {
        this.removeColorWarning();
        this.colorWarnIdx = this.addMessage('warning', 'Both text and background color are quite bright. Consider using a higher contrast.');
        this.colorWarn = false;
      }
    }
    if ((bgDark && !fgDark) || (!bgDark && fgDark)) this.removeColorWarning();
    if (this.mirrorv && this.mirrorh)
      document.getElementById('play_div').style.transform = 'scale(-1, -1)';
    else if (this.mirrorv)
      document.getElementById('play_div').style.transform = 'scale(1, -1)';
    else if (this.mirrorh)
      document.getElementById('play_div').style.transform = 'scale(-1, 1)';
    else
      document.getElementById('play_div').style.transform = 'none';
    document.body.style.backgroundColor = arrToColor(...this.bg);
    document.getElementById('disable_block').style.backgroundColor = arrToColor(...this.bg, 0.8);
    document.getElementById('play_text').style.color = arrToColor(...this.fg);
    document.getElementById('play_text').style.fontFamily = this.font;
    document.getElementById('play_text').style.lineHeight = `${this.textLineHeight}`;
    document.getElementById('play_text').style.fontWeight = `${this.fontWeight}`;
    document.getElementById('play_text').style.textAlign = this.textAlign;
    this.readingEditorEl.style.fontFamily = this.font;
    this.readingEditorEl.style.fontSize = `${this.size}px`;
    this.readingEditorEl.style.lineHeight = `${this.textLineHeight}`;
    this.readingEditorEl.style.fontWeight = `${this.fontWeight}`;
    this.readingEditorEl.style.textAlign = this.textAlign;
    this.readingEditorEl.style.color = arrToColor(...this.fg);
    document.getElementById('play_text').style.display = 'block';
    document.getElementById('play_text').style.width = `${this.textBoxWidth}%`;
    document.getElementById('play_text').style.maxWidth = `${this.textBoxWidth}%`;
    document.getElementById('play_text').style.marginLeft = 'auto';
    document.getElementById('play_text').style.marginRight = 'auto';
    this.readingEditorEl.style.width = `${this.textBoxWidth}%`;
    this.readingEditorEl.style.maxWidth = `${this.textBoxWidth}%`;
    this.readingEditorEl.style.marginLeft = 'auto';
    this.readingEditorEl.style.marginRight = 'auto';
    for (let i = 0; i < this.numWordSpans; i++) {
      const wordElem = document.getElementById(`word_${i}`);
      wordElem.style.fontSize = `${this.size}px`;
      wordElem.style.lineHeight = `${this.textLineHeight}`;
      wordElem.style.fontWeight = `${this.fontWeight}`;
      wordElem.style.fontFamily = this.font;
      if (this.play) {
        if (i < this.currentPosition) {
          wordElem.style.opacity = '1';
          wordElem.style.color = arrToColor(...this.highlightColor);
        } else if (i < this.previewPosition) {
          wordElem.style.opacity = '1';
          wordElem.style.color = arrToColor(...this.highlightColor, 0.4);
        } else {
          wordElem.style.opacity = '1';
          wordElem.style.color = arrToColor(...this.fg);
        }
      } else {
        wordElem.style.opacity = '1';
        wordElem.style.color = arrToColor(...this.fg);
      }
    }
    document.getElementById('play_div').style.paddingTop = `${this.paddingTop}px`;
    document.getElementById('play_div').style.paddingRight = `${this.paddingRight}px`;
    document.getElementById('play_div').style.paddingBottom = `${this.paddingBottom}px`;
    document.getElementById('play_div').style.paddingLeft = `${this.paddingLeft}px`;
    document.getElementById('edit_text_div').style.paddingTop = `${this.paddingTop}px`;
    document.getElementById('edit_text_div').style.paddingRight = `${this.paddingRight}px`;
    document.getElementById('edit_text_div').style.paddingBottom = `${this.paddingBottom}px`;
    document.getElementById('edit_text_div').style.paddingLeft = `${this.paddingLeft}px`;
    if (this.showrec) {
      document.getElementById('rec_text').style.display = 'flex';
      let upperText = [];
      let lowerText = [];
      if (this.showMatchIdx >= 0 && this.showMatchIdx < this.matchHistory.length) {
        [upperText, lowerText] = this.matchHistory[this.showMatchIdx];
      } else {
        const promptSubtract = min(this.currentPosition, 15);
        let startIdx = this.currentPosition - promptSubtract;
        let endIdx = min(this.recText.length, this.currentPosition + 10);
        for (let i = startIdx; i < endIdx; i++)
          upperText.push(this.recText[i].word);
        const recordingTail = min(this.currentRecording.length, 10);
        startIdx = max(0, this.currentRecording.length - recordingTail);
        endIdx = this.currentRecording.length;
        for (let i = startIdx; i < endIdx; i++)
          lowerText.push(this.currentRecording[i]);
      }
      document.getElementById('disconnected_texts').style.display = 'inline';
      document.getElementById('connected_texts').style.display = 'none';
      let text = upperText.map(val => escapeHtml(val)).join(' ');
      if (text == '') text = 'Esperando que inicies&hellip;';
      document.getElementById('looking_for').innerHTML = text;
      text = lowerText.map(val => escapeHtml(val)).join(' ');
      if (text == '') text = 'Esperando que inicies&hellip;';
      document.getElementById('recorded').innerHTML = text;
    } else
      document.getElementById('rec_text').style.display = 'none';
    if (this.edit) {
      document.getElementById('play_div').style.display = 'none';
      document.getElementById('edit_text_div').style.display = 'block';
      this.stopSmoothScroll();
      this.refreshInlineReaderEditorLayout();
    } else {
      document.getElementById('play_div').style.display = 'block';
      document.getElementById('edit_text_div').style.display = 'none';
      if (this.play) {
        const playDiv = document.getElementById('play_div');
        const visiblePosition = max(this.currentPosition, this.previewPosition);
        const followPosition = max(0, visiblePosition - this.followLag);
        const lineAnchor = this.getLineAnchor(followPosition);
        const targetTop = this.getScrollTargetTop(playDiv, lineAnchor);
        this.smoothScrollPlayDiv(playDiv, targetTop);
      } else {
        this.stopSmoothScroll();
      }
    }
    this.lastRenderedPosition = max(this.currentPosition, this.previewPosition);
  }

  getReaderProgress() {
    const total = this.recText ? this.recText.length : 0;
    const current = min(this.currentPosition, total);
    const percent = total === 0 ? 0 : Math.round((current / total) * 100);
    return { current, total, percent };
  }

  getSessionStatusLabel() {
    if (this.edit)
      return this.dirtyPrompt ? 'Editando...' : 'Editando';
    if (this.play)
      return 'Escuchando';
    if (this.sessionCompleted)
      return 'Finalizado';
    if (this.currentPosition > 0)
      return 'Pausado';
    return 'Listo';
  }

  markPromptDirty(draftText = null) {
    this.dirtyPrompt = true;
    if (typeof draftText === 'string')
      this.pendingPromptDraft = draftText;
    else if (this.editorEl)
      this.pendingPromptDraft = this.editorEl.value;
    else if (this.readingEditorEl)
      this.pendingPromptDraft = this.readingEditorEl.value;
    else
      this.pendingPromptDraft = this.text;
    this.persistDraftState();
    this.applySettings();
  }

  clearPromptDirtyState() {
    this.dirtyPrompt = false;
    this.pendingPromptDraft = '';
    this.persistDraftState();
  }

  persistDraftState() {
    localStorage.setItem(this.storageKeys.dirtyDraft, JSON.stringify({
      isDirty: this.dirtyPrompt,
      text: this.pendingPromptDraft,
    }));
  }

  handleBeforeUnload(evt) {
    if (this.inlineEditSaveTimer !== null)
      this.flushInlineReaderEdit();
    this.persistDraftState();
    if (!this.dirtyPrompt)
      return;
    evt.preventDefault();
    evt.returnValue = '';
  }

  syncPromptEditors() {
    this.text = this.editorEl.value;
    this.readingEditorEl.value = this.text;
    this.updateActiveScriptText(this.text);
    this.adaptText();
    this.markPromptDirty();
    this.applySettings();
  }

  handleInlineReaderEditInput() {
    if (!this.edit || !this.readingEditorEl)
      return;
    const draftText = this.readingEditorEl.value;
    this.text = draftText;
    this.pendingPromptDraft = draftText;
    this.dirtyPrompt = true;
    this.persistDraftState();
    this.updateActiveScriptText(draftText);
    this.resizeInlineReaderEditor();
    if (this.editorEl && document.activeElement !== this.editorEl)
      this.editorEl.value = draftText;
    if (this.readerSessionStatusChipEl)
      this.readerSessionStatusChipEl.textContent = 'Editando...';
    if (this.editorDirtyStateEl) {
      this.editorDirtyStateEl.textContent = 'Guardando...';
      this.editorDirtyStateEl.classList.add('dirty');
      this.editorDirtyStateEl.classList.remove('saved');
    }
    if (this.sidebarPreviewEl)
      this.sidebarPreviewEl.textContent = this.getScriptPreview(draftText);
    if (this.inlineEditSaveTimer !== null)
      window.clearTimeout(this.inlineEditSaveTimer);
    this.inlineEditSaveTimer = window.setTimeout(() => this.flushInlineReaderEdit(), this.inlineEditSaveDelayMs);
  }

  flushInlineReaderEdit() {
    if (this.inlineEditSaveTimer !== null) {
      window.clearTimeout(this.inlineEditSaveTimer);
      this.inlineEditSaveTimer = null;
    }
    if (!this.readingEditorEl)
      return;
    const editDiv = document.getElementById('edit_text_div');
    const preservedScrollTop = editDiv ? editDiv.scrollTop : 0;
    const preservedPosition = min(max(this.currentPosition, 0), this.recText.length);
    const preservedPreviewPosition = min(max(this.previewPosition, 0), this.recText.length);
    const preservedRenderedPosition = min(max(this.lastRenderedPosition, 0), this.recText.length);
    this.text = this.readingEditorEl.value;
    this.updateActiveScriptText(this.text);
    if (this.editorEl && document.activeElement !== this.editorEl)
      this.editorEl.value = this.text;
    this.adaptText();
    this.currentPosition = min(preservedPosition, this.recText.length);
    this.previewPosition = min(max(preservedPreviewPosition, this.currentPosition), this.recText.length);
    this.lastRenderedPosition = min(max(preservedRenderedPosition, this.currentPosition), this.recText.length);
    this.clearPromptDirtyState();
    this.applySettings();
    if (editDiv)
      editDiv.scrollTop = preservedScrollTop;
    window.requestAnimationFrame(() => {
      const nextEditDiv = document.getElementById('edit_text_div');
      if (nextEditDiv)
        nextEditDiv.scrollTop = preservedScrollTop;
    });
  }

  resizeInlineReaderEditor() {
    if (!this.readingEditorEl)
      return;
    const editDiv = document.getElementById('edit_text_div');
    const preservedScrollTop = editDiv ? editDiv.scrollTop : 0;
    this.readingEditorEl.style.height = 'auto';
    this.readingEditorEl.style.height = `${this.readingEditorEl.scrollHeight}px`;
    if (editDiv)
      editDiv.scrollTop = preservedScrollTop;
  }

  refreshInlineReaderEditorLayout() {
    if (!this.readingEditorEl)
      return;
    const editDiv = document.getElementById('edit_text_div');
    const preservedScrollTop = editDiv ? editDiv.scrollTop : 0;
    void this.readingEditorEl.offsetHeight;
    this.resizeInlineReaderEditor();
    if (editDiv)
      editDiv.scrollTop = preservedScrollTop;
    window.requestAnimationFrame(() => {
      this.resizeInlineReaderEditor();
      const nextEditDiv = document.getElementById('edit_text_div');
      if (nextEditDiv)
        nextEditDiv.scrollTop = preservedScrollTop;
    });
  }

  togglePlayback() {
    if (this.play) {
      this.pause();
    } else {
      if (this.sessionCompleted || this.currentPosition >= this.recText.length) {
        this.currentPosition = 0;
        this.lastRenderedPosition = 0;
        this.previewPosition = 0;
        this.sessionCompleted = false;
        this.resetStopwatchSafely();
      }
      this.start();
      this.startStopwatchSafely();
    }
    this.applySettings();
  }

  restartReading() {
    this.stop();
    this.resetStopwatchSafely();
    this.applySettings();
  }

  toggleCleanMode() {
    this.cleanMode = !this.cleanMode;
    document.body.classList.toggle('clean-reader', this.cleanMode);
    this.applySettings();
  }

  async toggleFullscreenMode() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        this.cleanMode = false;
      } else {
        const surface = document.getElementById('reader-surface') || document.documentElement;
        if (surface.requestFullscreen)
          await surface.requestFullscreen();
        this.cleanMode = true;
      }
      document.body.classList.toggle('clean-reader', this.cleanMode);
      this.applySettings();
    } catch (error) {
      this.addMessage('warning', 'No se pudo cambiar el modo pantalla completa desde este navegador.');
    }
  }

  handleGlobalShortcut(evt) {
    if (!this.hasReaderSurface())
      return;
    if (evt.repeat)
      return;
    if (this.isTypingShortcutTarget(evt.target))
      return;
    if (this.isDialogOpen())
      return;
    if (this.matchesShortcut(evt, this.shortcuts.playPause)) {
      evt.preventDefault();
      this.togglePlayback();
      return;
    }
    if (this.matchesShortcut(evt, this.shortcuts.restart)) {
      evt.preventDefault();
      this.restartReading();
      return;
    }
    if (this.matchesShortcut(evt, this.shortcuts.fullscreen)) {
      evt.preventDefault();
      if (this.quickSettingsPanelEl && this.quickSettingsPanelEl.classList.contains('is-open'))
        this.closeQuickSettings();
      else if (document.fullscreenEnabled)
        this.toggleFullscreenMode();
      else
        this.toggleCleanMode();
      return;
    }
    if (this.matchesShortcut(evt, this.shortcuts.edit)) {
      evt.preventDefault();
      this.settingsClick('edit');
    }
  }

  isDialogOpen() {
    const openDialog = document.querySelector('dialog[open]');
    return openDialog !== null;
  }

  isTypingShortcutTarget(target) {
    if (!target || !target.tagName)
      return false;
    if (target.dataset && target.dataset.shortcutInput === 'true')
      return false;
    const tag = target.tagName.toUpperCase();
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
  }

  getDefaultShortcuts() {
    return {
      playPause: 'Space',
      restart: 'KeyR',
      fullscreen: 'KeyF',
      edit: 'KeyE',
    };
  }

  normalizeShortcuts(shortcuts) {
    const defaults = this.getDefaultShortcuts();
    return {
      playPause: this.normalizeShortcutValue(shortcuts && shortcuts.playPause, defaults.playPause),
      restart: this.normalizeShortcutValue(shortcuts && shortcuts.restart, defaults.restart),
      fullscreen: this.normalizeFullscreenShortcut(shortcuts && shortcuts.fullscreen, defaults.fullscreen),
      edit: this.normalizeShortcutValue(shortcuts && shortcuts.edit, defaults.edit),
    };
  }

  normalizeShortcutValue(value, fallback) {
    return typeof value === 'string' && value.trim() !== '' ? value.trim() : fallback;
  }

  normalizeFullscreenShortcut(value, fallback) {
    const shortcut = this.normalizeShortcutValue(value, fallback);
    return shortcut === 'Escape' ? fallback : shortcut;
  }

  matchesShortcut(evt, shortcutCode) {
    return evt.code === shortcutCode || evt.key === shortcutCode;
  }

  formatShortcutLabel(shortcutCode) {
    const map = {
      Space: 'Espacio',
      Escape: 'Esc',
      Enter: 'Enter',
      Tab: 'Tab',
      Backspace: 'Backspace',
      ArrowUp: 'Flecha ↑',
      ArrowDown: 'Flecha ↓',
      ArrowLeft: 'Flecha ←',
      ArrowRight: 'Flecha →',
    };
    if (map[shortcutCode])
      return map[shortcutCode];
    if (/^Key[A-Z]$/.test(shortcutCode))
      return shortcutCode.slice(3);
    if (/^Digit[0-9]$/.test(shortcutCode))
      return shortcutCode.slice(5);
    return shortcutCode;
  }

  captureShortcutInput(evt) {
    evt.preventDefault();
    evt.stopPropagation();
    const shortcutName = evt.currentTarget.dataset.shortcutName;
    if (!shortcutName)
      return;
    if (shortcutName === 'fullscreen' && (evt.code === 'Escape' || evt.key === 'Escape')) {
      this.addMessage('warning', 'Esc queda reservado para salir de pantalla completa. Usá otra tecla para entrar.');
      this.syncShortcutInputs();
      return;
    }
    this.shortcuts = this.normalizeShortcuts({
      ...this.shortcuts,
      [shortcutName]: evt.code || evt.key,
    });
    this.applySettings();
  }

  syncShortcutInputs() {
    if (this.shortcutPlayPauseEl)
      this.shortcutPlayPauseEl.value = this.formatShortcutLabel(this.shortcuts.playPause);
    if (this.shortcutRestartEl)
      this.shortcutRestartEl.value = this.formatShortcutLabel(this.shortcuts.restart);
    if (this.shortcutFullscreenEl)
      this.shortcutFullscreenEl.value = this.formatShortcutLabel(this.shortcuts.fullscreen);
    if (this.shortcutEditEl)
      this.shortcutEditEl.value = this.formatShortcutLabel(this.shortcuts.edit);
  }

  openQuickSettings() {
    this.quickSettingsBackdropEl.hidden = false;
    this.quickSettingsPanelEl.classList.add('is-open');
    this.quickSettingsPanelEl.setAttribute('aria-hidden', 'false');
  }

  closeQuickSettings() {
    this.quickSettingsBackdropEl.hidden = true;
    this.quickSettingsPanelEl.classList.remove('is-open');
    this.quickSettingsPanelEl.setAttribute('aria-hidden', 'true');
  }

  setView(view, navigate = true) {
    this.appView = view;
    this.applySettings();
  }

  syncRouteUi() {
    const navTargets = document.querySelectorAll('[data-view]');
    for (let i = 0; i < navTargets.length; i++)
      navTargets[i].classList.toggle('is-active', navTargets[i].dataset.view === this.appView);
  }

  populateLanguageSelectors() {
    this.languageGroupEl.innerHTML = this.langValues
      .map((group, idx) => `<option value="${idx}">${group[0]}</option>`)
      .join('');
  }

  syncLanguageSelectors() {
    let groupIndex = 0;
    let variantIndex = 1;
    for (let i = 0; i < this.langValues.length; i++) {
      for (let k = 1; k < this.langValues[i].length; k++) {
        if (this.langValues[i][k][0] === this.lang) {
          groupIndex = i;
          variantIndex = k;
          break;
        }
      }
    }
    this.languageGroupEl.value = `${groupIndex}`;
    this.languageVariantEl.innerHTML = this.langValues[groupIndex]
      .slice(1)
      .map((variant, idx) => `<option value="${idx + 1}">${variant[1] || variant[0]}</option>`)
      .join('');
    this.languageVariantEl.value = `${variantIndex}`;
  }

  handleLanguageGroupChange() {
    const primaryIdx = parseInt(this.languageGroupEl.value);
    const variants = this.langValues[primaryIdx].slice(1);
    this.languageVariantEl.innerHTML = variants
      .map((variant, idx) => `<option value="${idx + 1}">${variant[1] || variant[0]}</option>`)
      .join('');
    this.languageVariantEl.value = '1';
    this.handleLanguageVariantChange();
  }

  handleLanguageVariantChange() {
    const primaryIdx = parseInt(this.languageGroupEl.value);
    const secondaryIdx = parseInt(this.languageVariantEl.value);
    this.lang = this.langValues[primaryIdx][secondaryIdx][0];
    if (this.speechRec !== null)
      this.speechRec.reset(this.lang);
    this.applySettings();
  }

  restoreDefaultSettings() {
    this.toFactorySettings();
    this.initializeSpeechBackend();
    this.applySettings();
  }

  getLineAnchor(wordIndex) {
    let safeIndex = min(max(wordIndex, 0), this.numWordSpans - 1);
    let anchor = document.getElementById(`word_${safeIndex}`);
    const anchorTop = anchor.offsetTop;
    while (safeIndex > 0) {
      const previous = document.getElementById(`word_${safeIndex - 1}`);
      if (previous.offsetTop !== anchorTop)
        break;
      anchor = previous;
      safeIndex--;
    }
    return anchor;
  }

  getLineHeight(element) {
    const rectHeight = element.getBoundingClientRect().height;
    if (rectHeight > 0)
      return rectHeight;
    const lineHeight = parseFloat(window.getComputedStyle(element).lineHeight);
    if (!isNaN(lineHeight))
      return lineHeight;
    return this.size;
  }

  getScrollTargetTop(playDiv, lineAnchor) {
    if (this.readingPosition == 'top') {
      const lineHeight = this.getLineHeight(lineAnchor);
      const lineBasedMargin = Math.max(0, (this.readingTopLines - 1) * lineHeight);
      return Math.max(lineAnchor.offsetTop - lineBasedMargin - this.readingTopMargin, 0);
    }
    return max(0, lineAnchor.offsetTop - (playDiv.clientHeight - lineAnchor.offsetHeight) / 2);
  }

  smoothScrollPlayDiv(playDiv, targetTop) {
    this.scrollFollowTarget = max(0, targetTop);
    if (this.scrollAnimationFrame !== null)
      return;
    const step = () => {
      const currentTop = playDiv.scrollTop;
      const distance = this.scrollFollowTarget - currentTop;
      if (Math.abs(distance) < 0.75) {
        playDiv.scrollTop = this.scrollFollowTarget;
        this.scrollAnimationFrame = null;
        return;
      }
      const smoothing = Math.min(0.24, Math.max(0.1, Math.abs(distance) / 600));
      playDiv.scrollTop = currentTop + distance * smoothing;
      this.scrollAnimationFrame = window.requestAnimationFrame(step);
    };
    this.scrollAnimationFrame = window.requestAnimationFrame(step);
  }

  stopSmoothScroll() {
    if (this.scrollAnimationFrame !== null) {
      window.cancelAnimationFrame(this.scrollAnimationFrame);
      this.scrollAnimationFrame = null;
    }
  }

  removeColorWarning() {
    if (this.colorWarnIdx != -1) {
      this.hideMessage(this.colorWarnIdx);
      this.colorWarnIdx = -1;
    }
  }

  showPanel(timeout = 3000) {
    return timeout;
  }

  hidePanel() {
    return;
  }

  addMessage(type, content) {
    const hideFct = (function (msgId, thisVal) {
      return () => thisVal.hideMessage(msgId);
    })(this.msgCounter, this);
    const newMsg = document.createElement('div');
    newMsg.setAttribute('id', `msg-${this.msgCounter}`);
    newMsg.setAttribute('class', type);
    newMsg.innerHTML = `<strong>${type.toUpperCase()}</strong><div>${content}</div>`;
    document.getElementById('messages').appendChild(newMsg);
    window.setTimeout(hideFct, 60000);
    return this.msgCounter++;
  }

  hideMessage(id) {
    try {
      const msg = document.getElementById(`msg-${id}`);
      const par = msg.parentElement;
      par.removeChild(msg);
    } catch (e) {}
  }

  rgbToHex(rgb) {
    return `#${rgb.map(value => value.toString(16).padStart(2, '0')).join('')}`;
  }

  hexToRgb(hex) {
    const normalized = hex.replace('#', '');
    return [
      parseInt(normalized.substring(0, 2), 16),
      parseInt(normalized.substring(2, 4), 16),
      parseInt(normalized.substring(4, 6), 16),
    ];
  }

  getDefaultMatchTuning() {
    return {
      shortWordThreshold: 70,
      mediumWordThreshold: 78,
      longWordThreshold: 84,
      strongMatchThreshold: 96,
      skipShortWordLength: 3,
      requiredSequentialMatches: 2,
      rejoinEnabled: true,
      rejoinLookaheadWindow: 18,
      rejoinSequenceLength: 3,
      rejoinConfidenceThreshold: 82,
      rejoinMaxGapInSpeech: 2,
      rejoinCooldown: 1,
    };
  }

  normalizeMatchTuning(tuning) {
    const defaults = this.getDefaultMatchTuning();
    const safeNumber = (value, fallback, minValue, maxValue) => {
      const parsed = parseInt(value);
      if (isNaN(parsed))
        return fallback;
      return min(max(parsed, minValue), maxValue);
    };
    return {
      shortWordThreshold: safeNumber(tuning && tuning.shortWordThreshold, defaults.shortWordThreshold, 50, 100),
      mediumWordThreshold: safeNumber(tuning && tuning.mediumWordThreshold, defaults.mediumWordThreshold, 50, 100),
      longWordThreshold: safeNumber(tuning && tuning.longWordThreshold, defaults.longWordThreshold, 50, 100),
      strongMatchThreshold: safeNumber(tuning && tuning.strongMatchThreshold, defaults.strongMatchThreshold, 70, 100),
      skipShortWordLength: safeNumber(tuning && tuning.skipShortWordLength, defaults.skipShortWordLength, 0, 6),
      requiredSequentialMatches: safeNumber(tuning && tuning.requiredSequentialMatches, defaults.requiredSequentialMatches, 1, 5),
      rejoinEnabled: tuning && typeof tuning.rejoinEnabled === 'boolean' ? tuning.rejoinEnabled : defaults.rejoinEnabled,
      rejoinLookaheadWindow: safeNumber(tuning && tuning.rejoinLookaheadWindow, defaults.rejoinLookaheadWindow, 4, 60),
      rejoinSequenceLength: safeNumber(tuning && tuning.rejoinSequenceLength, defaults.rejoinSequenceLength, 2, 8),
      rejoinConfidenceThreshold: safeNumber(tuning && tuning.rejoinConfidenceThreshold, defaults.rejoinConfidenceThreshold, 60, 100),
      rejoinMaxGapInSpeech: safeNumber(tuning && tuning.rejoinMaxGapInSpeech, defaults.rejoinMaxGapInSpeech, 0, 6),
      rejoinCooldown: safeNumber(tuning && tuning.rejoinCooldown, defaults.rejoinCooldown, 0, 5),
    };
  }

  updateMatchTuningFromInputs() {
    this.matchTuning = this.normalizeMatchTuning({
      shortWordThreshold: document.getElementById('match-short-threshold').value,
      mediumWordThreshold: document.getElementById('match-medium-threshold').value,
      longWordThreshold: document.getElementById('match-long-threshold').value,
      strongMatchThreshold: document.getElementById('match-strong-threshold').value,
      skipShortWordLength: document.getElementById('match-skip-short-word-length').value,
      requiredSequentialMatches: document.getElementById('match-required-sequential').value,
      rejoinEnabled: document.getElementById('rejoin-enabled').checked,
      rejoinLookaheadWindow: document.getElementById('rejoin-lookahead-window').value,
      rejoinSequenceLength: document.getElementById('rejoin-sequence-length').value,
      rejoinConfidenceThreshold: document.getElementById('rejoin-confidence-threshold').value,
      rejoinMaxGapInSpeech: document.getElementById('rejoin-max-gap-in-speech').value,
      rejoinCooldown: document.getElementById('rejoin-cooldown').value,
    });
    this.applySettings();
  }

  syncMatchTuningInputs() {
    document.getElementById('match-short-threshold').value = this.matchTuning.shortWordThreshold;
    document.getElementById('match-medium-threshold').value = this.matchTuning.mediumWordThreshold;
    document.getElementById('match-long-threshold').value = this.matchTuning.longWordThreshold;
    document.getElementById('match-strong-threshold').value = this.matchTuning.strongMatchThreshold;
    document.getElementById('match-skip-short-word-length').value = this.matchTuning.skipShortWordLength;
    document.getElementById('match-required-sequential').value = this.matchTuning.requiredSequentialMatches;
    document.getElementById('rejoin-enabled').checked = this.matchTuning.rejoinEnabled;
    document.getElementById('rejoin-lookahead-window').value = this.matchTuning.rejoinLookaheadWindow;
    document.getElementById('rejoin-sequence-length').value = this.matchTuning.rejoinSequenceLength;
    document.getElementById('rejoin-confidence-threshold').value = this.matchTuning.rejoinConfidenceThreshold;
    document.getElementById('rejoin-max-gap-in-speech').value = this.matchTuning.rejoinMaxGapInSpeech;
    document.getElementById('rejoin-cooldown').value = this.matchTuning.rejoinCooldown;
  }

  updateDesignControlsFromInputs() {
    const minSize = this.getVisualTextSizeMin();
    this.textBoxWidth = min(max(parseInt(document.getElementById('text-box-width').value) || 84, 40), 100);
    this.size = min(max(parseInt(document.getElementById('text-size-live').value) || 120, minSize), 220);
    this.textLineHeight = min(max((parseInt(document.getElementById('line-height-live').value) || 125) / 100, 0.9), 2.2);
    this.font = document.getElementById('font-family-live').value;
    this.fontWeight = min(max(parseInt(document.getElementById('font-weight-live').value) || 400, 300), 900);
    this.textAlign = document.getElementById('text-align-live').value;
    this.highlightColor = this.hexToRgb(document.getElementById('highlight-color-live').value);
    this.fg = this.hexToRgb(document.getElementById('text-color-live').value);
    this.applySettings();
  }

  syncDesignControlInputs() {
    this.syncVisualControlRanges();
    document.getElementById('text-box-width').value = this.textBoxWidth;
    document.getElementById('text-size-live').value = this.size;
    document.getElementById('line-height-live').value = Math.round(this.textLineHeight * 100);
    document.getElementById('font-family-live').value = this.font;
    document.getElementById('font-weight-live').value = `${this.fontWeight}`;
    document.getElementById('text-align-live').value = this.textAlign;
    document.getElementById('highlight-color-live').value = this.rgbToHex(this.highlightColor);
    document.getElementById('text-color-live').value = this.rgbToHex(this.fg);
  }

  getSpeechBackendLabel() {
    return 'Web Speech API';
  }

  getSpeechBackendOptions() {
    return {};
  }

  initializeSpeechBackend() {
    if (this.speechRec !== null)
      this.speechRec.stop();
    this.speechRec = createSpeechRecognizer(
      'webspeech',
      (a, b, c) => this.speechResult(a, b, c),
      this.lang,
      this.getSpeechBackendOptions()
    );
    this.speechBackendStatus = 'Web Speech API ready';
  }

  handleVisibilityChange() {
    if (!this.play)
      return;
    if (document.hidden) {
      this.waitingForVisibilityResume = true;
      this.micStatus = 'Backgrounded, waiting to resume';
      this.speechBackendStatus = 'Backgrounded, waiting to resume';
      this.applySettings();
      return;
    }
    this.resumeRecognitionAfterInterruption(250);
  }

  resumeRecognitionAfterInterruption(delay = 250) {
    if (!this.play || document.hidden || this.currentPosition >= this.recText.length)
      return;
    if (this.speechRec !== null && this.speechRec.listening)
      return;
    if (this.resumeRecognitionTimer !== null)
      window.clearTimeout(this.resumeRecognitionTimer);
    this.resumeRecognitionTimer = window.setTimeout(() => {
      this.resumeRecognitionTimer = null;
      if (!this.play || document.hidden || this.currentPosition >= this.recText.length)
        return;
      this.startRecognition(false);
    }, delay);
  }

  openScriptLibrary() {
    const modal = document.getElementById('prompts-modal');
    if (modal) {
      if (this.scriptSearchEl) {
        this.scriptSearchEl.value = '';
        this.filteredQuery = '';
      }
      this.renderTextLibrary();
      if (this.scriptTitleEl)
        this.scriptTitleEl.value = this.getActiveTextTitle();
      if (this.editorEl)
        this.editorEl.value = this.text;
      this.clearPromptDirtyState();
      if (!modal.open)
        modal.showModal();
      window.setTimeout(() => {
        if (this.editorEl)
          this.editorEl.focus();
      }, 0);
      return;
    }
    this.setView('prompts');
  }

  closeScriptLibrary() {
    this.setView('reader');
  }

  mountCustomizePanels() {
    return;
  }

  openCustomizePanel() {
    this.setView('settings');
  }

  closeCustomizePanel() {
    this.setView('reader');
  }

  loadTextLibrary() {
    let storedLibrary = null;
    let storedActiveId = null;
    try {
      storedLibrary = JSON.parse(localStorage.getItem('teleprompterTextLibrary'));
      storedActiveId = JSON.parse(localStorage.getItem('teleprompterActiveTextId'));
    } catch (e) {}
    const legacyText = localStorage.getItem('text') !== null
      ? JSON.parse(localStorage.getItem('text'))
      : this.text;
    if (!Array.isArray(storedLibrary) || storedLibrary.length === 0) {
      this.textLibrary = [{
        id: this.createScriptId(),
        title: 'Prompt principal',
        text: legacyText,
      }];
      this.activeTextId = this.textLibrary[0].id;
      this.text = legacyText;
      return;
    }
    this.textLibrary = storedLibrary
      .filter(item => item && typeof item.id === 'string')
      .map(item => ({
        id: item.id,
        title: this.normalizeScriptTitle(item.title),
        text: typeof item.text === 'string' ? item.text : '',
      }));
    if (this.textLibrary.length === 0) {
      this.textLibrary = [{
        id: this.createScriptId(),
        title: 'Prompt principal',
        text: legacyText,
      }];
    }
    this.activeTextId = this.textLibrary.some(item => item.id === storedActiveId)
      ? storedActiveId
      : this.textLibrary[0].id;
    const activeScript = this.getActiveScript();
    this.text = activeScript ? activeScript.text : legacyText;
  }

  createScriptId() {
    return `text_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  normalizeScriptTitle(title) {
    if (typeof title !== 'string')
      return 'Untitled text';
    const normalized = title.trim();
    return normalized === '' ? 'Untitled text' : normalized;
  }

  getActiveScript() {
    return this.textLibrary.find(item => item.id === this.activeTextId) || null;
  }

  getActiveTextTitle() {
    const activeScript = this.getActiveScript();
    return activeScript ? activeScript.title : '';
  }

  getLibraryStatus() {
    const count = this.textLibrary.length;
    return `${count} prompt${count === 1 ? '' : 's'}`;
  }

  getScriptPreview(text) {
    const normalized = (text || '').replace(/\s+/g, ' ').trim();
    if (normalized === '')
      return 'Empty text';
    if (normalized.length <= 100)
      return normalized;
    return `${normalized.substring(0, 100)}…`;
  }

  renderTextLibrary() {
    const container = document.getElementById('script-list');
    const query = this.filteredQuery.trim().toLowerCase();
    const visibleScripts = this.textLibrary.filter(item => {
      if (query === '')
        return true;
      return item.title.toLowerCase().includes(query) || item.text.toLowerCase().includes(query);
    });
    const cards = visibleScripts.map(item => `
      <article
        class="script-card${item.id === this.activeTextId ? ' active' : ''}"
        data-script-id="${item.id}"
        draggable="true"
        role="button"
        tabindex="0"
        aria-label="Abrir ${escapeHtml(item.title)}"
      >
        <div class="script-card-topline">
          <span class="script-card-title">${escapeHtml(item.title)}</span>
          <span class="script-drag-handle" aria-hidden="true" title="Arrastrar para reordenar">
            <i class="fa-solid fa-grip-vertical"></i>
          </span>
        </div>
        <span class="script-card-meta">
          <span>${item.id === this.activeTextId ? 'Activo' : 'Disponible'}</span>
          <span>${item.text.trim().split(/\s+/).filter(Boolean).length} palabras</span>
        </span>
        <span class="script-card-preview">${escapePlainHtml(this.getScriptPreview(item.text))}</span>
      </article>
    `).join('');
    if (cards === '') {
      container.innerHTML = '<div class="script-card"><span class="script-card-title">Sin resultados</span><span class="script-card-preview">Prueba con otro término de búsqueda.</span></div>';
      return;
    }
    container.innerHTML = cards;
    const cardElements = container.querySelectorAll('[data-script-id]');
    for (let i = 0; i < cardElements.length; i++) {
      cardElements[i].addEventListener('click', evt => {
        if (evt.currentTarget.classList.contains('is-dragging'))
          return;
        this.selectScript(evt.currentTarget.dataset.scriptId);
      });
      cardElements[i].addEventListener('keydown', evt => {
        if (evt.key !== 'Enter' && evt.key !== ' ')
          return;
        evt.preventDefault();
        this.selectScript(evt.currentTarget.dataset.scriptId);
      });
      cardElements[i].addEventListener('dragstart', evt => this.handleScriptDragStart(evt));
      cardElements[i].addEventListener('dragover', evt => this.handleScriptDragOver(evt));
      cardElements[i].addEventListener('dragleave', evt => evt.currentTarget.classList.remove('drag-over'));
      cardElements[i].addEventListener('drop', evt => this.handleScriptDrop(evt));
      cardElements[i].addEventListener('dragend', evt => this.handleScriptDragEnd(evt));
    }
  }

  renderReaderScriptNavigator() {
    if (!this.readerScriptOptionsEl || !this.readerScriptSwitcherLabelEl)
      return;
    const activeIdx = this.getActiveScriptIndex();
    const activeNumber = activeIdx === -1 ? 0 : activeIdx + 1;
    this.readerScriptSwitcherLabelEl.textContent = `${activeNumber}/${this.textLibrary.length || 0} ${this.getActiveTextTitle() || 'Capítulos'}`;
    this.readerScriptOptionsEl.innerHTML = this.textLibrary.map((item, index) => `
      <button
        type="button"
        class="reader-script-option${item.id === this.activeTextId ? ' active' : ''}"
        data-reader-script-id="${item.id}"
      >
        <span class="reader-script-option-index">${index + 1}</span>
        <span class="reader-script-option-title">${escapeHtml(item.title)}</span>
      </button>
    `).join('');
    if (this.readerPrevScriptEl)
      this.readerPrevScriptEl.disabled = activeIdx <= 0;
    if (this.readerNextScriptEl)
      this.readerNextScriptEl.disabled = activeIdx === -1 || activeIdx >= this.textLibrary.length - 1;
  }

  getActiveScriptIndex() {
    return this.textLibrary.findIndex(item => item.id === this.activeTextId);
  }

  switchReaderScriptByOffset(offset) {
    if (!Number.isInteger(offset) || this.textLibrary.length <= 1)
      return;
    const activeIdx = this.getActiveScriptIndex();
    if (activeIdx === -1)
      return;
    const nextIdx = activeIdx + offset;
    if (nextIdx < 0 || nextIdx >= this.textLibrary.length)
      return;
    this.selectScript(this.textLibrary[nextIdx].id);
    if (this.readerScriptSwitcherEl)
      this.readerScriptSwitcherEl.removeAttribute('open');
  }

  handleScriptDragStart(evt) {
    const card = evt.currentTarget;
    if (!card || !card.dataset.scriptId)
      return;
    this.draggedScriptId = card.dataset.scriptId;
    card.classList.add('is-dragging');
    evt.dataTransfer.effectAllowed = 'move';
    evt.dataTransfer.setData('text/plain', this.draggedScriptId);
  }

  handleScriptDragOver(evt) {
    const card = evt.currentTarget;
    if (!card || !this.draggedScriptId || card.dataset.scriptId === this.draggedScriptId)
      return;
    evt.preventDefault();
    card.classList.add('drag-over');
    evt.dataTransfer.dropEffect = 'move';
  }

  handleScriptDrop(evt) {
    const card = evt.currentTarget;
    if (!card || !this.draggedScriptId)
      return;
    evt.preventDefault();
    card.classList.remove('drag-over');
    const targetScriptId = card.dataset.scriptId;
    if (!targetScriptId || targetScriptId === this.draggedScriptId)
      return;
    this.reorderScriptLibrary(this.draggedScriptId, targetScriptId);
  }

  handleScriptDragEnd(evt) {
    evt.currentTarget.classList.remove('is-dragging');
    if (this.scriptListEl) {
      const dragTargets = this.scriptListEl.querySelectorAll('.drag-over');
      for (let i = 0; i < dragTargets.length; i++)
        dragTargets[i].classList.remove('drag-over');
    }
    this.draggedScriptId = null;
  }

  reorderScriptLibrary(sourceScriptId, targetScriptId) {
    const sourceIdx = this.textLibrary.findIndex(item => item.id === sourceScriptId);
    let targetIdx = this.textLibrary.findIndex(item => item.id === targetScriptId);
    if (sourceIdx === -1 || targetIdx === -1 || sourceIdx === targetIdx)
      return;
    const [movedScript] = this.textLibrary.splice(sourceIdx, 1);
    if (sourceIdx < targetIdx)
      targetIdx -= 1;
    this.textLibrary.splice(targetIdx, 0, movedScript);
    this.applySettings();
  }

  selectScript(scriptId) {
    const selected = this.textLibrary.find(item => item.id === scriptId);
    if (selected === undefined)
      return;
    this.stop();
    this.resetStopwatchSafely();
    this.activeTextId = selected.id;
    this.text = selected.text;
    if (this.editorEl)
      this.editorEl.value = this.text;
    if (this.readingEditorEl)
      this.readingEditorEl.value = this.text;
    this.adaptText();
    this.clearPromptDirtyState();
    this.applySettings();
  }

  updateActiveScriptText(text) {
    const activeScript = this.getActiveScript();
    if (activeScript === null)
      return;
    activeScript.text = text;
  }

  renameActiveScript() {
    const activeScript = this.getActiveScript();
    if (activeScript === null)
      return;
    activeScript.title = this.normalizeScriptTitle(this.scriptTitleEl.value);
    this.applySettings();
  }

  createNewScript() {
    const newScript = {
      id: this.createScriptId(),
      title: `Prompt ${this.textLibrary.length + 1}`,
      text: '',
    };
    this.textLibrary.unshift(newScript);
    this.activeTextId = newScript.id;
    this.stop();
    this.resetStopwatchSafely();
    this.text = '';
    if (this.editorEl)
      this.editorEl.value = this.text;
    if (this.readingEditorEl)
      this.readingEditorEl.value = this.text;
    this.adaptText();
    this.clearPromptDirtyState();
    this.applySettings();
    if (this.scriptTitleEl)
      this.scriptTitleEl.focus();
  }

  saveCurrentScript() {
    this.text = this.editorEl.value;
    this.updateActiveScriptText(this.text);
    this.renameActiveScript();
    this.adaptText();
    this.clearPromptDirtyState();
    this.applySettings();
    this.addMessage('info', `Guardaste "${escapeHtml(this.getActiveTextTitle())}".`);
  }

  duplicateCurrentScript() {
    const activeScript = this.getActiveScript();
    if (activeScript === null)
      return;
    const duplicate = {
      id: this.createScriptId(),
      title: `${activeScript.title} copia`,
      text: activeScript.text,
    };
    this.textLibrary.unshift(duplicate);
    this.activeTextId = duplicate.id;
    this.text = duplicate.text;
    if (this.editorEl)
      this.editorEl.value = this.text;
    if (this.readingEditorEl)
      this.readingEditorEl.value = this.text;
    this.adaptText();
    this.clearPromptDirtyState();
    this.applySettings();
  }

  deleteCurrentScript() {
    if (this.textLibrary.length <= 1) {
      const activeScript = this.getActiveScript();
      if (activeScript !== null) {
        activeScript.title = 'Prompt principal';
        activeScript.text = DEFAULT_TEXT_EN;
        this.text = activeScript.text;
      } else {
        this.text = DEFAULT_TEXT_EN;
      }
      this.stop();
      this.resetStopwatchSafely();
      if (this.editorEl)
        this.editorEl.value = this.text;
      if (this.readingEditorEl)
        this.readingEditorEl.value = this.text;
      this.adaptText();
      this.clearPromptDirtyState();
      this.applySettings();
      this.addMessage('warning', 'Debe quedar al menos un prompt guardado.');
      return;
    }
    const activeIdx = this.textLibrary.findIndex(item => item.id === this.activeTextId);
    if (activeIdx === -1)
      return;
    this.textLibrary.splice(activeIdx, 1);
    const nextIdx = min(activeIdx, this.textLibrary.length - 1);
    this.activeTextId = this.textLibrary[nextIdx].id;
    this.text = this.textLibrary[nextIdx].text;
    this.stop();
    this.resetStopwatchSafely();
    if (this.editorEl)
      this.editorEl.value = this.text;
    if (this.readingEditorEl)
      this.readingEditorEl.value = this.text;
    this.adaptText();
    this.clearPromptDirtyState();
    this.applySettings();
  }
}
