export const indexTemplate = `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🔗 LinkDump Bot</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .container {
            background: white;
            border-radius: 20px;
            padding: 40px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            max-width: 600px;
            width: 100%;
        }
        h1 {
            color: #2c3e50;
            margin-bottom: 10px;
            font-size: 2.2em;
            font-weight: 700;
            text-align: center;
        }
        .subtitle {
            color: #7f8c8d;
            margin-bottom: 30px;
            font-size: 1.1em;
            text-align: center;
        }
        .form-group {
            margin-bottom: 20px;
        }
        label {
            display: block;
            margin-bottom: 8px;
            color: #2c3e50;
            font-weight: 600;
        }
        input[type="url"], input[type="text"] {
            width: 100%;
            padding: 12px 16px;
            border: 2px solid #e1e8ed;
            border-radius: 8px;
            font-size: 16px;
            transition: border-color 0.3s;
        }
        input[type="url"]:focus, input[type="text"]:focus {
            outline: none;
            border-color: #667eea;
        }
        .button-group {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
        }
        button {
            width: 100%;
            padding: 12px 24px;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
        }
        .btn-submit {
            background: linear-gradient(45deg, #667eea, #764ba2);
            color: white;
        }
        .btn-submit:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }
        .btn-submit:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
        }
        .url-input-container {
            position: relative;
        }
        .url-loading {
            position: absolute;
            right: 12px;
            top: 50%;
            transform: translateY(-50%);
            display: none;
        }
        .url-loading.show {
            display: block;
        }
        .url-loading::after {
            content: '';
            display: inline-block;
            width: 16px;
            height: 16px;
            border: 2px solid #f3f3f3;
            border-top: 2px solid #667eea;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        .preview-card {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 20px;
            display: none;
        }
        .preview-card.show {
            display: block;
            animation: slideIn 0.3s ease-out;
        }
        @keyframes slideIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .preview-title {
            font-size: 1.2em;
            font-weight: 600;
            color: #2c3e50;
            margin-bottom: 8px;
        }
        .preview-description {
            color: #6c757d;
            margin-bottom: 12px;
            line-height: 1.5;
        }
        .preview-summary {
            background: white;
            padding: 12px;
            border-radius: 8px;
            border-left: 4px solid #667eea;
            font-style: italic;
            color: #495057;
        }
        .preview-url {
            font-size: 0.9em;
            color: #6c757d;
            word-break: break-all;
            margin-bottom: 12px;
        }
        .message {
            padding: 12px 16px;
            border-radius: 8px;
            margin-bottom: 20px;
            display: none;
        }
        .message.show {
            display: block;
        }
        .message.success {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        .message.error {
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
        .loading {
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 3px solid #f3f3f3;
            border-top: 3px solid #667eea;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔗 링크 추가</h1>
        <p class="subtitle">링크를 추가하면 자동으로 AI 요약을 생성하여 등록된 Discord 채널로 전송됩니다.</p>
        
        <form id="linkForm">
            <div class="form-group">
                <label for="url">링크 URL</label>
                <div class="url-input-container">
                    <input type="url" id="url" name="url" placeholder="https://example.com" required>
                    <span class="url-loading"></span>
                </div>
            </div>
            
            <div class="form-group">
                <label for="tags">태그 (선택사항)</label>
                <input type="text" id="tags" name="tags" placeholder="기술, AI, 개발">
            </div>
            
            <div class="button-group">
                <button type="submit" id="submitBtn" class="btn-submit">링크 추가하기</button>
            </div>
        </form>
        
        <div id="previewCard" class="preview-card">
            <div class="preview-url" id="previewUrl"></div>
            <div class="preview-title" id="previewTitle"></div>
            <div class="preview-description" id="previewDescription"></div>
            <div class="preview-summary" id="previewSummary"></div>
        </div>
        
        <div id="message" class="message"></div>
    </div>

    <script>
        const form = document.getElementById('linkForm');
        const urlInput = document.getElementById('url');
        const tagsInput = document.getElementById('tags');
        const submitBtn = document.getElementById('submitBtn');
        const previewCard = document.getElementById('previewCard');
        const message = document.getElementById('message');
        const urlLoading = document.querySelector('.url-loading');

        let previewTimeout;
        let currentPreviewUrl = '';

        // URL 입력 시 자동 미리보기
        urlInput.addEventListener('input', () => {
            const url = urlInput.value.trim();
            
            // 이전 타이머 취소
            if (previewTimeout) {
                clearTimeout(previewTimeout);
            }

            // URL이 비어있으면 미리보기 숨기기
            if (!url) {
                hidePreview();
                currentPreviewUrl = '';
                return;
            }

            // 유효한 URL인지 확인
            try {
                new URL(url);
            } catch {
                // 유효하지 않은 URL이면 미리보기 숨기기
                hidePreview();
                currentPreviewUrl = '';
                return;
            }

            // 같은 URL이면 다시 요청하지 않음
            if (url === currentPreviewUrl) {
                return;
            }

            // 1초 후에 미리보기 생성
            previewTimeout = setTimeout(() => {
                generatePreview(url);
            }, 1000);
        });

        // 미리보기 생성 함수
        async function generatePreview(url) {
            if (!url || url === currentPreviewUrl) return;

            currentPreviewUrl = url;
            urlLoading.classList.add('show');
            hidePreview();

            try {
                const response = await fetch('/api/preview', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url })
                });

                const result = await response.json();

                // URL이 변경되었으면 결과 무시
                if (url !== currentPreviewUrl) return;

                if (result.success) {
                    showPreview(result.preview);
                } else {
                    console.warn('미리보기 생성 실패:', result.error);
                    hidePreview();
                }
            } catch (error) {
                console.warn('미리보기 생성 중 오류:', error);
                hidePreview();
            } finally {
                urlLoading.classList.remove('show');
            }
        }

        // 폼 제출
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const url = urlInput.value.trim();
            const tags = tagsInput.value.trim().split(',').map(tag => tag.trim()).filter(tag => tag);
            
            if (!url) {
                showMessage('URL을 입력해주세요.', 'error');
                return;
            }

            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="loading"></span> 처리 중...';

            try {
                const response = await fetch('/api/add-link', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url, tags })
                });

                const result = await response.json();

                if (result.success) {
                    showMessage('링크가 성공적으로 추가되었습니다! 백그라운드에서 처리 중입니다.', 'success');
                    form.reset();
                    hidePreview();
                } else {
                    showMessage('링크 추가 실패: ' + result.error, 'error');
                }
            } catch (error) {
                showMessage('링크 추가 중 오류가 발생했습니다.', 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '링크 추가하기';
            }
        });

        function showPreview(preview) {
            document.getElementById('previewUrl').textContent = preview.url;
            document.getElementById('previewTitle').textContent = preview.title || '제목 없음';
            document.getElementById('previewDescription').textContent = preview.description || '설명 없음';
            document.getElementById('previewSummary').textContent = preview.summary || '요약 없음';
            
            previewCard.classList.add('show');
        }

        function hidePreview() {
            previewCard.classList.remove('show');
        }

        function showMessage(text, type) {
            message.textContent = text;
            message.className = 'message show ' + type;
            setTimeout(() => {
                message.classList.remove('show');
            }, 5000);
        }
    </script>
</body>
</html>`;
