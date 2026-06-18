(function () {
  'use strict';

  // ── Elements ──────────────────────────────────────────────────────────────

  const furnitureInput   = document.getElementById('furniture-input');
  const furnitureZone    = document.getElementById('furniture-zone');
  const furnitureName    = document.getElementById('furniture-name');
  const furniturePreview = document.getElementById('furniture-preview');
  const furnitureImg     = document.getElementById('furniture-img');

  const wallInput        = document.getElementById('wall-input');
  const wallZone         = document.getElementById('wall-zone');
  const wallName         = document.getElementById('wall-name');
  const wallSaved        = document.getElementById('wall-saved');
  const wallSavedImg     = document.getElementById('wall-saved-img');
  const wallChangeBtn    = document.getElementById('wall-change-btn');

  const furnitureType    = document.getElementById('furniture-type');
  const dimH             = document.getElementById('dim-h');
  const dimW             = document.getElementById('dim-w');
  const dimD             = document.getElementById('dim-d');

  const generateBtn      = document.getElementById('generate-btn');
  const status           = document.getElementById('status');
  const errorMsg         = document.getElementById('error-msg');
  const resultSection    = document.getElementById('result-section');
  const resultImg        = document.getElementById('result-img');
  const downloadBtn      = document.getElementById('download-btn');

  const WALL_STORAGE_KEY = 'pinefinders_wall_photo';

  let selectedFurniture = null;
  let selectedWall      = null;

  (function loadSavedWall() {
    try {
      const saved = localStorage.getItem(WALL_STORAGE_KEY);
      if (saved) {
        const { base64, mimeType } = JSON.parse(saved);
        selectedWall = { base64, mimeType };
        wallSavedImg.src = 'data:' + mimeType + ';base64,' + base64;
        wallSaved.style.display = 'block';
        wallZone.style.display = 'none';
      } else {
        showWallUpload();
      }
    } catch (e) {
      showWallUpload();
    }
  })();

  function showWallUpload() {
    wallSaved.style.display = 'none';
    wallZone.style.display = 'block';
    selectedWall = null;
  }

  furnitureInput.addEventListener('change', function () {
    const file = this.files[0];
    if (file) handleFurnitureFile(file);
  });

  setupDragDrop(furnitureZone, function (file) {
    if (file.type.startsWith('image/')) handleFurnitureFile(file);
  });

  function handleFurnitureFile(file) {
    furnitureName.textContent = file.name;
    resizeImage(file).then(function (dataUrl) {
      const base64 = dataUrl.split(',')[1];
      selectedFurniture = { base64, mimeType: 'image/jpeg' };
      furnitureImg.src = dataUrl;
      furniturePreview.style.display = 'block';
      clearResult();
    });
  }

  wallInput.addEventListener('change', function () {
    const file = this.files[0];
    if (file) handleWallFile(file);
  });

  setupDragDrop(wallZone, function (file) {
    if (file.type.startsWith('image/')) handleWallFile(file);
  });

  wallChangeBtn.addEventListener('click', function () {
    showWallUpload();
  });

  function handleWallFile(file) {
    wallName.textContent = file.name;
    resizeImage(file).then(function (dataUrl) {
      const base64 = dataUrl.split(',')[1];
      const mimeType = 'image/jpeg';
      selectedWall = { base64, mimeType };
      try {
        localStorage.setItem(WALL_STORAGE_KEY, JSON.stringify({ base64, mimeType }));
        wallSavedImg.src = dataUrl;
        wallSaved.style.display = 'block';
        wallZone.style.display = 'none';
      } catch (e) {
        console.warn('Could not save wall photo to localStorage:', e.message);
      }
      clearResult();
    });
  }

  generateBtn.addEventListener('click', async function () {
    if (!selectedFurniture) {
      showError('Please add a furniture photograph first.');
      return;
    }
    if (!selectedWall) {
      showError('Please add a showroom wall reference photo first.');
      return;
    }

    setLoading(true);
    clearResult();

    try {
      const body = {
        furnitureBase64:   selectedFurniture.base64,
        furnitureMimeType: selectedFurniture.mimeType,
        wallBase64:        selectedWall.base64,
        wallMimeType:      selectedWall.mimeType,
        furnitureType:     furnitureType.value.trim(),
        height:            dimH.value.trim(),
        width:             dimW.value.trim(),
        depth:             dimD.value.trim()
      };

      const response = await fetch('/api/gemini-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const json = await response.json();

      if (!response.ok || json.error) {
        let msg = json.error || 'Unknown error from API';
        if (json.reason) msg += ' (reason: ' + json.reason + ')';
        if (json.geminiText) msg += ' — Gemini said: ' + json.geminiText;
        if (json.fullResponse) msg += ' | RAW: ' + json.fullResponse;
        throw new Error(msg);
      }

      const resultDataUrl = 'data:' + json.mimeType + ';base64,' + json.imageBase64;
      resultImg.src = resultDataUrl;
      downloadBtn.href = resultDataUrl;
      resultSection.style.display = 'block';
      resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

    } catch (err) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  });

  function setupDragDrop(zone, onFile) {
    zone.addEventListener('dragover', function (e) {
      e.preventDefault();
      this.classList.add('drag-over');
    });
    zone.addEventListener('dragleave', function () {
      this.classList.remove('drag-over');
    });
    zone.addEventListener('drop', function (e) {
      e.preventDefault();
      this.classList.remove('drag-over');
      const file = e.dataTransfer && e.dataTransfer.files[0];
      if (file) onFile(file);
    });
  }

  function resizeImage(file, maxPx) {
    maxPx = maxPx || 1600;
    return new Promise(function (resolve, reject) {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = function (e) {
        const img = new Image();
        img.onerror = reject;
        img.onload = function () {
          const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
          const w = Math.round(img.width  * scale);
          const h = Math.round(img.height * scale);
          const canvas = document.createElement('canvas');
          canvas.width  = w;
          canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', 0.85));
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function setLoading(loading) {
    generateBtn.disabled = loading;
    generateBtn.textContent = loading ? 'Generating…' : 'Place in Showroom';
    status.style.display = loading ? 'block' : 'none';
  }

  function clearResult() {
    resultSection.style.display = 'none';
    resultImg.src = '';
    downloadBtn.href = '';
    errorMsg.style.display = 'none';
  }

  function showError(msg) {
    errorMsg.textContent = 'Error: ' + msg;
    errorMsg.style.display = 'block';
  }

})();
