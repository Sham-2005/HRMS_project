from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import models
from app.schemas import schemas
from app.api import deps

router = APIRouter()

@router.get("", response_model=List[schemas.NotificationResponse])
def read_my_notifications(
    skip: int = 0,
    limit: int = 50,
    current_employee: models.Employee = Depends(deps.get_current_employee),
    db: Session = Depends(get_db)
):
    notifications = db.query(models.Notification).filter(
        models.Notification.employee_id == current_employee.id
    ).order_by(models.Notification.created_at.desc()).offset(skip).limit(limit).all()
    return notifications

@router.get("/unread-count")
def read_unread_count(
    current_employee: models.Employee = Depends(deps.get_current_employee),
    db: Session = Depends(get_db)
):
    count = db.query(models.Notification).filter(
        models.Notification.employee_id == current_employee.id,
        models.Notification.is_read == False
    ).count()
    return {"unread_count": count}

@router.put("/{id}/read", response_model=schemas.NotificationResponse)
def mark_notification_as_read(
    id: int,
    current_employee: models.Employee = Depends(deps.get_current_employee),
    db: Session = Depends(get_db)
):
    notification = db.query(models.Notification).filter(
        models.Notification.id == id,
        models.Notification.employee_id == current_employee.id
    ).first()
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
        
    notification.is_read = True
    db.commit()
    db.refresh(notification)
    return notification

@router.put("/read-all")
def mark_all_notifications_as_read(
    current_employee: models.Employee = Depends(deps.get_current_employee),
    db: Session = Depends(get_db)
):
    db.query(models.Notification).filter(
        models.Notification.employee_id == current_employee.id,
        models.Notification.is_read == False
    ).update({"is_read": True}, synchronize_session=False)
    db.commit()
    return {"detail": "All notifications marked as read"}
