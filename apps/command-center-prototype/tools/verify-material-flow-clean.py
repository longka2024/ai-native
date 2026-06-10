from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1400, "height": 900})
    page.goto("http://localhost:3760/workbench-v2.html")
    page.wait_for_load_state("networkidle")
    page.fill("#topic", "zzzz-local-empty-keyword")
    page.click("#findTopics")
    page.wait_for_timeout(1200)
    terminal = page.locator("#terminalLog").inner_text()
    hint = page.locator("#topicHint").inner_text()
    grid = page.locator("#topicGrid").inner_text()
    scripts = page.locator("script").evaluate_all("(nodes) => nodes.map((n) => n.getAttribute('src')).filter(Boolean)")
    print("SCRIPTS=" + "|".join(scripts))
    print("TERMINAL=" + terminal.replace("\n", " | "))
    print("HINT=" + hint)
    print("GRID=" + grid.replace("\n", " | "))
    assert "workbench-step1" not in "|".join(scripts)
    assert "material-flow.js" in "|".join(scripts)
    assert "本地资产库命中 0 条" in terminal
    assert "当前关键词还没有素材" in grid
    assert "立即采集新素材" in grid
    assert "已整理 0 条" not in terminal
    browser.close()
