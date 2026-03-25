js
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
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 1800, deviceScaleFactor: 1 });

    const html = generateHTML(state);
    await page.setContent(html, { waitUntil: "networkidle0" });

    // Aguardar fontes carregarem
    await page.evaluate(() => document.fonts.ready);
    // Pequeno delay extra para garantir renderização
    await new Promise((r) => setTimeout(r, 500));

    const screenshot = await page.screenshot({
      type: "png",
      clip: { x: 0, y: 0, width: 1440, height: 1800 },
    });

    res.set("Content-Type", "image/png");
    res.set("Content-Disposition", "attachment; filename=template.png");
    res.send(screenshot);
  } catch (err) {
    console.error("Export error:", err);
    res.status(500).json({ error: err.message });
  } finally {
    if (browser) await browser.close();
  }
});

function generateHTML(s) {
  // Posições do crédito
  const creditPositions = {
    "top-left": { top: 317, left: 72, rotation: 90 },
    "bottom-left": { top: 727, left: 72, rotation: 90 },
    "top-right": { top: 317, left: 1351, rotation: -90 },
    "bottom-right": { top: 727, left: 1351, rotation: -90 },
  };
  const creditPos = creditPositions[s.creditPosition] || creditPositions["top-left"];

  // Posições da logo
  const logoPositions = {
    left: { top: 72, left: 71 },
    center: { top: 72, left: 630 },
    right: { top: 72, left: 1188 },
  };
  const logoPos = logoPositions[s.logoPosition] || logoPositions["center"];

  // Background position (offset do drag)
  const bgPosX = s.backgroundOffsetX ?? 50;
  const bgPosY = s.backgroundOffsetY ?? 50;

  // PiP
  const pipSize = s.pipSize || 500;
  const pipRadius = pipSize / 2;
  const pipX = (s.pipX || 720) - pipRadius;
  const pipY = (s.pipY || 900) - pipRadius;
  const pipZoom = s.pipImageZoom || 100;
  const pipOffsetX = s.pipImageOffsetX ?? 50;
  const pipOffsetY = s.pipImageOffsetY ?? 50;

  // Blur layers (progressivo, 12 faixas)
  let blurLayersHTML = "";
  const blurRegionTop = 760;
  const blurRegionHeight = 1040;
  const numLayers = 12;
  const maxBlur = 15;
  for (let i = 0; i < numLayers; i++) {
    const blur = (maxBlur * (i + 1)) / numLayers;
    const startPct = (i / numLayers) * 100;
    const endPct = ((i + 1) / numLayers) * 100;
    // Overlap de 2% para suavizar
    const maskStart = Math.max(0, startPct - 2);
    blurLayersHTML += `
      `;
  }

  return `




  @font-face {
    font-family: "Tusker Grotesk";
    src: url("${s.tuskerFontUrl || ""}") format("opentype");
    font-weight: 600;
    font-style: normal;
  }
  @font-face {
    font-family: "General Sans";
    src: url("${s.generalSansFontUrl || ""}") format("opentype");
    font-weight: 400;
    font-style: normal;
  }
  @font-face {
    font-family: "General Sans";
    src: url("${s.generalSansMediumUrl || ""}") format("opentype");
    font-weight: 500;
    font-style: normal;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { width: 1440px; height: 1800px; overflow: hidden; background: black; }




  
  
  ${s.backgroundImage ? `
  ` : ""}

  
  ${s.pipEnabled && s.pipImage ? `
  
    
  ` : ""}

  
  ${s.pipEnabled && s.foregroundImage ? `
  ` : ""}

  
  
    ${blurLayersHTML}
  

  
  

  
  
    ${s.title ? `
    ${s.title}` : ""}

    ${s.text ? `
    ${s.text}` : ""}

    
  

  
  ${s.logoImage ? `
  ` : ""}

  
  ${s.credit && s.creditVisible ? `
  ${s.credit}` : ""}

  
  ${s.shieldEnabled && s.shieldImage ? `
  
    
  ` : ""}



`;
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Export server running on port ${PORT}`);
});
