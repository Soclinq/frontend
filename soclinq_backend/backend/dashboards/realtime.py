from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

channel_layer = get_channel_layer()


broadcast_to_role(
    role="LAW_ENFORCEMENT",
    data={
        "event": "SOS_NEW",
        "feature": {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [sos.location.x, sos.location.y],
            },
            "properties": {
                "id": str(sos.id),
                "hub": str(sos.hub.id),
                "status": sos.status,
            }
        }
    }
)
