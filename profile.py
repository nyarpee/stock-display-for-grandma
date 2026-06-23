import re
import requests
from bs4 import BeautifulSoup


def extract_bracket_section(lines, title):
    marker = f"【{title}】"

    for i, line in enumerate(lines):
        if line == marker:
            if i + 1 < len(lines):
                return lines[i + 1]

    return None


def extract_label_value(lines, label):
    for i, line in enumerate(lines):
        if line == label and i + 1 < len(lines):
            return lines[i + 1]

        if line.startswith(label) and line != label:
            return line.replace(label, "").strip()

    return None


def get_company_profile(code):
    url = f"https://finance.yahoo.co.jp/quote/{code}.T/profile"

    headers = {
        "User-Agent": "Mozilla/5.0"
    }

    response = requests.get(url, headers=headers, timeout=10)
    response.raise_for_status()

    soup = BeautifulSoup(response.text, "lxml")
    text = soup.get_text("\n", strip=True)
    lines = [line.strip() for line in text.splitlines() if line.strip()]



    return {
        "特色": extract_bracket_section(lines, "特色"),
        "連結事業": extract_bracket_section(lines, "連結事業"),
        "本社所在地": extract_label_value(lines, "本社所在地"),
        "業種分類": extract_label_value(lines, "業種分類"),
        "英文社名": extract_label_value(lines, "英文社名"),
        "代表者名": extract_label_value(lines, "代表者名"),
        "設立年月日": extract_label_value(lines, "設立年月日"),
        "市場名": extract_label_value(lines, "市場名"),
        "上場年月日": extract_label_value(lines, "上場年月日"),
        "決算": extract_label_value(lines, "決算"),
        "単元株数": extract_label_value(lines, "単元株数"),
        "従業員数（単独）": extract_label_value(lines, "従業員数（単独）"),
        "従業員数（連結）": extract_label_value(lines, "従業員数（連結）"),
        "平均年齢": extract_label_value(lines, "平均年齢"),
        "平均年収": extract_label_value(lines, "平均年収"),
    }