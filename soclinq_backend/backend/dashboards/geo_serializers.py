def point_to_geojson(lat, lng, properties=None):
    """
    Convert latitude & longitude to GeoJSON Point
    """
    return {
        "type": "Feature",
        "geometry": {
            "type": "Point",
            "coordinates": [lng, lat],
        },
        "properties": properties or {},
    }
