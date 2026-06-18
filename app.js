(function () {
  'use strict';

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
  let selectedFurniture  = null;
  let selectedWall       = null;

  // Load saved wall photo on startup
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

  // Furniture upload
  furnitureInput.addEventListener('change', function () {
    const file = this.files[0];
    if (file) handleFurnitureFile(file);
  });
  setupDragDrop(furnitureZone, function (file) {
    if (file.type.startsWith('image/')) handleFurnitureFile(file);
  });

  function handleFurnitureFile(file) {
    furnitureName.textContent = file.name;
    fileToBase64(file).then(function (dataUrl) {
      selectedFurniture = { base64: dataUrl.split(',')[1], mimeType: file.type || 'image/jpeg' };
      furnitureImg.src = dataUrl;
      furniturePreview.style.display = 'block';
      clearResult();
    });
  }

  // Wall photo upload
  wallInput.addEventListener('change', function () {
    const file = this.files[0];
    if (file) handleWallFile(file);
  });
  setupDragDrop(wallZone, function (file) {
    if (file.type.startsWith('image/')) handleWallFile(file);
  });
  wallChangeBtn.addEventListener('click', showWallUpload);

  function handleWallFile(file) {
    wallName.textContent = file.name;
    fileToBase64(file).then(function (dataUrl) {
      const base64 = dataUrl.split(',')[1];
      const mimeType = file.type || 'image/jpeg';
      selectedWall = { base64, mimeType };
      try {
        localStorage.setItem(WALL_STORAGE_KEY, JSON.stringify({ base64, mimeType }));
        wallSavedImg.src = dataUrl;
        wallSaved.style.display = 'block';
        wallZone.style.display = 'none';
      } catch (e) {
        console.warn('Could not save wall photo:', e.message);
      }
      clearResult();
    });
  }

  // Generate
  generateBtn.addEventListener('click', async function () {
    if (!selectedFurniture) { showError('Please add a furniture photograph first.'); return; }
    if (!selectedWall)      { showError('Please add a showroom wall reference photo first.'); return; }
    setLoading(true);
    clearResult();
    try {
      const response = await fetch('/api/gemini-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          furnitureBase64:   selectedFurniture.base64,
          furnitureMimeType: selectedFurniture.mimeType,
          wallBase64:        selectedWall.base64,
          wallMimeType:      selectedWall.mimeType,
          furnitureType:     furnitureType.value.trim(),
          height:            dimH.value.trim(),
          width:             dimW.value.trim(),
          depth:             dimD.value.trim()
        })
      });
      const json = await response.json();
      if (!response.ok || json.error) throw new Error(json.error || 'Unknown error from API');
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
    zone.addEventListener('dragover', function (e) { e.preventDefault(); this.classList.add('drag-over'); });
    zone.addEventListener('dragleave', function () { this.classList.remove('drag-over'); });
    zone.addEventListener('drop', function (e) {
      e.preventDefault(); this.classList.remove('drag-over');
      const file = e.dataTransfer && e.dataTransfer.files[0];
      if (file) onFile(file);
    });
  }

  function fileToBase64(file) {
    return new Promise(function (resolve, reject) {
      const reader = new FileReader();
      reader.onload = function (e) { resolve(e.target.result); };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function setLoading(loading) {
    generateBtn.disabled = loading;
    generateBtn.textContent = loading ? 'Generating…' : 'Place in Showroom';
    status.style.display = loading ? 'block' : 'none';
    if (!loading) errorMsg.style.display = 'none';
  }

  function clearResult() {
    resultSection.style.display = 'none';
    resultImg.src = ''; downloadBtn.href = '';
    errorMsg.style.display = 'none';
  }

  function showError(msg) {
    errorMsg.textContent = 'Error: ' + msg;
    errorMsg.style.display = 'block';
  }

})();
