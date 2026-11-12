import os
import sys
import time
from pathlib import Path
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

BASE_URL = "http://127.0.0.1:5500"
REPO_ROOT = Path(__file__).resolve().parents[1]
EVIDENCE_DIR = REPO_ROOT / "docs" / "evidence" / "t3-tv4-rc1"
EVIDENCE_DIR.mkdir(parents=True, exist_ok=True)

print(f"Evidence directory: {EVIDENCE_DIR}")

options = Options()
options.add_argument("--headless=new")
options.add_argument("--no-sandbox")
options.add_argument("--disable-dev-shm-usage")
options.add_argument("--disable-gpu")
options.add_argument("--force-device-scale-factor=1")

driver = webdriver.Chrome(options=options)
driver.set_page_load_timeout(30)

results = []

def record(test_name, expected, actual, passed):
    status = "PASS" if passed else "FAIL"
    print(f"[{status}] {test_name}: {actual}")
    results.append({
        "name": test_name,
        "expected": expected,
        "actual": actual,
        "status": status
    })

try:
    # -------------------------------------------------------------
    # 1. HOME DESKTOP (1366x800)
    # -------------------------------------------------------------
    driver.execute_cdp_cmd("Emulation.clearDeviceMetricsOverride", {})
    driver.set_window_size(1366, 800)
    driver.get(f"{BASE_URL}/index.html")
    driver.execute_script("window.localStorage.clear();")
    driver.refresh()

    WebDriverWait(driver, 15).until(
        lambda d: len(d.find_elements(By.CSS_SELECTOR, "#page-content .row, #page-content ol, #page-content li, .state")) > 0
    )
    time.sleep(1.5)

    scroll_w = driver.execute_script("return document.documentElement.scrollWidth")
    client_w = driver.execute_script("return document.documentElement.clientWidth")
    no_overflow = scroll_w <= client_w
    record("Home Desktop no overflow", "scrollWidth <= clientWidth", f"scrollWidth={scroll_w}, clientWidth={client_w}", no_overflow)

    source_text = driver.find_element(By.ID, "hero-source").text.strip()
    has_source = "CCFDDL" in source_text or "Nguồn dữ liệu" in source_text
    record("Home Data source notice", "Shows CCFDDL source notice", f"Source text: '{source_text}'", has_source)

    search_input = driver.find_element(By.CSS_SELECTOR, "form.hero__search input[name='q']")
    has_search = search_input is not None
    record("Home Desktop search input", "Input name='q' visible", f"Present={has_search}", has_search)

    home_shot = EVIDENCE_DIR / "home-desktop.png"
    driver.save_screenshot(str(home_shot))
    print(f"Saved: {home_shot}")

    # Test Search Flow: Type CVPR and submit form
    search_input.clear()
    search_input.send_keys("CVPR")
    search_input.send_keys(Keys.ENTER)

    WebDriverWait(driver, 10).until(lambda d: "conferences.html" in d.current_url and "q=CVPR" in d.current_url)
    WebDriverWait(driver, 15).until(
        lambda d: len(d.find_elements(By.CSS_SELECTOR, ".edition-card, .edition-grid, .state")) > 0
    )
    time.sleep(1)
    current_url = driver.current_url
    url_ok = "conferences.html?q=CVPR" in current_url
    cards = driver.find_elements(By.CSS_SELECTOR, ".edition-card")
    record("Home to Explore search redirect", "URL contains conferences.html?q=CVPR and renders cards", f"URL: {current_url}, Cards: {len(cards)}", url_ok and len(cards) > 0)

    explore_shot = EVIDENCE_DIR / "explore-search.png"
    driver.save_screenshot(str(explore_shot))
    print(f"Saved: {explore_shot}")

    # -------------------------------------------------------------
    # 2. DETAIL PAGE & CALENDAR / SAVED ACTIONS (1366x800)
    # -------------------------------------------------------------
    # Click CVPR 2027 card specifically
    cvpr27_links = driver.find_elements(By.CSS_SELECTOR, "a[href*='id=cvpr27']")
    if cvpr27_links:
        cvpr27_links[0].click()
    else:
        driver.get(f"{BASE_URL}/conference.html?id=cvpr27")

    WebDriverWait(driver, 10).until(
        lambda d: "conference.html" in d.current_url and "id=cvpr27" in d.current_url and
                  len(d.find_elements(By.CSS_SELECTOR, "h1, .detail-title")) > 0 and
                  d.find_element(By.ID, "page-content").text.strip() != ""
    )
    time.sleep(1)

    # Find Save Button
    save_btns = driver.find_elements(By.CSS_SELECTOR, "button[data-action='save']")
    if not save_btns:
        save_btns = driver.find_elements(By.XPATH, "//button[contains(., 'Lưu hội nghị') or contains(., 'Đã lưu')]")
    has_save_btn = len(save_btns) > 0
    record("Detail Save button present", "Save button exists on detail page", f"Found {len(save_btns)} button(s)", has_save_btn)

    if has_save_btn:
        save_btn = save_btns[0]
        save_btn.click()
        time.sleep(0.5)

        after_text = save_btn.text.strip()
        aria_pressed = save_btn.get_attribute("aria-pressed")
        toasts = driver.find_elements(By.CSS_SELECTOR, ".detail-toast")
        toast_text = toasts[0].text.strip() if toasts else ""

        saved_ok = "Đã lưu" in after_text and aria_pressed == "true"
        record("Detail Save button toggle", "Text becomes 'Đã lưu' and aria-pressed=true", f"Text='{after_text}', aria-pressed={aria_pressed}, Toast='{toast_text}'", saved_ok)

    # Attach spies for window.open and URL.createObjectURL to verify actual button clicks
    driver.execute_script("""
        window.__openedUrls = [];
        window.open = function(url) {
            window.__openedUrls.push(url);
            return null;
        };
        window.__capturedBlob = null;
        const origCreate = URL.createObjectURL;
        URL.createObjectURL = function(blob) {
            window.__capturedBlob = blob;
            return 'blob:mock-url';
        };
    """)

    gcal_btns = driver.find_elements(By.XPATH, "//button[contains(., 'Google Calendar')]")
    ics_btns = driver.find_elements(By.XPATH, "//button[contains(., '.ics') or contains(., 'ICS')]")
    has_gcal = len(gcal_btns) > 0
    has_ics = len(ics_btns) > 0

    if has_gcal:
        gcal_btns[0].click()
        time.sleep(0.5)
        opened = driver.execute_script("return window.__openedUrls")
        gcal_click_ok = len(opened) > 0 and "calendar.google.com/calendar/render" in opened[0]
        record("Detail Google Calendar button click", "window.open with Google Calendar URL", f"Opened URL: {opened}", gcal_click_ok)

    if has_ics:
        ics_btns[0].click()
        time.sleep(0.5)
        blob_text = driver.execute_async_script("""
            const callback = arguments[arguments.length - 1];
            if (!window.__capturedBlob) {
                callback(null);
            } else {
                window.__capturedBlob.text().then(callback).catch(err => callback(null));
            }
        """)
        ics_click_ok = bool(blob_text and blob_text.startswith("BEGIN:VCALENDAR") and blob_text.endswith("END:VCALENDAR\r\n"))
        record("Detail ICS export button click", "Blob created with valid VCALENDAR CRLF", f"ICS starts with BEGIN:VCALENDAR: {bool(blob_text and blob_text.startswith('BEGIN:VCALENDAR'))}", ics_click_ok)

    detail_shot = EVIDENCE_DIR / "detail-calendar.png"
    driver.save_screenshot(str(detail_shot))
    print(f"Saved: {detail_shot}")

    # Test TBA / Non-exportable milestone handling on cec2025
    driver.get(f"{BASE_URL}/conference.html?id=cec2025")
    WebDriverWait(driver, 10).until(
        lambda d: len(d.find_elements(By.CSS_SELECTOR, "h1, .detail-title")) > 0 and
                  d.find_element(By.ID, "page-content").text.strip() != ""
    )
    time.sleep(1)

    tba_gcal_btns = driver.find_elements(By.XPATH, "//button[contains(., 'Google Calendar')]")
    tba_ics_btns = driver.find_elements(By.XPATH, "//button[contains(., '.ics') or contains(., 'ICS')]")
    tba_gcal_disabled = tba_gcal_btns and (tba_gcal_btns[0].get_attribute("disabled") is not None or tba_gcal_btns[0].get_attribute("aria-disabled") == "true")
    tba_ics_disabled = tba_ics_btns and (tba_ics_btns[0].get_attribute("disabled") is not None or tba_ics_btns[0].get_attribute("aria-disabled") == "true")
    tba_disabled_ok = bool(tba_gcal_disabled and tba_ics_disabled)
    record("TBA/Non-exportable deadline disabled buttons", "GCal and ICS buttons disabled on TBA edition (cec2025)", f"GCal disabled={tba_gcal_disabled}, ICS disabled={tba_ics_disabled}", tba_disabled_ok)

    tba_shot = EVIDENCE_DIR / "detail-calendar-disabled-tba.png"
    driver.save_screenshot(str(tba_shot))
    print(f"Saved: {tba_shot}")

    # -------------------------------------------------------------
    # 3. SAVED PAGE DESKTOP (1366x800)
    # -------------------------------------------------------------
    driver.get(f"{BASE_URL}/saved.html")
    WebDriverWait(driver, 10).until(
        lambda d: len(d.find_elements(By.CSS_SELECTOR, ".saved-card, .saved-summary")) > 0
    )
    time.sleep(1)

    summary_el = driver.find_element(By.CSS_SELECTOR, ".saved-summary")
    summary_text = summary_el.text.strip()
    saved_cards = driver.find_elements(By.CSS_SELECTOR, ".saved-card")
    saved_list_ok = "1 hội nghị đã lưu" in summary_text and len(saved_cards) == 1
    record("Saved page displays saved item", "Shows '1 hội nghị đã lưu' and 1 card", f"Summary: '{summary_text}', Cards: {len(saved_cards)}", saved_list_ok)

    saved_desktop_shot = EVIDENCE_DIR / "saved-desktop.png"
    driver.save_screenshot(str(saved_desktop_shot))
    print(f"Saved: {saved_desktop_shot}")

    # -------------------------------------------------------------
    # 4. SAVED PAGE MOBILE (360x800 via CDP Emulation)
    # -------------------------------------------------------------
    driver.execute_cdp_cmd("Emulation.setDeviceMetricsOverride", {
        "width": 360,
        "height": 800,
        "deviceScaleFactor": 1,
        "mobile": True
    })
    time.sleep(0.5)

    scroll_w = driver.execute_script("return document.documentElement.scrollWidth")
    client_w = driver.execute_script("return document.documentElement.clientWidth")
    no_overflow_saved_m = scroll_w <= client_w
    record("Saved Mobile 360px no overflow", "scrollWidth <= clientWidth", f"scrollWidth={scroll_w}, clientWidth={client_w}", no_overflow_saved_m)

    saved_mobile_shot = EVIDENCE_DIR / "saved-mobile.png"
    driver.save_screenshot(str(saved_mobile_shot))
    print(f"Saved: {saved_mobile_shot}")

    # -------------------------------------------------------------
    # 5. ABOUT PAGE MOBILE (360x800 via CDP Emulation)
    # -------------------------------------------------------------
    driver.get(f"{BASE_URL}/about.html")
    WebDriverWait(driver, 10).until(
        lambda d: len(d.find_elements(By.CSS_SELECTOR, "h1, main")) > 0
    )
    time.sleep(1)

    scroll_w = driver.execute_script("return document.documentElement.scrollWidth")
    client_w = driver.execute_script("return document.documentElement.clientWidth")
    no_overflow_about_m = scroll_w <= client_w
    record("About Mobile 360px no overflow", "scrollWidth <= clientWidth", f"scrollWidth={scroll_w}, clientWidth={client_w}", no_overflow_about_m)

    about_mobile_shot = EVIDENCE_DIR / "about-mobile.png"
    driver.save_screenshot(str(about_mobile_shot))
    print(f"Saved: {about_mobile_shot}")

    # -------------------------------------------------------------
    # 6. MOBILE NAVIGATION & A11Y (360x800 via CDP Emulation)
    # -------------------------------------------------------------
    menu_btns = driver.find_elements(By.CSS_SELECTOR, "button.menu-toggle")
    if menu_btns:
        menu_btn = menu_btns[0]
        menu_btn.click()
        time.sleep(0.5)
        is_open = menu_btn.get_attribute("aria-expanded") == "true"
        record("Mobile menu toggle open", "aria-expanded='true'", f"aria-expanded={menu_btn.get_attribute('aria-expanded')}", is_open)

        menu_shot = EVIDENCE_DIR / "home-mobile-menu.png"
        driver.save_screenshot(str(menu_shot))
        print(f"Saved: {menu_shot}")

        webdriver.ActionChains(driver).send_keys(Keys.ESCAPE).perform()
        time.sleep(0.5)
        is_closed = menu_btn.get_attribute("aria-expanded") == "false"
        record("Mobile menu escape close", "aria-expanded='false'", f"aria-expanded={menu_btn.get_attribute('aria-expanded')}", is_closed)

    # -------------------------------------------------------------
    # 7. SAVED PAGE UN-SAVE / EMPTY STATE (360x800 via CDP Emulation)
    # -------------------------------------------------------------
    driver.get(f"{BASE_URL}/saved.html")
    WebDriverWait(driver, 10).until(
        lambda d: len(d.find_elements(By.CSS_SELECTOR, ".saved-card, .saved-summary")) > 0
    )
    time.sleep(0.5)

    remove_btns = driver.find_elements(By.XPATH, "//button[contains(., 'Bỏ lưu')]")
    if remove_btns:
        remove_btns[0].click()
        time.sleep(0.5)

        summary_el = driver.find_element(By.CSS_SELECTOR, ".saved-summary")
        summary_text = summary_el.text.strip()
        empty_states = driver.find_elements(By.XPATH, "//*[contains(., 'Chưa có hội nghị đã lưu')]")
        unsave_ok = "0 hội nghị đã lưu" in summary_text and len(empty_states) > 0
        record("Saved page un-save empty state", "Shows '0 hội nghị đã lưu' and empty state message", f"Summary: '{summary_text}', Empty found: {len(empty_states) > 0}", unsave_ok)

        saved_empty_shot = EVIDENCE_DIR / "saved-empty-mobile.png"
        driver.save_screenshot(str(saved_empty_shot))
        print(f"Saved: {saved_empty_shot}")

    print("\n--- ALL TESTS COMPLETED ---")
    all_passed = all(r["status"] == "PASS" for r in results)
    print(f"Final Outcome: {'ALL PASS' if all_passed else 'SOME FAILED'}")

    for r in results:
        print(f"- {r['status']}: {r['name']} => {r['actual']}")

except Exception as ex:
    print(f"ERROR OCCURRED: {ex}", file=sys.stderr)
    import traceback
    traceback.print_exc()

finally:
    driver.quit()
