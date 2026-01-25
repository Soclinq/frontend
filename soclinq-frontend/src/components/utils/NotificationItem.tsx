import { useEffect, useState } from "react";
import { Notification } from "./NotificationContext";
import {
    FaCheckCircle,
    FaTimesCircle,
    FaExclamationTriangle,
    FaInfoCircle,
    FaSpinner,
  } from "react-icons/fa";
  
interface Props {
  n: Notification;
  onClose: () => void;
}

const typeIconMap = {
    success: <FaCheckCircle />,
    error: <FaTimesCircle />,
    warning: <FaExclamationTriangle />,
    info: <FaInfoCircle />,
    loading: <FaSpinner className="spin" />,
  };
  

  export default function NotificationItem({ n, onClose }: Props) {
    const [progress, setProgress] = useState(100);
    const [closing, setClosing] = useState(false);
    const [hovered, setHovered] = useState(false);
    const [startX, setStartX] = useState<number | null>(null);
    const [deltaX, setDeltaX] = useState(0);

  
    useEffect(() => {
        if (!n.duration || hovered) return;
    
        const start = Date.now();
        const interval = setInterval(() => {
          const elapsed = Date.now() - start;
          const pct = Math.max(0, 100 - (elapsed / n.duration!) * 100);
    
          setProgress(pct);
    
          if (pct <= 0) {
            triggerClose();
          }
        }, 30);
    
        return () => clearInterval(interval);
      }, [n.duration, hovered]);
  
    const triggerClose = () => {
      setClosing(true);
      setTimeout(onClose, 280); // match animation
    };

    const handleStart = (x: number) => {
        setStartX(x);
      };
      
      const handleMove = (x: number) => {
        if (startX === null) return;
        setDeltaX(x - startX);
      };
      
      const handleEnd = () => {
        if (Math.abs(deltaX) > 120) {
          triggerClose();
        } else {
          setDeltaX(0);
        }
        setStartX(null);
      };
      
  
    return (
            <div
            className={`notification ${n.type} ${closing ? "slide-out" : ""}`}
            style={{ transform: `translateX(${deltaX}px)` }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onMouseDown={(e) => handleStart(e.clientX)}
            onMouseMove={(e) => handleMove(e.clientX)}
            onMouseUp={handleEnd}
            onTouchStart={(e) => handleStart(e.touches[0].clientX)}
            onTouchMove={(e) => handleMove(e.touches[0].clientX)}
            onTouchEnd={handleEnd}
            >
     
            <div className="notification-body">
          <div className="notification-header">
            <span className={`notification-icon ${n.type}`}>
              {typeIconMap[n.type]}
            </span>
  
            {n.title && <strong>{n.title}</strong>}
  
            {!n.duration && (
              <button className="close-btn" onClick={triggerClose}>
                ✕
              </button>
            )}
          </div>
  
          <p>{n.message}</p>
  
          {n.confirm && (
            <button
              className="confirm-btn"
              onClick={() => {
                n.confirm.onConfirm();
                triggerClose();
              }}
            >
              {n.confirm.label || "Confirm"}
            </button>
          )}
        </div>
  
        {n.duration && (
          <div className="progress-bar" style={{ width: `${progress}%` }} />
        )}
      </div>
    );
  }
  
