type MetricTileProps = { 
    label: string;
    value: string
}

export function MetricTile({ label, value}: MetricTileProps) {
      return (
    <div>
      <div style={{ fontSize: "0.8rem", opacity: 0.7 }}>{label}</div>
      <div style={{ fontSize: "1.4rem", fontWeight: 600 }}>{value}</div>
    </div>
  );
}