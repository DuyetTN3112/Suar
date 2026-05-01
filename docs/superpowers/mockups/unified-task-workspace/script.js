(() => {
  const body = document.body;
  const title = document.getElementById('workspace-title');
  const subtitle = document.querySelector('.workspace-subtitle');
  const modeLabel = document.getElementById('mode-label');
  const contextualBoard = document.querySelector('.contextual-board');
  const primaryActions = document.querySelectorAll('.primary-action');
  const publishTask = document.getElementById('publish-task');
  const creatorConfirmed = document.getElementById('creator-confirmed');
  const saveStatus = document.getElementById('save-status');
  const toast = document.getElementById('toast');
  let toastTimer;

  const modeConfig = {
    create: { label: 'Tạo task', primary: 'Lưu nháp', board: 'Board', titleKey: 'createTitle', copyKey: 'createCopy' },
    edit: { label: 'Sửa task', primary: 'Lưu thay đổi', board: 'Board', titleKey: 'editTitle', copyKey: 'editCopy' },
    detail: { label: 'Chi tiết task', primary: '', board: 'Board', titleKey: 'detailTitle', copyKey: 'detailCopy' },
    review: { label: 'Chi tiết review', primary: '', board: 'Review Board', titleKey: 'detailTitle', copyKey: 'reviewCopy' },
  };

  function showToast(message) {
    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add('is-visible');
    toastTimer = window.setTimeout(() => toast.classList.remove('is-visible'), 3600);
  }

  function setView(view) {
    const config = modeConfig[view];
    if (!config) return;

    body.dataset.mode = view;
    modeLabel.textContent = config.label;
    title.textContent = title.dataset[config.titleKey];
    subtitle.textContent = subtitle.dataset[config.copyKey];
    contextualBoard.textContent = config.board;
    const boardStatus = view === 'review' ? 'Delivery done' : 'In progress';
    document.getElementById('board-status').textContent = boardStatus;
    document.getElementById('sidebar-board-status').textContent = boardStatus;
    primaryActions.forEach((button) => { button.textContent = config.primary; });
    syncPublishAction();

    document.querySelectorAll('[data-view]').forEach((button) => {
      const isCurrent = button.dataset.view === view;
      button.classList.toggle('is-active', isCurrent);
      button.setAttribute('aria-pressed', String(isCurrent));
    });

    activatePanel('brief');
    if (view === 'edit') saveStatus.textContent = 'Bản chỉnh sửa chưa được lưu';
    if (view === 'create') saveStatus.textContent = 'Đã lưu nháp cục bộ';
  }

  function activatePanel(panelName) {
    const requestedPanel = document.querySelector(`[data-panel="${panelName}"]`);
    if (!requestedPanel) return;

    const isDetailMode = body.dataset.mode === 'detail' || body.dataset.mode === 'review';
    if (requestedPanel.classList.contains('detail-only') && !isDetailMode) return;
    if (requestedPanel.classList.contains('review-only') && body.dataset.mode !== 'review') return;

    body.dataset.activePanel = panelName;
    document.querySelectorAll('.content-panel').forEach((panel) => {
      const isSelected = panel.dataset.panel === panelName;
      panel.classList.toggle('is-visible', isSelected);
      panel.setAttribute('aria-hidden', String(!isSelected));
    });
    document.querySelectorAll('.workspace-tab').forEach((tab) => {
      const isSelected = tab.dataset.panelTarget === panelName;
      tab.classList.toggle('is-selected', isSelected);
      tab.setAttribute('aria-selected', String(isSelected));
      tab.tabIndex = isSelected ? 0 : -1;
    });
  }

  function initializeTaskTabs() {
    document.querySelectorAll('.workspace-tab').forEach((tab) => {
      const panelName = tab.dataset.panelTarget;
      const panel = document.querySelector(`[data-panel="${panelName}"]`);
      if (!panelName || !panel) return;
      panel.id = `panel-${panelName}`;
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', tab.id);
      tab.setAttribute('aria-controls', panel.id);
    });
  }

  function refreshIndexes(repeaterName) {
    const prefixes = { rules: 'R', quality: 'Q', limits: 'L', dependencies: 'P' };
    document.querySelectorAll(`#${repeaterName} [data-item="${repeaterName}"] .compound-item__index`).forEach((index, position) => {
      index.textContent = prefixes[repeaterName] ? `${prefixes[repeaterName]}${position + 1}` : String(position + 1);
    });
  }

  function addRepeaterItem(repeaterName) {
    const template = document.getElementById(`${repeaterName}-template`);
    const target = document.getElementById(repeaterName);
    if (!template || !target) return;

    target.appendChild(template.content.cloneNode(true));
    refreshIndexes(repeaterName);
    target.querySelector(`[data-item="${repeaterName}"]:last-child input, [data-item="${repeaterName}"]:last-child select`)?.focus();
    setDirtyState();
  }

  function removeRepeaterItem(button, repeaterName) {
    const target = document.getElementById(repeaterName);
    const item = button.closest(`[data-item="${repeaterName}"]`);
    if (!target || !item) return;
    const minimumItems = Number(target.dataset.minItems ?? 1);
    if (target.querySelectorAll(`[data-item="${repeaterName}"]`).length <= minimumItems) {
      showToast(minimumItems === 0 ? 'Không còn dòng nào trong nhóm thông tin tùy chọn.' : 'Nhóm thông tin này cần ít nhất một dòng.');
      return;
    }
    item.remove();
    refreshIndexes(repeaterName);
    setDirtyState();
  }

  function setDirtyState() {
    if (body.dataset.mode === 'create' || body.dataset.mode === 'edit') {
      saveStatus.textContent = 'Có thay đổi chưa lưu';
    }
  }

  function updateSummaryFromSelect(select) {
    if (select.id === 'role-select') {
      const assignee = document.getElementById('assignee-select');
      const selectedRole = select.value;
      Array.from(assignee.options).forEach((option) => {
        const isAvailable = selectedRole === 'none' || option.dataset.roles.split(' ').includes(selectedRole);
        option.hidden = !isAvailable;
        option.disabled = !isAvailable;
      });
      if (assignee.options[assignee.selectedIndex].disabled) {
        const firstAvailable = Array.from(assignee.options).find((option) => !option.disabled);
        if (firstAvailable) assignee.value = firstAvailable.value;
      }
      updateSummaryFromSelect(assignee);
      showToast(selectedRole === 'none' ? 'Danh sách assignee không lọc theo role.' : 'Danh sách assignee đã lọc theo vai trò Project.');
      return;
    }
    if (select.id === 'assignee-select') {
      const option = select.options[select.selectedIndex];
      const name = option.dataset.name || option.textContent;
      document.getElementById('assignee-name').textContent = name;
      document.getElementById('assignee-initials').textContent = option.dataset.initials || name.slice(0, 2).toUpperCase();
      document.getElementById('read-assignee').textContent = option.textContent;
      return;
    }
    if (select.id === 'priority-select') {
      document.getElementById('sidebar-priority').textContent = select.value;
      document.getElementById('read-priority').textContent = select.value;
      return;
    }
    if (select.id === 'visibility-select') {
      document.getElementById('sidebar-visibility').textContent = select.value;
      document.getElementById('read-visibility').textContent = select.value;
      return;
    }
    if (select.classList.contains('skill-select') || select.classList.contains('skill-level')) {
      const skill = document.querySelector('#skill-items .skill-select')?.value || 'Svelte';
      const level = document.querySelector('#skill-items .skill-level')?.value || 'L4';
      document.getElementById('sidebar-skill').textContent = skill;
      document.getElementById('sidebar-level').textContent = level;
      document.getElementById('read-skill').textContent = `${skill} · ${level} · Timeline ở chi tiết task`;
    }
  }

  function handlePrimaryAction() {
    if (body.dataset.mode === 'create') {
      saveStatus.textContent = 'Đã lưu nháp lúc này';
      showToast('Đã lưu nháp mock. Kiểm tra trước khi giao vẫn hiển thị các điểm cần xác nhận.');
    }
    if (body.dataset.mode === 'edit') {
      saveStatus.textContent = 'Đã lưu thay đổi lúc này';
      showToast('Đã lưu phiên bản contract mock mới.');
    }
  }

  function syncPublishAction() {
    if (!publishTask || !creatorConfirmed) return;
    const canPublish = body.dataset.mode === 'create' && creatorConfirmed.checked;
    publishTask.disabled = !canPublish;
    publishTask.setAttribute('aria-disabled', String(!canPublish));
  }

  function handlePublish() {
    if (!creatorConfirmed?.checked) {
      creatorConfirmed?.focus();
      showToast('Xác nhận phiên bản cuối trước khi tạo task.');
      return;
    }
    setView('detail');
    showToast('Đã tạo task mock ở cột In progress. Đây là cùng Task Workspace ở chế độ đọc.');
  }

  document.addEventListener('click', (event) => {
    const viewButton = event.target.closest('[data-view]');
    if (viewButton) { setView(viewButton.dataset.view); return; }

    const panelButton = event.target.closest('[data-panel-target]');
    if (panelButton) { activatePanel(panelButton.dataset.panelTarget); return; }

    const addButton = event.target.closest('[data-add]');
    if (addButton) { addRepeaterItem(addButton.dataset.add); return; }

    const removeButton = event.target.closest('[data-remove]');
    if (removeButton) { removeRepeaterItem(removeButton, removeButton.dataset.remove); return; }

    if (event.target.closest('[data-action="primary"]')) { handlePrimaryAction(); return; }
    if (event.target.closest('[data-action="publish"]')) { handlePublish(); return; }
    if (event.target.closest('.edit-button')) { setView('edit'); showToast('Đang sửa trong cùng Task Workspace.'); return; }
    if (event.target.closest('.cancel-button')) { showToast('Prototype không điều hướng khỏi trang.'); return; }
    if (event.target.closest('[data-action="audit"]')) {
      showToast('Đã đối chiếu: nội dung task, nghiệm thu, phân công/kế hoạch, checkpoint giao task, context, thảo luận, tệp/bàn giao, lịch sử và review theo vai trò.');
      return;
    }
    if (event.target.closest('[data-action="respond"]')) {
      document.getElementById('review-note')?.focus();
      showToast('Phản hồi dùng chung tab Đánh giá của task này.');
      return;
    }
    if (event.target.closest('[data-action="accept-review"]')) {
      showToast('Đã ghi nhận thao tác đồng ý trong mockup.');
      return;
    }
    if (event.target.closest('[data-action="send-review"]')) {
      const note = document.getElementById('review-note');
      if (!note.value.trim()) { note.focus(); showToast('Viết phản hồi trước khi gửi.'); }
      else {
        note.value = '';
        showToast('Đã gửi phản hồi mock.');
      }
      return;
    }
    if (event.target.closest('[data-action="send-discussion"]')) {
      const note = document.getElementById('discussion-note');
      if (!note.value.trim()) { note.focus(); showToast('Viết trao đổi trước khi gửi.'); }
      else { note.value = ''; showToast('Đã gửi trao đổi mock.'); }
    }
    if (event.target.closest('[data-action="open-reference"]')) { showToast('Đây là tham chiếu mock; prototype không mở hệ thống ngoài.'); }
  });

  document.addEventListener('input', (event) => {
    if (event.target.matches('input, textarea')) setDirtyState();
    if (event.target.id === 'estimate') showToast('Estimate thay đổi: ngày dự kiến chỉ được tính sau khi Project chốt quy ước công suất.');
    if (event.target.id === 'due-date') showToast('Ngày dự kiến thay đổi: estimate cần đồng bộ bằng cùng quy ước công suất.');
  });

  document.addEventListener('change', (event) => {
    if (event.target.id === 'creator-confirmed') {
      syncPublishAction();
      setDirtyState();
      return;
    }
    if (event.target.matches('select')) {
      updateSummaryFromSelect(event.target);
      setDirtyState();
    }
  });

  document.addEventListener('keydown', (event) => {
    const tab = event.target.closest?.('.workspace-tab');
    if (!tab || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    const visibleTabs = Array.from(document.querySelectorAll('.workspace-tab')).filter(
      (candidate) => getComputedStyle(candidate).display !== 'none'
    );
    const currentIndex = visibleTabs.indexOf(tab);
    if (currentIndex < 0) return;
    event.preventDefault();
    const nextIndex = event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? visibleTabs.length - 1
        : (currentIndex + (event.key === 'ArrowRight' ? 1 : -1) + visibleTabs.length) % visibleTabs.length;
    const nextTab = visibleTabs[nextIndex];
    nextTab.focus();
    activatePanel(nextTab.dataset.panelTarget);
  });

  document.addEventListener('submit', (event) => event.preventDefault());
  initializeTaskTabs();
  setView('create');
})();
