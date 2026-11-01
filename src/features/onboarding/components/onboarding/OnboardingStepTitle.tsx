
export function Title({ title, text, action }: { title: string; text: string; action?: React.ReactNode }) {
  return (
    <div className="card-heading">
      <div>
        <h2>{title}</h2>
        <p>{text}</p>
      </div>
      {action}
    </div>
  );
}