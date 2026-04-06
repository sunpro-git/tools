interface ImageModalProps {
  src: string;
  alt: string;
  onClose: () => void;
}

export function ImageModal({ src, alt, onClose }: ImageModalProps) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center cursor-pointer"
      style={{ background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <img
        src={src}
        alt={alt}
        className="max-w-[90vw] max-h-[85vh] object-contain rounded-2xl"
        style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}
        onClick={(e) => e.stopPropagation()}
      />
      <button
        onClick={onClose}
        className="absolute top-6 right-6 w-10 h-10 rounded-full flex items-center justify-center text-white text-xl font-bold cursor-pointer"
        style={{ background: 'rgba(0,0,0,0.5)' }}
      >
        ✕
      </button>
    </div>
  );
}
