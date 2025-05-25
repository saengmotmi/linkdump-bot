const express = require("express");
const { addLink } = require("./add-link");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

// 링크 추가 페이지
app.get("/", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>링크 추가 - LinkDump Bot</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, sans-serif; 
            max-width: 600px; 
            margin: 50px auto; 
            padding: 20px;
            line-height: 1.6;
        }
        .container { 
            background: #f8f9fa; 
            padding: 30px; 
            border-radius: 8px; 
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        input, textarea, button { 
            width: 100%; 
            padding: 12px; 
            margin: 10px 0; 
            border: 1px solid #ddd; 
            border-radius: 4px; 
            font-size: 16px;
        }
        button { 
            background: #007bff; 
            color: white; 
            border: none; 
            cursor: pointer; 
            font-weight: bold;
        }
        button:hover { background: #0056b3; }
        .success { 
            color: #28a745; 
            font-weight: bold; 
            margin-top: 15px;
        }
        .error { 
            color: #dc3545; 
            font-weight: bold; 
            margin-top: 15px;
        }
        h1 { color: #333; text-align: center; }
        .info { 
            background: #e3f2fd; 
            padding: 15px; 
            border-radius: 4px; 
            margin-bottom: 20px;
            font-size: 14px;
        }
        .bookmarklet {
            background: #fff3cd;
            padding: 15px;
            border-radius: 4px;
            margin-top: 20px;
        }
        .bookmarklet a {
            background: #ffc107;
            color: #212529;
            padding: 8px 12px;
            text-decoration: none;
            border-radius: 4px;
            font-weight: bold;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔗 링크 추가</h1>
        
        <div class="info">
            💡 링크를 추가하면 자동으로 AI 요약이 생성되고 등록된 Discord 채널에 전송됩니다.
        </div>

        <form id="linkForm">
            <input type="url" id="url" placeholder="https://example.com" required>
            <input type="text" id="tags" placeholder="태그들 (선택사항, 쉼표로 구분)">
            <button type="submit">링크 추가</button>
        </form>

        <div id="message"></div>

        <div class="bookmarklet">
            <strong>📱 북마클릿 (모바일에서 편리하게):</strong><br>
            아래 링크를 북마크에 추가하면 어떤 페이지에서든 바로 링크를 추가할 수 있습니다.<br><br>
            <a href="javascript:(function(){var url=window.location.href;var title=document.title;window.open('${
              req.get("host")
                ? `http://${req.get("host")}`
                : "http://localhost:3000"
            }?url='+encodeURIComponent(url)+'&title='+encodeURIComponent(title),'_blank','width=400,height=300');})();">
                링크덤프 추가
            </a>
        </div>
    </div>

    <script>
        // URL 파라미터에서 자동 입력
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('url')) {
            document.getElementById('url').value = urlParams.get('url');
        }

        document.getElementById('linkForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const url = document.getElementById('url').value;
            const tags = document.getElementById('tags').value;
            const messageDiv = document.getElementById('message');
            
            try {
                const response = await fetch('/api/add-link', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ 
                        url, 
                        tags: tags ? tags.split(',').map(t => t.trim()) : [] 
                    }),
                });
                
                const result = await response.text();
                
                if (response.ok) {
                    messageDiv.innerHTML = '<div class="success">✅ 링크가 성공적으로 추가되었습니다!</div>';
                    document.getElementById('linkForm').reset();
                } else {
                    messageDiv.innerHTML = '<div class="error">❌ ' + result + '</div>';
                }
            } catch (error) {
                messageDiv.innerHTML = '<div class="error">❌ 오류가 발생했습니다: ' + error.message + '</div>';
            }
        });
    </script>
</body>
</html>
  `);
});

// API 엔드포인트
app.post("/api/add-link", (req, res) => {
  try {
    const { url, tags } = req.body;

    if (!url) {
      return res.status(400).send("URL이 필요합니다");
    }

    addLink(url, tags || []);
    res.send("링크가 추가되었습니다");
  } catch (error) {
    console.error("Error adding link:", error);
    res.status(500).send("링크 추가 중 오류가 발생했습니다");
  }
});

app.listen(PORT, () => {
  console.log(`LinkDump Bot server running on http://localhost:${PORT}`);
  console.log("브라우저에서 접속하여 링크를 추가하세요!");
});

module.exports = app;
