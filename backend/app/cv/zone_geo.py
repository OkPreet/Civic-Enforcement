"""Zone polygon parsing + point-in-polygon checks (Shapely)."""

from typing import List, Optional

from shapely.geometry import Point, Polygon


def parse_polygon(coordinates: Optional[str]) -> Optional[Polygon]:
    """Parse 'lat,lng;lat,lng;...' (WGS84) into a Shapely Polygon."""
    if not coordinates:
        return None
    try:
        points = []
        for pair in coordinates.split(";"):
            pair = pair.strip()
            if not pair:
                continue
            lat, lng = (float(x.strip()) for x in pair.split(","))
            points.append((lng, lat))  # shapely uses (x=lng, y=lat)
        if len(points) < 3:
            return None
        poly = Polygon(points)
        return poly if poly.is_valid and not poly.is_empty else None
    except (ValueError, TypeError):
        return None


def point_in_polygon(lat: float, lng: float, coordinates: Optional[str]) -> bool:
    poly = parse_polygon(coordinates)
    if poly is None:
        return False
    return poly.contains(Point(lng, lat))


def contains(poly: Polygon, lat: float, lng: float) -> bool:
    return poly.contains(Point(lng, lat))
