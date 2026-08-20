from sqlalchemy.orm import Session

from .events import hub
from .models import Notification


def notify(
    db: Session,
    user_id: int,
    title: str,
    body: str,
    ntype: str = "report",
    ref_id: str = None,
) -> Notification:
    n = Notification(user_id=user_id, title=title, body=body, ntype=ntype, ref_id=ref_id)
    db.add(n)
    db.flush()
    # Live ping (no body — clients refetch their own notifications via REST)
    hub.publish("violations", "notification", {"user_id": user_id, "ntype": ntype, "ref_id": ref_id})
    return n
