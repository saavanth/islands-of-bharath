import pandas as pd
import time
import requests

INPUT_CSV = 'complete_all_states_islands_geocoded.csv'
OUTPUT_CSV = 'complete_all_states_islands_geocoded.csv'  # Overwrite in place
USER_AGENT = 'islands-bharath-geocoder/1.0 (your_email@example.com)'

def geocode_location(name, region=None):
    base_url = 'https://nominatim.openstreetmap.org/search'
    query = name
    if region:
        query += f', {region}, India'
    else:
        query += ', India'
    params = {'q': query, 'format': 'json', 'limit': 1}
    headers = {'User-Agent': USER_AGENT}
    try:
        resp = requests.get(base_url, params=params, headers=headers, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        if data:
            return float(data[0]['lat']), float(data[0]['lon'])
    except Exception as e:
        print(f'Error geocoding {name}: {e}')
    return None, None

df = pd.read_csv(INPUT_CSV)

missing = df[df['Latitude'].isna() | df['Longitude'].isna()]
print(f'Total islands to geocode: {len(missing)}')

for idx, row in missing.iterrows():
    name = row['Island Name']
    region = row.get('Group/Region', None)
    print(f'Geocoding: {name} ({region})...')
    lat, lon = geocode_location(name, region)
    if lat is not None and lon is not None:
        df.at[idx, 'Latitude'] = lat
        df.at[idx, 'Longitude'] = lon
        print(f'  -> Success: {lat}, {lon}')
    else:
        print('  -> Failed to geocode')
    time.sleep(1)

df.to_csv(OUTPUT_CSV, index=False)
print(f'Geocoding complete! Updated {OUTPUT_CSV}') 