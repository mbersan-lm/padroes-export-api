const express = require("express");
const cors = require("cors");
const puppeteer = require("puppeteer");

const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.post("/export", async (req, res) => {
  const state = req.body;
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox","--disable-setuid-sandbox","--disable-dev-shm-usage","--disable-gpu"],
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 1800, deviceScaleFactor: 1 });
    const html = generateHTML(state);
    console.log("HTML length:", html.length);
    console.log("HTML starts:", html.substring(0, 100));
    await page.setContent(html, { waitUntil: "networkidle0", timeout: 30000 });
    // Aguardar fontes carregarem com retry
    await page.evaluate(async () => {
      await document.fonts.ready;
      // Forçar carregamento das fontes
      var fonts = ["600 192px 'Tusker Grotesk'", "400 48px 'General Sans'", "500 16px 'General Sans'"];
      var promises = fonts.map(function(f) {
        return document.fonts.load(f).catch(function(e) { console.log("Font load failed:", f, e); });
      });
      await Promise.all(promises);
      await document.fonts.ready;
    });
    // Delay extra para renderização completa
    await new Promise((r) => setTimeout(r, 2000));
    const screenshot = await page.screenshot({ type: "png", clip: { x: 0, y: 0, width: 1440, height: 1800 } });
    res.set("Content-Type", "image/png");
    res.set("Content-Disposition", 'attachment; filename="template.png"');
    res.send(screenshot);
  } catch (err) {
    console.error("Export error:", err);
    res.status(500).json({ error: err.message });
  } finally {
    if (browser) await browser.close();
  }
});

