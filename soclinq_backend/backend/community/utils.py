# community.utils
import requests

NOMINATIM_URL = "https://nominatim.openstreetmap.org/reverse"

def reverse_geocode(lat: float, lng: float):
    params = {
        "lat": lat,
        "lon": lng,
        "format": "json",
        "zoom": 10,
        "addressdetails": 1,
    }

    headers = {
        "User-Agent": "soclinq/1.0 (contact@yourdomain.com)"
    }

    res = requests.get(NOMINATIM_URL, params=params, headers=headers, timeout=10)
    res.raise_for_status()

    return res.json()


# community/utils/iso.py

ISO2_TO_ISO3 = {
    "NG": "NGA",
    "US": "USA",
    "GB": "GBR",
    "IN": "IND",
}

def iso2_to_iso3(code: str) -> str:
    code = code.upper()
    if code not in ISO2_TO_ISO3:
        raise ValueError(f"Unsupported country code: {code}")
    return ISO2_TO_ISO3[code]

