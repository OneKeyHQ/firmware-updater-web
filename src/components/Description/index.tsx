export default function Description({
  text,
  value,
}: {
  text: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between text-sm text-gray-800 py-1">
      <span>{text}:</span>
      <span>{value}</span>
    </div>
  );
}
