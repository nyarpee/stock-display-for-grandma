from translations import FINANCIAL_LABELS


def jp(key):
    return FINANCIAL_LABELS.get(key, key)


def safe_dict(data):
    if data is None:
        return {}

    try:
        data = data.fillna("")
        result = {}

        for date in data.columns:
            date_str = str(date)
            result[date_str] = {}

            for row in data.index:
                result[date_str][jp(str(row))] = data.loc[row, date]

        return result
    except Exception:
        return {}


def safe_series(data):
    if data is None:
        return {}

    try:
        data.index = data.index.astype(str)
        return data.to_dict()
    except Exception:
        return {}


def safe_number(value):
    try:
        if value is None:
            return None

        return float(value)
    except Exception:
        return None


def safe_get(obj, key):
    try:
        return obj.get(key)
    except Exception:
        try:
            return obj[key]
        except Exception:
            return None
