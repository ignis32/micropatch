import requests
import os
import json
import re
import time

API_URL = "https://microrack.org/api/products/"
MOD_URL = "https://microrack.org/api/products/{slug}?populate=*"
BASE_URL = "https://microrack.org"
OUTDIR = "microrack_modules"

def safe_name(name):
    return re.sub(r"[^a-zA-Z0-9_\-]", "_", name)

def download_image(img_url, out_path):
    try:
        r = requests.get(img_url, timeout=15)
        r.raise_for_status()
        with open(out_path, "wb") as f:
            f.write(r.content)
        print(f"  ✔ {os.path.basename(out_path)} скачан")
    except Exception as e:
        print(f"  ⚠ Не удалось скачать {img_url}: {e}")

def main():
    os.makedirs(OUTDIR, exist_ok=True)
    print("Загружаю список модулей...")
    resp = requests.get(API_URL)
    data = resp.json()

    for mod in data['data']:
        attr = mod['attributes']
        slug = attr.get('slug') or safe_name(attr.get('name', 'mod'))
        folder = os.path.join(OUTDIR, slug)
        os.makedirs(folder, exist_ok=True)

        # meta.json
        meta_path = os.path.join(folder, "meta.json")
        with open(meta_path, "w", encoding="utf-8") as f:
            json.dump(attr, f, ensure_ascii=False, indent=2)

        # Детальный запрос для картинок
        detail_url = MOD_URL.format(slug=slug)
        detail_resp = requests.get(detail_url)
        detail = detail_resp.json()
        img_formats = {}
        try:
            images = detail["data"]["attributes"]["images"]["data"]
            if images:
                img_attr = images[0]["attributes"]
                formats = img_attr.get("formats", {})
                # Оригинал
                img_formats["panel.png"] = BASE_URL + img_attr["url"]
                # Версии (если есть)
                if "large" in formats:
                    img_formats["panel_large.png"] = BASE_URL + formats["large"]["url"]
                if "medium" in formats:
                    img_formats["panel_medium.png"] = BASE_URL + formats["medium"]["url"]
                if "small" in formats:
                    img_formats["panel_small.png"] = BASE_URL + formats["small"]["url"]
                if "thumbnail" in formats:
                    img_formats["panel_thumb.png"] = BASE_URL + formats["thumbnail"]["url"]
        except Exception as e:
            print(f"  ⚠ Нет картинок для {slug}: {e}")

        # Скачивание всех форматов
        for fname, url in img_formats.items():
            out_path = os.path.join(folder, fname)
            if not os.path.exists(out_path):
                download_image(url, out_path)
                time.sleep(0.7)  # пауза чтобы не душить сервер

        print(f"Модуль: {slug} -> {folder}")

if __name__ == "__main__":
    main()