function generateHTML(s) {
  var creditPositions = {
    "top-left": { top: 614, left: 72, rotation: -90 },
    "bottom-left": { top: 1024, left: 72, rotation: -90 },
    "top-right": { top: 317, left: 1368, rotation: 90 },
    "bottom-right": { top: 727, left: 1368, rotation: 90 },
  };
  var creditPos = creditPositions[s.creditPosition] || creditPositions["top-left"];
  var logoW = s.logoWidth || 180;
  var logoPositions = {
    left: { top: 72, left: 71 },
    center: { top: 72, left: Math.round((1440 - logoW) / 2) },
    right: { top: 72, left: 1440 - 72 - logoW },
  };
  var logoPos = logoPositions[s.logoPosition] || logoPositions["center"];
  var bgPosX = s.backgroundOffsetX != null ? s.backgroundOffsetX : 50;
  var bgPosY = s.backgroundOffsetY != null ? s.backgroundOffsetY : 50;
  var pipSize = s.pipSize || 500;
  var pipRadius = pipSize / 2;
  var pipX = (s.pipX || 720) - pipRadius;
  var pipY = (s.pipY || 900) - pipRadius;
  var pipZoom = s.pipImageZoom || 100;
  var pipOffsetX = s.pipImageOffsetX != null ? s.pipImageOffsetX : 50;
  var pipOffsetY = s.pipImageOffsetY != null ? s.pipImageOffsetY : 50;
  var blurLayersHTML = "";
  var blurRegionTop = 760;
  var blurRegionHeight = 1040;
  var numLayers = 12;
  var maxBlur = 5;
  for (var i = 0; i < numLayers; i++) {
    var blur = (maxBlur * (i + 1)) / numLayers;
    var startPct = (i / numLayers) * 100;
    var endPct = ((i + 1) / numLayers) * 100;
    var maskStart = Math.max(0, startPct - 2);
    blurLayersHTML += '<div style="position:absolute;left:0;top:' + blurRegionTop + 'px;width:1440px;height:' + blurRegionHeight + 'px;backdrop-filter:blur(' + blur.toFixed(1) + 'px);-webkit-backdrop-filter:blur(' + blur.toFixed(1) + 'px);-webkit-mask-image:linear-gradient(to bottom,transparent ' + maskStart + '%,black ' + endPct + '%);mask-image:linear-gradient(to bottom,transparent ' + maskStart + '%,black ' + endPct + '%);"></div>';
  }
  var titleTextGap = s.titleTextGap || 9;
  var textBarGap = s.textBarGap || 36;
  var parts = [];
  parts.push('<!DOCTYPE html>');
  parts.push('<html><head><meta charset="utf-8"><style>');
  parts.push('@font-face{font-family:"Tusker Grotesk";src:url("file:///usr/local/share/fonts/TuskerGrotesk-Semibold.otf") format("opentype");font-weight:600;font-style:normal;}');
  parts.push('@font-face{font-family:"General Sans";src:url("file:///usr/local/share/fonts/GeneralSans-Regular.otf") format("opentype");font-weight:400;font-style:normal;}');
  parts.push('@font-face{font-family:"General Sans";src:url("file:///usr/local/share/fonts/GeneralSans-Medium.otf") format("opentype");font-weight:500;font-style:normal;}');
  parts.push('*{margin:0;padding:0;box-sizing:border-box;}');
  parts.push('body{width:1440px;height:1800px;overflow:hidden;background:black;}');
  parts.push('</style></head><body>');
  parts.push('<div id="template" style="position:relative;width:1440px;height:1800px;overflow:hidden;background:black;">');

  // Background image
  if (s.backgroundImage) {
    parts.push('<img src="' + s.backgroundImage + '" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:' + bgPosX + '% ' + bgPosY + '%;" />');
  }

  // PiP elipse
  if (s.pipEnabled && s.pipImage) {
    parts.push('<div style="position:absolute;left:' + pipX + 'px;top:' + pipY + 'px;width:' + pipSize + 'px;height:' + pipSize + 'px;border-radius:50%;border:10px solid white;overflow:hidden;z-index:2;">');
    parts.push('<img src="' + s.pipImage + '" style="width:' + pipZoom + '%;height:' + pipZoom + '%;min-width:100%;min-height:100%;object-fit:cover;object-position:' + pipOffsetX + '% ' + pipOffsetY + '%;" />');
    if (s.pipCredit) {
      var pr = pipSize * 0.42;
      var pcx = pipSize / 2;
      var pcy = pipSize / 2;
      parts.push('<svg style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none;" viewBox="0 0 ' + pipSize + ' ' + pipSize + '">');
      parts.push('<defs><path id="pip-credit-path" d="M ' + pcx + ',' + (pcy - pr) + ' A ' + pr + ',' + pr + ' 0 1,1 ' + (pcx - 0.001) + ',' + (pcy - pr) + '"/></defs>');
      parts.push('<text fill="white" style="font-family:\'General Sans\',sans-serif;font-size:14px;font-weight:500;letter-spacing:0.5px;text-transform:uppercase;">');
      parts.push('<textPath href="#pip-credit-path" startOffset="75%" text-anchor="middle">' + s.pipCredit + '</textPath>');
      parts.push('</text></svg>');
    }
    parts.push('</div>');
  }

  // Foreground (foto sem fundo)
  if (s.pipEnabled && s.foregroundImage) {
    parts.push('<img src="' + s.foregroundImage + '" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:' + bgPosX + '% ' + bgPosY + '%;z-index:3;" />');
  }

  // Blur progressivo
  parts.push('<div style="position:absolute;inset:0;z-index:4;">');
  parts.push(blurLayersHTML);
  parts.push('</div>');

  // Gradiente escuro
  parts.push('<div style="position:absolute;left:0;bottom:0;width:1440px;height:1040px;background:linear-gradient(180deg,rgba(0,0,0,0.00) 0%,rgba(0,0,0,0.97) 100%);z-index:5;"></div>');

  // Conteúdo de texto
  parts.push('<div style="position:absolute;bottom:0;left:0;right:0;display:flex;flex-direction:column;align-items:center;padding:0 72px 85px;z-index:10;">');

  if (s.title) {
    parts.push('<h2 style="width:1296px;color:#FFF;text-align:center;font-family:\'Tusker Grotesk\',Impact,sans-serif;font-size:192px;font-weight:700;line-height:110%;letter-spacing:1px;text-transform:uppercase;margin-bottom:9px;">' + s.title + '</h2>');
  }
  if (s.text) {
    parts.push('<p style="width:1296px;color:#FFF;text-align:center;font-family:\'General Sans\',sans-serif;font-size:48px;font-weight:400;line-height:130%;letter-spacing:0.48px;margin-bottom:36px;">' + s.text + '</p>');
  }

  // Barra gradiente segmentada (carrossel)
  var totalPages = s.totalPages || 1;
  var currentPageIndex = s.currentPageIndex || 0;
  
  if (totalPages === 1) {
    parts.push('<div style="width:1296px;height:6px;border-radius:30px;background:linear-gradient(90deg,#F64C68 0%,#FFB800 33%,#61B8E0 66%,#58C071 100%);"></div>');
  } else {
    var segGap = 20;
    var totalGaps = (totalPages - 1) * segGap;
    var segWidth = Math.floor((1296 - totalGaps) / totalPages);
    parts.push('<div style="display:flex;gap:20px;width:1296px;">');
    for (var p = 0; p < totalPages; p++) {
      if (p === currentPageIndex) {
        parts.push('<div style="width:' + segWidth + 'px;height:6px;border-radius:30px;background:linear-gradient(90deg,#F64C68 0%,#FFB800 33%,#61B8E0 66%,#58C071 100%);"></div>');
      } else {
        parts.push('<div style="width:' + segWidth + 'px;height:6px;border-radius:30px;background:rgba(255,255,255,0.07);border:0.75px solid rgba(255,255,255,0.50);"></div>');
      }
    }
    parts.push('</div>');
  }
  parts.push('</div>');

  // Logo CazéTV
  if (s.logoImage) {
    var logoW = s.logoWidth || 180;
    parts.push('<img src="' + s.logoImage + '" style="position:absolute;top:' + logoPos.top + 'px;left:' + logoPos.left + 'px;width:' + logoW + 'px;height:96px;z-index:10;" />');
  }

  // Crédito
  if (s.credit && s.creditVisible) {
    parts.push('<div style="position:absolute;top:' + creditPos.top + 'px;left:' + creditPos.left + 'px;width:297px;height:17px;transform:rotate(' + creditPos.rotation + 'deg);transform-origin:top left;z-index:10;color:#FFF;font-family:\'General Sans\',sans-serif;font-size:16px;font-weight:500;font-style:normal;line-height:105.563%;letter-spacing:0.32px;text-transform:uppercase;white-space:nowrap;">' + s.credit + '</div>');
  }

  // Escudo
  if (s.shieldEnabled && s.shieldImage) {
    parts.push('<div style="position:absolute;top:52px;left:0;width:190px;height:160px;border-radius:0 12px 12px 0;background:' + (s.shieldColor || '#333') + ';backdrop-filter:blur(5px);display:flex;align-items:center;justify-content:center;z-index:20;">');
    parts.push('<img src="' + s.shieldImage + '" style="width:121px;height:121px;object-fit:contain;" />');
    parts.push('</div>');
  }

  parts.push('</div>');
  parts.push('</body></html>');
  return parts.join('');
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, function() {
  console.log("Export server running on port " + PORT);
});
