import React, { useRef, useState, useEffect } from 'react';
import { ArrowLeft, Camera, X, Image as ImageIcon, RotateCw, Check, ZoomIn, Move } from 'lucide-react';
import { compressImage } from '../services/imageUtils';

export const Card: React.FC<{ children: React.ReactNode; className?: string; onClick?: () => void, style?: React.CSSProperties }> = ({ children, className = '', onClick, style }) => (
  <div onClick={onClick} style={style} className={`glass-panel rounded-2xl p-5 shadow-lg ${onClick ? 'cursor-pointer hover:bg-white/50 dark:hover:bg-white/5 active:scale-[0.99]' : ''} ${className}`}>
    {children}
  </div>
);

export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' }> = ({
  children,
  variant = 'primary',
  className = '',
  ...props
}) => {
  const baseStyle = "w-full py-4 rounded-2xl font-semibold transition-all duration-200 active:scale-95 active-bounce flex items-center justify-center gap-2 text-sm sm:text-base relative overflow-hidden";
  const variants = {
    primary: "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/20 shadow-lg dark:shadow-blue-900/20 shadow-blue-500/10",
    secondary: "bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-white/10 dark:hover:bg-white/20 dark:text-white border border-transparent dark:border-white/10",
    danger: "bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20",
  };

  return (
    <button className={`${baseStyle} ${variants[variant]} ${className}`} {...props}>
      <span className="absolute inset-0 bg-gradient-to-b from-white/25 via-white/5 to-transparent pointer-events-none"></span>
      {children}
    </button>
  );
};

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string }> = ({ label, className = '', ...props }) => {
  const getInputMode = (): 'numeric' | 'decimal' | undefined => {
    if (props.type !== 'number') return undefined;

    const step = props.step;
    if (!step || step === '1') return 'numeric';

    const stepValue = parseFloat(step as string);
    if (!isNaN(stepValue) && stepValue < 1) return 'decimal';

    return 'numeric';
  };

  return (
    <div className="mb-5 animate-enter">
      <label className="block text-sm font-medium text-muted mb-2 tracking-wide">{label}</label>
      <input
        className={`glass-input w-full rounded-xl px-4 py-3.5 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-base ${className}`}
        inputMode={getInputMode()}
        {...props}
      />
    </div>
  );
};

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { label: string, options: {value: string, label: string}[] }> = ({ label, options, className = '', ...props }) => (
  <div className="mb-5 animate-enter">
    <label className="block text-sm font-medium text-muted mb-2 tracking-wide">{label}</label>
    <div className="relative">
      <select 
        className={`glass-input w-full rounded-xl px-4 py-3.5 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-base ${className}`}
        {...props} 
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value} className="bg-gray-100 text-gray-900 dark:bg-gray-900 dark:text-white">{opt.label}</option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-blue-600 dark:text-gray-400">
        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
      </div>
    </div>
  </div>
);

export const Switch: React.FC<{ checked: boolean; onChange: (checked: boolean) => void }> = ({ checked, onChange }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={() => onChange(!checked)}
    className={`${
      checked ? 'bg-green-500' : 'bg-gray-300 dark:bg-white/10'
    } relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 active:scale-95 transition-transform duration-150`}
  >
    <span
      className={`${
        checked ? 'translate-x-6' : 'translate-x-1'
      } inline-block h-5 w-5 transform rounded-full bg-white transition-transform`}
    />
  </button>
);

