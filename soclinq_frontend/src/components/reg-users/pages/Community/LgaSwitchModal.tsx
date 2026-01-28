interface Props {
    lgas: { id: string; name: string }[];
    activeLgaId?: string;
    onSelect: (lga: { id: string; name: string }) => void;
    onClose: () => void;
  }
  
  export default function LgaSwitchModal({
    lgas,
    activeLgaId,
    onSelect,
    onClose,
  }: Props) {
    return (
      <div className="modal">
        <h3>Select another LGA</h3>
  
        {lgas.map((lga) => (
          <div
            key={lga.id}
            onClick={() => onSelect(lga)}
            style={{
              padding: 8,
              cursor: "pointer",
              fontWeight:
                lga.id === activeLgaId ? "bold" : "normal",
            }}
          >
            {lga.name}
          </div>
        ))}
  
        <button onClick={onClose}>Close</button>
      </div>
    );
  }
  