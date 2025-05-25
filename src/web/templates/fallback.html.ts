/**
 * Fallback HTML 템플릿
 * Dynamic import 실패 시 사용되는 기본 템플릿
 */
export const fallbackTemplate = `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🔗 LinkDump Bot</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0;
            padding: 20px;
        }
        .container {
            background: white;
            border-radius: 20px;
            padding: 40px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            max-width: 400px;
            text-align: center;
        }
        h1 { color: #2c3e50; margin-bottom: 20px; }
        p { color: #7f8c8d; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔗 LinkDump Bot</h1>
        <p>서비스가 준비 중입니다.</p>
    </div>
</body>
</html>`;
