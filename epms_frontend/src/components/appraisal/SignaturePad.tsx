import { useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Eraser, PenLine } from "lucide-react";

// Fix for Vite ESM/CJS interop issue with react-signature-canvas
const SignatureCanvasComponent = (SignatureCanvas as any).default || SignatureCanvas;

interface SignaturePadProps {
  /** Called when the user confirms — receives a PNG File ready to upload. */
  onSave: (file: File) => Promise<void> | void;
  /** Optional label shown on the confirm button. */
  saveLabel?: string;
  /** Disable the confirm button (e.g. while the parent's mutation is in flight). */
  isSaving?: boolean;
  /** Height of the drawing area; matches the existing 120px sign-off card. */
  height?: number;
}

const SignaturePad: React.FC<SignaturePadProps> = ({
  onSave,
  saveLabel = "I Acknowledge & Sign",
  isSaving = false,
  height = 120,
}) => {
  const ref = useRef<SignatureCanvas>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  const handleClear = () => {
    ref.current?.clear();
    setIsEmpty(true);
  };

  const handleSave = async () => {
    if (!ref.current || ref.current.isEmpty()) return;

    // Trim whitespace around the strokes, then export PNG.
    const dataUrl = ref.current.getTrimmedCanvas().toDataURL("image/png");
    const blob = await (await fetch(dataUrl)).blob();
    const file = new File([blob], "signature.png", { type: "image/png" });

    await onSave(file);
    handleClear();
  };

  return (
    <div className="w-full">
      <div
        style={{
          height,
          background: "#FFFFFF",
          border: "0.5px dashed #E0E2E8",
          borderRadius: 10,
          overflow: "hidden",
          touchAction: "none", // critical for mobile drawing
        }}
      >
        <SignatureCanvasComponent
          ref={ref}
          penColor="#111827"
          backgroundColor="rgba(255,255,255,0)"
          canvasProps={{
            style: { width: "100%", height: "100%", display: "block" },
          }}
          onEnd={() => setIsEmpty(ref.current?.isEmpty() ?? true)}
        />
      </div>

      <div className="flex gap-2 mt-2">
        <button
          type="button"
          onClick={handleClear}
          disabled={isEmpty || isSaving}
          className="inline-flex items-center gap-1 disabled:opacity-50"
          style={{
            background: "#F5F6F8",
            color: "#5A6070",
            border: "0.5px solid #E4E6EC",
            borderRadius: 8,
            padding: "6px 10px",
            fontSize: 12,
            fontWeight: 500,
          }}
        >
          <Eraser size={12} /> Clear
        </button>

        <button
          type="button"
          onClick={handleSave}
          disabled={isEmpty || isSaving}
          className="flex-1 inline-flex items-center justify-center gap-1 disabled:opacity-50"
          style={{
            background: "#1A56DB",
            color: "#FFFFFF",
            border: "none",
            borderRadius: 8,
            padding: "8px",
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          <PenLine size={12} /> {isSaving ? "Uploading…" : saveLabel}
        </button>
      </div>
    </div>
  );
};

export default SignaturePad;
