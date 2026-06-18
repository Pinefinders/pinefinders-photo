(function () {
  'use strict';

  const photoInput   = document.getElementById('photo-input');
  const uploadZone   = document.getElementById('upload-zone');
  const fileName     = document.getElementById('file-name');
  const previewSection = document.getElementById('preview-section');
  const previewImg   = document.getElementById('preview-img');
  const generateBtn  = document.getElementById('generate-btn');
  const status       = document.getElementById('status');
  const errorMsg     = document.getElementById('error-msg');
  const resultSection = document.getElementById('result-section');
  const resultImg    = document.getElementById('result-img');
  const downloadBtn  = document.getElementById('download-btn');

  let selectedFile = null;

  photoInput.addEventListener('change', function () {
    const file = this.files[0];
    if (!file) return;
    handleFile(file);
  });

  uploadZone.addEventListener('dragover', function (e) {
    e.preventDefault();
    this.classList.add('drag-over');
  });

  uploadZone.addEventListener('dragleave', function () {
    this.classList.remove('drag-over');
  });

  uploadZone.addEventListener('drop', function (e) {
    e.preventDefault();
    this.classList.remove('drag-over');
    const file = e.dataTransfer?.files[0];
    if (file && file.type.startsWith('image/')) {
      handleFile(file);
    }
  });

  function handleFile(file) {
    selectedFile = file;
    fileName.textContent = file.name;
    const reader = new FileReader();
    reader.onload = function (e) {
      previewImg.src = e.target.result;
      previewSection.style.display = 'block';
      generateBtn.style.display = 'block';
      clearResult();
    };
    reader.readAsDataURL(file);
  }

  generateBtn.addEventListener('click', async function () {
    if (!selectedFile) return;
    setLoading(true);
    clearResult();
    try {
      const base64 = await fileToBase64(selectedFile);
      const data = base64.split(',')[1];
      const mimeType = selectedFile.type || 'image/jpeg';
      const response = await fetch('/api/gemini-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: data, mimeType })
      });
      const json = await response.json();
      if (!response.ok || json.error) throw new Error(json.error || 'Unknown error from API');
      const resultDataUrl = `data:${json.mimeType};base64,${json.imageBase64}`;
      resultImg.src = resultDataUrl;
      downloadBtn.href = resultDataUrl;
      resultSection.style.display = 'block';
    } catch (err) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  });

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function setLoading(loading) {
    generateBtn.disabled = loading;
    generateBtn.textContent = loading ? 'Generating…' : 'Place in Showroom';
    status.style.display = loading ? 'block' : 'none';
    errorMsg.style.display = 'none';
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