export const StatusBadge: React.FC<{ status: 'ok' | 'warning' | 'danger' }> = ({ status }) => {
  const styles = {
    ok: 'bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30',
    warning: 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-500/30',
    danger: 'bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30',
  };
  const labels = {
    ok: 'OK',
    warning: 'Pronto',
    danger: 'Vencido',
  };
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-bold border tracking-wide ${styles[status]}`}>
      {labels[status]}
    </span>
  );
};

export const BackButton: React.FC<{ onClick: () => void, title?: string }> = ({ onClick, title }) => (
  <div className="flex items-center gap-4 mb-6">
    <button onClick={onClick} className="p-2.5 rounded-full bg-gray-200 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/20 transition-all active:scale-90 active-bounce">
      <ArrowLeft size={22} className="text-gray-700 dark:text-white" />
    </button>
    {title && <h1 className="text-2xl font-bold animate-enter leading-none">{title}</h1>}
  </div>
);

// --- IMAGE CROPPER COMPONENT ---

const ImageCropper: React.FC<{ 
  imageSrc: string; 
  aspectRatio: number; 
  onCancel: () => void; 
  onSave: (croppedBase64: string) => void; 
}> = ({ imageSrc, aspectRatio, onCancel, onSave }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  
  // Transformation state
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Load image
  useEffect(() => {
    const img = new Image();
    img.src = imageSrc;
    img.onload = () => setImage(img);
  }, [imageSrc]);

  // Draw loop
  useEffect(() => {
    if (!image || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Define canvas size based on window width but keep resolution high
    const screenWidth = Math.min(window.innerWidth - 48, 600); // 48px padding
    canvas.width = 800; // High res internal width
    canvas.height = 800 / aspectRatio;

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Math for drawing
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    ctx.save();
    
    // 1. Move to center
    ctx.translate(centerX, centerY);
    
    // 2. Rotate
    ctx.rotate((rotation * Math.PI) / 180);
    
    // 3. Scale
    ctx.scale(scale, scale);
    
    // 4. Pan (Offset)
    // We divide by scale so dragging feels 1:1 with finger movement
    ctx.translate(offset.x, offset.y);
    
    // 5. Draw Image Centered
    // Calculate draw dimensions to fit aspect ratio initially
    let drawWidth = canvas.width;
    let drawHeight = (canvas.width / image.width) * image.height;
    
    if (drawHeight < canvas.height) {
        drawHeight = canvas.height;
        drawWidth = (canvas.height / image.height) * image.width;
    }

    ctx.drawImage(
        image, 
        -drawWidth / 2, 
        -drawHeight / 2, 
        drawWidth, 
        drawHeight
    );

    ctx.restore();

  }, [image, scale, rotation, offset, aspectRatio]);

  // Touch/Mouse Handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    
    const dx = (e.clientX - dragStart.x) * (800 / (Math.min(window.innerWidth - 48, 600))); // Adjust for canvas css size vs internal size
    const dy = (e.clientY - dragStart.y) * (800 / (Math.min(window.innerWidth - 48, 600)));
    
    // Adjust delta based on rotation to keep drag direction intuitive
    const rad = (-rotation * Math.PI) / 180;
    const rotDx = dx * Math.cos(rad) - dy * Math.sin(rad);
    const rotDy = dx * Math.sin(rad) + dy * Math.cos(rad);

    setOffset(prev => ({ 
        x: prev.x + (rotDx / scale), 
        y: prev.y + (rotDy / scale) 
    }));
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handlePointerUp = () => setIsDragging(false);

  const handleSave = () => {
    if (canvasRef.current) {
        const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.85);
        onSave(dataUrl);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center p-4 animate-in fade-in duration-300">
        <div className="w-full max-w-lg">
            <h3 className="text-white font-bold text-center mb-6 text-lg">Ajustar Imagen</h3>
            
            {/* Canvas Container */}
            <div 
                className="relative overflow-hidden rounded-xl shadow-2xl border border-white/10 bg-zinc-900 touch-none mx-auto"
                style={{
                    width: '100%',
                    maxWidth: '600px',
                    aspectRatio: `${aspectRatio}`
                }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
            >
                <canvas 
                    ref={canvasRef} 
                    className="w-full h-full object-contain pointer-events-none"
                />
                <div className="absolute inset-0 pointer-events-none border-2 border-white/20 rounded-xl"></div>
                
                {/* Drag Hint Overlay (fades out) */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 animate-pulse">
                    <Move className="text-white/50" size={48} />
                </div>
            </div>

            {/* Controls */}
            <div className="mt-8 space-y-6">
                
                <div className="space-y-4">
                    {/* Scale Slider */}
                    <div className="flex items-center gap-4 px-4">
                        <ZoomIn size={20} className="text-gray-400" />
                        <input 
                            type="range" 
                            min="0.5" 
                            max="3" 
                            step="0.05" 
                            value={scale}
                            onChange={(e) => setScale(parseFloat(e.target.value))}
                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                            title="Zoom"
                        />
                    </div>

                    {/* Rotation Slider */}
                    <div className="flex items-center gap-4 px-4">
                        <RotateCw size={20} className="text-gray-400" />
                        <input 
                            type="range" 
                            min="0" 
                            max="360" 
                            step="1" 
                            value={rotation}
                            onChange={(e) => setRotation(parseFloat(e.target.value))}
                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                            title="Rotación"
                        />
                    </div>
                </div>

                {/* Actions Row */}
                <div className="flex items-center justify-center gap-6">
                    <button 
                        onClick={onCancel}
                        className="px-6 py-3 rounded-xl font-bold text-gray-300 hover:text-white transition-colors"
                    >
                        Cancelar
                    </button>

                    <button 
                        onClick={handleSave}
                        className="px-8 py-3 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center gap-2"
                    >
                        <Check size={20} />
                        <span>Guardar</span>
                    </button>
                </div>
            </div>
        </div>
    </div>
  );
};

export const PhotoInput: React.FC<{ 
    value?: string, 
    onChange: (base64: string) => void, 
    onRemove: () => void,
    aspectRatio?: number // Optional: If provided, enables cropping
}> = ({ value, onChange, onRemove, aspectRatio }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    
    // Cropper State
    const [tempImage, setTempImage] = useState<string | null>(null);
    const [showCropper, setShowCropper] = useState(false);
  
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
        setIsProcessing(true);
        try {
          if (aspectRatio) {
              // 1. Read file as base64 but DO NOT compress yet (keep resolution for crop)
              const reader = new FileReader();
              reader.onload = (ev) => {
                  setTempImage(ev.target?.result as string);
                  setShowCropper(true);
                  setIsProcessing(false);
              };
              reader.readAsDataURL(e.target.files[0]);
          } else {
              // 2. Standard flow (Receipts) - Compress immediately
              const compressed = await compressImage(e.target.files[0]);
              onChange(compressed);
              setIsProcessing(false);
          }
        } catch (err) {
          console.error("Image error", err);
          alert("Error al procesar la imagen");
          setIsProcessing(false);
        }
      }
    };

    const handleCropSave = (croppedBase64: string) => {
        onChange(croppedBase64);
        setShowCropper(false);
        setTempImage(null);
    };

    const handleCropCancel = () => {
        setShowCropper(false);
        setTempImage(null);
        // Reset input so change event triggers again for same file
        if (fileInputRef.current) fileInputRef.current.value = '';
    };
  
    return (
      <>
          {showCropper && tempImage && aspectRatio && (
              <ImageCropper 
                  imageSrc={tempImage}
                  aspectRatio={aspectRatio}
                  onCancel={handleCropCancel}
                  onSave={handleCropSave}
              />
          )}

          <div className="mb-5 animate-enter">
            <label className="block text-sm font-medium text-muted mb-2 tracking-wide">
                {aspectRatio ? 'Si deseas puedes subir una foto de tu vehículo para usarla como portada en la pantalla principal.' : 'Comprobante / Foto'}
            </label>
            
            <input 
              type="file" 
              accept="image/*" 
              ref={fileInputRef}
              className="hidden"
              onChange={handleFileChange}
            />
      
            {!value ? (
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className="w-full h-36 border-2 border-dashed border-gray-300 dark:border-white/20 rounded-xl flex flex-col items-center justify-center gap-3 text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors active:scale-[0.98]"
              >
                 {isProcessing ? (
                     <div className="animate-spin h-6 w-6 border-2 border-blue-500 rounded-full border-t-transparent"></div>
                 ) : (
                     <>
                        <Camera size={28} />
                        <span className="text-sm font-medium">Tomar / Subir Foto</span>
                     </>
                 )}
              </button>
            ) : (
              <div className="relative w-full h-56 rounded-xl overflow-hidden group animate-enter border border-gray-200 dark:border-white/10 shadow-sm bg-black">
                <img src={value} alt="Preview" className="w-full h-full object-cover" />
                
                {/* Overlay Actions */}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex gap-4">
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="bg-white/20 backdrop-blur-md p-3 rounded-full text-white hover:bg-white/30 transition-all"
                            title="Cambiar Foto"
                        >
                            <Camera size={24} />
                        </button>
                        <button 
                            type="button" 
                            onClick={() => { if(confirm("¿Eliminar foto?")) onRemove(); }}
                            className="bg-red-500 p-3 rounded-full text-white hover:scale-110 transition-transform shadow-lg"
                            title="Eliminar Foto"
                        >
                            <X size={24} />
                        </button>
                    </div>
                </div>
                
                {/* Saved Badge */}
                <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md text-white text-xs font-medium px-3 py-1 rounded-full border border-white/20 pointer-events-none">
                    Guardada
                </div>
              </div>
            )}
          </div>
      </>
    );
  };