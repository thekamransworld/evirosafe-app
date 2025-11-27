
import React, { useState, useRef, useEffect } from 'react';
import { Button } from './Button';

interface SignaturePadModalProps {
  onClose: () => void;
  onSave: (dataUrl: string) => void;
  personName: string;
}

export const SignaturePadModal: React.FC<SignaturePadModalProps> = ({ onClose, onSave, personName }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set canvas size for high-res displays
        const scale = window.devicePixelRatio;
        canvas.width = canvas.offsetWidth * scale;
        canvas.height = canvas.offsetHeight * scale;
        ctx.scale(scale, scale);

        ctx.strokeStyle = '#1e293b'; // text-primary
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
    }, []);

    const getCoords = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        if ('touches' in event.nativeEvent) {
             return {
                x: event.nativeEvent.touches[0].clientX - rect.left,
                y: event.nativeEvent.touches[0].clientY - rect.top
            };
        }
        return {
            x: event.nativeEvent.offsetX,
            y: event.nativeEvent.offsetY
        };
    }

    const startDrawing = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        const { x, y } = getCoords(event);
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;
        ctx.beginPath();
        ctx.moveTo(x, y);
        setIsDrawing(true);
    };

    const draw = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;
        const { x, y } = getCoords(event);
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;
        ctx.lineTo(x, y);
        ctx.stroke();
    };

    const stopDrawing = () => {
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;
        ctx.closePath();
        setIsDrawing(false);
    };

    const clear = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    const handleSave = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        // Check if canvas is empty
        const context = canvas.getContext('2d');
        if(!context) return;
        const pixelBuffer = new Uint32Array(context.getImageData(0, 0, canvas.width, canvas.height).data.buffer);
        const isEmpty = !pixelBuffer.some(color => color !== 0);

        if(isEmpty) {
            alert("Please provide a signature before saving.");
            return;
        }

        const dataUrl = canvas.toDataURL('image/png');
        onSave(dataUrl);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-dark-card rounded-lg shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b dark:border-dark-border">
                    <h3 className="text-lg font-bold">Signing for {personName}</h3>
                    <p className="text-sm text-text-secondary dark:text-dark-text-secondary">Please sign in the box below.</p>
                </div>
                <div className="p-4">
                    <canvas
                        ref={canvasRef}
                        className="border bg-gray-50 dark:bg-dark-background dark:border-dark-border rounded-md cursor-crosshair w-full h-48"
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={startDrawing}
                        onTouchMove={draw}
                        onTouchEnd={stopDrawing}
                    />
                </div>
                <div className="bg-gray-50 dark:bg-dark-background px-4 py-3 flex justify-between items-center border-t dark:border-dark-border">
                    <Button variant="secondary" size="sm" onClick={clear}>Clear</Button>
                    <div className="space-x-2">
                        <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
                        <Button size="sm" onClick={handleSave}>Save Signature</Button>
                    </div>
                </div>
            </div>
        </div>
    );
};
